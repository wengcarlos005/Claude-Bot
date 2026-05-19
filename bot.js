/**
 * Claude Trading Bot — ML Expert System (BitGet USDT-M Futures)
 *
 * Strategy : multi-timeframe (1m + 5m + 15m + 1H) + multi-confluence
 * Experts  : 11 decorrelated indicators (OrderBook, VolumeDelta, BollingerPctB, etc.)
 * Learning : brain.json — adaptive weights per symbol, updated after every closed trade
 *
 * Flow per scan:
 *   1. Manage open positions (detect SL/TP fills via BitGet position state)
 *   2. Run 11 experts → weighted vote (long% / short%)
 *   3. Run base filter (EMA stack, VWAP, RSI dual-TF, volume, candle pattern)
 *   4. Veto: momentum, multi-timeframe alignment, expert disagreement, funding rate
 *   5. Confluence score → dynamic size $15-$30 (volatility-adjusted)
 *   6. Place MARKET + TP/SL plan orders on BitGet
 *   7. On close → update brain weights + log to CSV
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import crypto from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  timeframe:    process.env.TIMEFRAME                     || "1m",
  maxPerDay:    parseInt(process.env.MAX_TRADES_PER_DAY   || "999"),
  paperTrading: process.env.PAPER_TRADING                 !== "false",
  tradeMode:    process.env.TRADE_MODE                    || "futures",
  minSize:      parseFloat(process.env.MIN_TRADE_SIZE_USD || "15"),
  maxSize:      parseFloat(process.env.MAX_TRADE_SIZE_USD || "30"),
  slPct:        parseFloat(process.env.STOP_LOSS_PCT      || "0.6"),
  tpPct:        parseFloat(process.env.TAKE_PROFIT_PCT    || "1.5"),
  leverage:     parseInt(process.env.LEVERAGE             || "3"),
  maxConcurrent:parseInt(process.env.MAX_CONCURRENT_POSITIONS || "2"),
  scanInterval: parseInt(process.env.SCAN_INTERVAL_SEC    || "30") * 1000,
  bitget: {
    apiKey:     process.env.BITGET_API_KEY,
    secretKey:  process.env.BITGET_SECRET_KEY,
    passphrase: process.env.BITGET_PASSPHRASE || "",
    baseUrl:    "https://api.bitget.com",
  },
};

// BitGet USDT-M Futures — minimum step size per symbol (in base asset)
const QTY_STEP = {
  BTCUSDT:  0.001, ETHUSDT: 0.01,  SOLUSDT:  0.1,  BNBUSDT: 0.01,
  XRPUSDT:  1,     DOGEUSDT: 10,   ADAUSDT:  1,    AVAXUSDT: 0.1,
  LINKUSDT: 0.1,   DOTUSDT:  0.1,  LTCUSDT:  0.01,
};
const QTY_PRECISION = {
  BTCUSDT:3, ETHUSDT:2, SOLUSDT:1, BNBUSDT:2, XRPUSDT:0,
  DOGEUSDT:0, ADAUSDT:0, AVAXUSDT:1, LINKUSDT:1, DOTUSDT:1, LTCUSDT:2,
};
// BitGet USDT-M Futures — PRICE precision (decimals for SL/TP) — critical for low-priced coins
const PRICE_PRECISION = {
  BTCUSDT: 1, ETHUSDT: 2, SOLUSDT: 3, BNBUSDT: 2, XRPUSDT: 4,
  DOGEUSDT: 5, ADAUSDT: 4, AVAXUSDT: 3, LINKUSDT: 3, DOTUSDT: 3, LTCUSDT: 2,
};

const LOG_FILE       = "safety-check-log.json";
const POSITIONS_FILE = "positions.json";
const CSV_FILE       = "trades.csv";
const BRAIN_FILE     = "brain.json";
const CSV_HEADERS    = "Date,Time (UTC),Exchange,Symbol,Side,Qty,Entry,Exit,Size USD,PnL,Fee,Net,Score,Order ID,Mode,Notes";

const EXPERT_NAMES = [
  "OrderBook","VolumeDelta","KNNPivots","TrendRange",
  "RSIRegression","MAOscillator","SMBreakout","VolumaticSR",
  "BollingerPctB","SwingVWAP","CVDTrend",
];

// ─── Onboarding ───────────────────────────────────────────────────────────────

function checkOnboarding() {
  const missing = ["BITGET_API_KEY","BITGET_SECRET_KEY"].filter(k => !process.env[k]);
  if (missing.length) { console.log(`Missing in .env: ${missing.join(", ")}`); process.exit(0); }
  if (!CONFIG.bitget.passphrase && !CONFIG.paperTrading) {
    console.error(`\nMissing BITGET_PASSPHRASE in .env`);
    console.error(`Set the passphrase you used when creating the API key on BitGet.\n`);
    process.exit(1);
  }
}

async function checkFuturesAccess() {
  if (CONFIG.paperTrading) return;
  try {
    await bitgetReq("GET", "/api/v2/mix/account/accounts", { productType: "USDT-FUTURES" });
    console.log("  API key: BitGet Futures access OK\n");
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("40037") || msg.includes("invalid api key") || msg.includes("apikey")) {
      console.error(`\n========================================================`);
      console.error(` BITGET AUTH ERROR`);
      console.error(` API key, secret, or passphrase incorrect.`);
      console.error(``);
      console.error(` Check in .env:`);
      console.error(`   BITGET_API_KEY    — starts with bg_`);
      console.error(`   BITGET_SECRET_KEY — long hex string`);
      console.error(`   BITGET_PASSPHRASE — the passphrase you set on BitGet`);
      console.error(`========================================================\n`);
      process.exit(1);
    }
    if (msg.includes("ENOTFOUND") || msg.includes("fetch")) {
      console.error(`\nNETWORK ERROR: Cannot reach api.bitget.com\n`);
      process.exit(1);
    }
    throw err;
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const loadLog       = () => existsSync(LOG_FILE)  ? JSON.parse(readFileSync(LOG_FILE,  "utf8")) : { trades: [] };
const saveLog       = l  => writeFileSync(LOG_FILE,  JSON.stringify(l, null, 2));
const loadPositions = () => { try { return existsSync(POSITIONS_FILE) ? JSON.parse(readFileSync(POSITIONS_FILE,"utf8")) : {}; } catch { return {}; } };
const savePositions = p  => writeFileSync(POSITIONS_FILE, JSON.stringify(p, null, 2));

function countTodaysTrades(log) {
  const today = new Date().toISOString().slice(0, 10);
  return log.trades.filter(t => t.timestamp.startsWith(today) && t.orderPlaced).length;
}

function initCsv() {
  if (!existsSync(CSV_FILE)) { writeFileSync(CSV_FILE, CSV_HEADERS + "\n"); console.log("Created trades.csv\n"); }
}

function logCsv(d) {
  const now = new Date(d.timestamp);
  const row = [
    now.toISOString().slice(0,10), now.toISOString().slice(11,19),
    "BitGet", d.symbol, d.side||"", d.quantity||"",
    d.entryPrice ? (+d.entryPrice).toFixed(4) : "",
    d.exitPrice  ? (+d.exitPrice).toFixed(4)  : "",
    d.sizeUSD    ? (+d.sizeUSD).toFixed(2)    : "",
    d.pnl        ? (+d.pnl).toFixed(4)        : "",
    d.fee        ? (+d.fee).toFixed(4)        : "",
    d.net        ? (+d.net).toFixed(4)        : "",
    d.score !== undefined ? d.score : "",
    d.orderId||"", d.mode||"",
    `"${(d.notes||"").replace(/"/g,"'")}"`,
  ].join(",");
  appendFileSync(CSV_FILE, row + "\n");
}

// ─── Brain (Learning System) ──────────────────────────────────────────────────
//
//  brain.json structure:
//  {
//    totalTrades: number,
//    winRate: { BTCUSDT: { wins: N, losses: N }, ... },
//    symbols:  { BTCUSDT: { SuperTrend: 0.5, VolumeDelta: 0.5, ... }, ... }
//  }
//
//  After every closed trade the weights of experts that AGREED with the trade
//  direction are pushed +0.05 (win) or -0.05 (loss), bounded [0.05, 0.95].

function loadBrain() {
  try { if (existsSync(BRAIN_FILE)) return JSON.parse(readFileSync(BRAIN_FILE, "utf8")); }
  catch {}
  return { totalTrades: 0, winRate: {}, symbols: {} };
}

function saveBrain(brain) { writeFileSync(BRAIN_FILE, JSON.stringify(brain, null, 2)); }

function getExpertWeights(brain, symbol) {
  if (!brain.symbols[symbol]) {
    brain.symbols[symbol] = {};
    EXPERT_NAMES.forEach(n => { brain.symbols[symbol][n] = 0.5; });
  }
  return brain.symbols[symbol];
}

function updateBrainFromTrade(symbol, expertSignals, tradeSide, isWin) {
  const brain   = loadBrain();
  const weights = getExpertWeights(brain, symbol);
  brain.totalTrades = (brain.totalTrades || 0) + 1;
  if (!brain.winRate[symbol]) brain.winRate[symbol] = { wins: 0, losses: 0 };
  if (isWin) brain.winRate[symbol].wins++; else brain.winRate[symbol].losses++;

  const lr  = 0.05;
  const dir = tradeSide === "BUY" ? "long" : "short";

  for (const exp of expertSignals) {
    if (exp.signal === "neutral") continue;
    const agreed = exp.signal === dir;
    const delta  = lr * Math.max(exp.confidence, 0.1);
    if (agreed && isWin)   weights[exp.name] = Math.min((weights[exp.name]||0.5) + delta, 0.95);
    if (agreed && !isWin)  weights[exp.name] = Math.max((weights[exp.name]||0.5) - delta, 0.05);
  }

  brain.symbols[symbol] = weights;
  saveBrain(brain);

  const wr  = brain.winRate[symbol];
  const pct = wr.wins + wr.losses > 0 ? ((wr.wins/(wr.wins+wr.losses))*100).toFixed(1) : "N/A";
  console.log(`  Brain updated | ${symbol} W/L ${wr.wins}/${wr.losses} (${pct}%) | Total trades: ${brain.totalTrades}`);
}

// ─── Market Data ──────────────────────────────────────────────────────────────

async function fetchCandles(symbol, interval, limit = 200) {
  // BitGet granularity map (in minutes for short TFs, hour/day notation for longer)
  const map = { "1m":"1m","3m":"3m","5m":"5m","15m":"15m","30m":"30m","1H":"1H","4H":"4H","1D":"1Dutc" };
  const gran = map[interval] || "1m";
  const url  = `https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol}&productType=USDT-FUTURES&granularity=${gran}&limit=${limit}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Market data ${res.status}`);
  const body = await res.json();
  const rows = body.data ?? body;
  // BitGet candle: [timestamp, open, high, low, close, baseVol, quoteVol]
  // Estimate taker buy volume from candle body direction (BitGet doesn't expose real split)
  return rows.map(k => {
    const o = +k[1], h = +k[2], l = +k[3], c = +k[4], vol = +k[5];
    const range = h - l || 0.000001;
    const body  = Math.abs(c - o);
    const bodyRatio = Math.min(body / range, 1);
    const isBull    = c >= o;
    const takerBuyVol = isBull
      ? vol * (0.5 + bodyRatio * 0.35)
      : vol * (0.5 - bodyRatio * 0.35);
    return { time: +k[0], open: o, high: h, low: l, close: c, volume: vol, takerBuyVol };
  });
}

async function fetchFundingRate(symbol) {
  try {
    const url = `https://api.bitget.com/api/v2/mix/market/funding-rate?symbol=${symbol}&productType=USDT-FUTURES`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const body = await res.json();
    const d    = body.data ?? body;
    return parseFloat(d.fundingRate ?? d.lastFundingRate ?? 0);
  } catch { return 0; }
}

// ─── Core Indicators ──────────────────────────────────────────────────────────

function calcEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a,b) => a+b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i]*k + ema*(1-k);
  return ema;
}

function calcRSI(closes, period) {
  if (closes.length < period * 2 + 1) return null;
  let avgG = 0, avgL = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgG += d; else avgL -= d;
  }
  avgG /= period; avgL /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

function calcVWAP(candles) {
  const midnight = new Date(); midnight.setUTCHours(0,0,0,0);
  let sess = candles.filter(c => c.time >= midnight.getTime());
  if (sess.length < 30) sess = candles; // fallback: use full window early in UTC day
  if (!sess.length) return null;
  const tpv = sess.reduce((s,c) => s + ((c.high+c.low+c.close)/3)*c.volume, 0);
  const vol  = sess.reduce((s,c) => s + c.volume, 0);
  return vol === 0 ? null : tpv / vol;
}

function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i-1].close),
      Math.abs(candles[i].low  - candles[i-1].close)
    ));
  }
  return trs.slice(-period).reduce((a,b) => a+b, 0) / period;
}

function calcAvgVolume(candles, period = 20) {
  const vols = candles.slice(-period-1, -1).map(c => c.volume);
  return vols.length ? vols.reduce((a,b) => a+b, 0) / vols.length : 1;
}

// ─── Price Momentum (raw price action — leading indicator, no lag) ────────
// Top traders' #1 rule: NEVER fight the actual short-term price action.
// EMAs lag. Price doesn't. Block trades against recent live momentum.

function recentMomentumPct(closes, periods = 10) {
  if (closes.length < periods + 1) return 0;
  const old = closes[closes.length - 1 - periods];
  const now = closes[closes.length - 1];
  return (now - old) / old; // e.g., 0.005 = +0.5%
}

// ─── Candle Pattern Confirmation (reversal signal on last closed candle) ────
// Top traders enter on CONFIRMATION, not prediction. Last closed candle must
// show actual rejection of the level (bearish body + lower high for shorts,
// bullish body + higher low for longs, OR strong rejection wick).

function bearishReversalCandle(candles) {
  const c = candles[candles.length - 2];
  const p = candles[candles.length - 3];
  if (!c || !p) return false;
  const body       = Math.abs(c.close - c.open) || 0.000001;
  const upperWick  = c.high - Math.max(c.open, c.close);
  const bearBody   = c.close < c.open;
  const lowerHigh  = c.high < p.high;
  const wickReject = upperWick > body * 1.0; // upper wick at least equal to body
  return (bearBody && lowerHigh) || wickReject;
}

function bullishReversalCandle(candles) {
  const c = candles[candles.length - 2];
  const p = candles[candles.length - 3];
  if (!c || !p) return false;
  const body       = Math.abs(c.close - c.open) || 0.000001;
  const lowerWick  = Math.min(c.open, c.close) - c.low;
  const bullBody   = c.close > c.open;
  const higherLow  = c.low > p.low;
  const wickReject = lowerWick > body * 1.0;
  return (bullBody && higherLow) || wickReject;
}

// ─── Expert Indicators ────────────────────────────────────────────────────────
// Each expert returns: { signal: 'long'|'short'|'neutral', confidence: 0-1, name: string }

/** Order Book Imbalance — real bid/ask pressure from BitGet depth (institutional edge) */
async function expertOrderBook(symbol) {
  try {
    const url = `https://api.bitget.com/api/v2/mix/market/merge-depth?symbol=${symbol}&productType=USDT-FUTURES&precision=scale0&limit=50`;
    const res = await fetch(url);
    if (!res.ok) return { signal:"neutral", confidence:0, name:"OrderBook" };
    const body = await res.json();
    const d    = body.data ?? body;
    if (!d?.bids || !d?.asks) return { signal:"neutral", confidence:0, name:"OrderBook" };
    const bidVol = d.bids.slice(0, 20).reduce((s, [, v]) => s + parseFloat(v), 0);
    const askVol = d.asks.slice(0, 20).reduce((s, [, v]) => s + parseFloat(v), 0);
    if (bidVol + askVol === 0) return { signal:"neutral", confidence:0, name:"OrderBook" };
    const ratio = bidVol / askVol;
    if (ratio > 1.4) return { signal:"long",  confidence: Math.min((ratio - 1) / 1.5, 1), name:"OrderBook" };
    if (ratio < 0.71) return { signal:"short", confidence: Math.min((1/ratio - 1) / 1.5, 1), name:"OrderBook" };
    return { signal:"neutral", confidence:0, name:"OrderBook" };
  } catch { return { signal:"neutral", confidence:0, name:"OrderBook" }; }
}

/** Volume Delta — real taker buy vs sell pressure from Binance aggTrade data */
function expertVolumeDelta(candles) {
  const recent = candles.slice(-20);
  let buyVol = 0, sellVol = 0;
  for (const c of recent) {
    buyVol  += c.takerBuyVol || 0;
    sellVol += (c.volume - (c.takerBuyVol || 0));
  }
  const total = buyVol + sellVol;
  if (total === 0) return { signal:"neutral", confidence:0, name:"VolumeDelta" };
  const delta = (buyVol - sellVol) / total;
  if (Math.abs(delta) < 0.06) return { signal:"neutral", confidence:0, name:"VolumeDelta" };
  return { signal: delta>0 ? "long":"short", confidence: Math.min(Math.abs(delta)*2.5,1), name:"VolumeDelta" };
}

/** KNN Pivot Points — find K nearest historical 3-candle patterns, average forward return */
function expertKNNPivots(candles, k = 5) {
  if (candles.length < 20) return { signal:"neutral", confidence:0, name:"KNNPivots" };
  const closes = candles.map(c => c.close);
  const last   = closes.length - 1;

  const toFeat = (arr, i) =>
    [1,2,3].map(j => (arr[i-j+1] - arr[i-j]) / (arr[i-j] || 1));

  const curFeat = toFeat(closes, last);
  const neighbors = [];

  for (let i = 5; i < last - 4; i++) {
    const feat = toFeat(closes, i);
    const dist = Math.sqrt(feat.reduce((s,f,j) => s + (f-curFeat[j])**2, 0));
    const fwd  = (closes[i+3] - closes[i]) / (closes[i] || 1);
    neighbors.push({ dist, fwd });
  }
  if (!neighbors.length) return { signal:"neutral", confidence:0, name:"KNNPivots" };

  neighbors.sort((a,b) => a.dist - b.dist);
  const avg = neighbors.slice(0,k).reduce((s,n) => s+n.fwd, 0) / k;

  if (Math.abs(avg) < 0.0005) return { signal:"neutral", confidence:0, name:"KNNPivots" };
  return { signal: avg>0 ? "long":"short", confidence: Math.min(Math.abs(avg)*500,1), name:"KNNPivots" };
}

/** Trend Range Detector — ADX approximation; confirms trending vs ranging */
function expertTrendRange(candles) {
  const period = 14;
  if (candles.length < period + 5) return { signal:"neutral", confidence:0, name:"TrendRange" };

  let posSum = 0, negSum = 0;
  for (let i = 1; i <= period && i < candles.length; i++) {
    const hi = candles[candles.length-i].high   - candles[candles.length-i-1].high;
    const lo = candles[candles.length-i-1].low  - candles[candles.length-i].low;
    if (hi > lo && hi > 0) posSum += hi;
    if (lo > hi && lo > 0) negSum += lo;
  }
  const adx = (posSum + negSum) > 0 ? Math.abs(posSum-negSum)/(posSum+negSum) : 0;
  if (adx < 0.2) return { signal:"neutral", confidence:adx, name:"TrendRange" };

  const closes = candles.map(c => c.close);
  const ema    = calcEMA(closes, period);
  const price  = closes[closes.length-1];

  return { signal: price>ema ? "long":"short", confidence: Math.min(adx,1), name:"TrendRange" };
}

/** RSI Regression Bands (Zeiierman) — RSI with linear regression channel */
function expertRSIRegression(closes) {
  if (closes.length < 40) return { signal:"neutral", confidence:0, name:"RSIRegression" };

  const rsiSeries = [];
  for (let i = 15; i <= closes.length; i++) rsiSeries.push(calcRSI(closes.slice(i-15,i), 14));

  const n      = Math.min(20, rsiSeries.length);
  const recent = rsiSeries.slice(-n).filter(v => v !== null);
  if (recent.length < 5) return { signal:"neutral", confidence:0, name:"RSIRegression" };

  const xM = (recent.length-1)/2;
  const yM = recent.reduce((s,v) => s+v, 0) / recent.length;
  let num = 0, den = 0;
  recent.forEach((v,i) => { num += (i-xM)*(v-yM); den += (i-xM)**2; });
  const slope = den ? num/den : 0;
  const icept = yM - slope*xM;
  const pred  = icept + slope*(recent.length-1);
  const resid = recent.map((v,i) => v - (icept+slope*i));
  const std   = Math.sqrt(resid.reduce((s,r) => s+r**2, 0) / recent.length) || 1;

  const cur = recent[recent.length-1];
  const upper = pred + 2*std;
  const lower = pred - 2*std;

  if (cur < lower) return { signal:"long",  confidence: Math.min((lower-cur)/10,1), name:"RSIRegression" };
  if (cur > upper) return { signal:"short", confidence: Math.min((cur-upper)/10,1), name:"RSIRegression" };
  if (slope > 1)   return { signal:"long",  confidence:0.4, name:"RSIRegression" };
  if (slope < -1)  return { signal:"short", confidence:0.4, name:"RSIRegression" };
  return { signal:"neutral", confidence:0, name:"RSIRegression" };
}

/** Moving Averages Range Oscillator (Zeiierman) — EMA stack alignment */
function expertMAOscillator(closes) {
  if (closes.length < 55) return { signal:"neutral", confidence:0, name:"MAOscillator" };
  const ema9  = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const price = closes[closes.length-1];

  let score = 0;
  if (ema9  > ema21) score++; else score--;
  if (ema21 > ema50) score++; else score--;
  if (price > ema9)  score++; else score--;

  const momentum = Math.abs((ema9-ema21)/ema21);
  if (score >= 2)  return { signal:"long",  confidence: Math.min(momentum*300,1), name:"MAOscillator" };
  if (score <= -2) return { signal:"short", confidence: Math.min(momentum*300,1), name:"MAOscillator" };
  return { signal:"neutral", confidence:0, name:"MAOscillator" };
}

/** Smart Money Breakout Channels (AlgoAlpha) — range breakout with volume */
function expertSMBreakout(candles) {
  const lb = 20;
  if (candles.length < lb + 2) return { signal:"neutral", confidence:0, name:"SMBreakout" };

  const hist  = candles.slice(-lb-1,-1);
  const hiHi  = Math.max(...hist.map(c => c.high));
  const loLo  = Math.min(...hist.map(c => c.low));
  const avgVol= hist.reduce((s,c) => s+c.volume, 0) / hist.length;
  const last  = candles[candles.length-1];
  const volR  = last.volume / (avgVol||1);

  if (last.close > hiHi && volR > 1.5) return { signal:"long",  confidence: Math.min(volR/4,1), name:"SMBreakout" };
  if (last.close < loLo && volR > 1.5) return { signal:"short", confidence: Math.min(volR/4,1), name:"SMBreakout" };
  return { signal:"neutral", confidence:0, name:"SMBreakout" };
}

/** Volumatic Support/Resistance (BigBeluga) — high-volume candles define S/R zones */
function expertVolumaticSR(candles) {
  const lb = 60;
  if (candles.length < lb) return { signal:"neutral", confidence:0, name:"VolumaticSR" };

  const hist   = candles.slice(-lb-1,-1);
  const avgVol = hist.reduce((s,c) => s+c.volume, 0) / hist.length;
  const levels = hist.filter(c => c.volume > avgVol*2).map(c => (c.high+c.low)/2);
  if (!levels.length) return { signal:"neutral", confidence:0, name:"VolumaticSR" };

  const price  = candles[candles.length-1].close;
  const above  = levels.filter(p => p > price);
  const below  = levels.filter(p => p <= price);
  if (!above.length || !below.length) return { signal:"neutral", confidence:0, name:"VolumaticSR" };

  const nearUp  = Math.min(...above);
  const nearDn  = Math.max(...below);
  const distUp  = (nearUp  - price) / price;
  const distDn  = (price   - nearDn) / price;
  const ratio   = distDn / (distUp + 0.00001);

  if (ratio > 1.5)  return { signal:"long",  confidence: Math.min(ratio/3,1), name:"VolumaticSR" };
  if (ratio < 0.67) return { signal:"short", confidence: Math.min((1/ratio)/3,1), name:"VolumaticSR" };
  return { signal:"neutral", confidence:0, name:"VolumaticSR" };
}

/** Bollinger Bands %B — pure mean reversion, decorrelated from trend experts.
 *  %B = (price - lower) / (upper - lower). Above 1 = overbought (short), below 0 = oversold (long). */
function expertBollingerPctB(candles) {
  const period = 20;
  if (candles.length < period + 2) return { signal:"neutral", confidence:0, name:"BollingerPctB" };

  const closes = candles.slice(-period).map(c => c.close);
  const mean   = closes.reduce((a,b) => a+b, 0) / period;
  const variance = closes.reduce((s,c) => s + (c-mean)**2, 0) / period;
  const std    = Math.sqrt(variance);
  if (std === 0) return { signal:"neutral", confidence:0, name:"BollingerPctB" };

  const upper = mean + 2 * std;
  const lower = mean - 2 * std;
  const price = candles[candles.length-1].close;
  const pctB  = (price - lower) / (upper - lower);

  // Mean reversion logic: extremes signal reversal
  if (pctB > 1.0)  return { signal:"short", confidence: Math.min((pctB - 1) * 3, 1), name:"BollingerPctB" };
  if (pctB < 0)    return { signal:"long",  confidence: Math.min(-pctB * 3, 1),      name:"BollingerPctB" };
  if (pctB > 0.85) return { signal:"short", confidence: (pctB - 0.85) * 4,            name:"BollingerPctB" };
  if (pctB < 0.15) return { signal:"long",  confidence: (0.15 - pctB) * 4,            name:"BollingerPctB" };
  return { signal:"neutral", confidence:0, name:"BollingerPctB" };
}

/** Dynamic Swing Anchored VWAP (Zeiierman) — VWAP anchored to nearest swing point */
function expertSwingVWAP(candles) {
  if (candles.length < 20) return { signal:"neutral", confidence:0, name:"SwingVWAP" };

  const win = candles.slice(-60);
  let anchorIdx = win.length - 1;
  for (let i = 3; i < win.length-2; i++) {
    const isSwingLow  = win[i].low  < win[i-1].low  && win[i].low  < win[i+1].low;
    const isSwingHigh = win[i].high > win[i-1].high && win[i].high > win[i+1].high;
    if (isSwingLow || isSwingHigh) anchorIdx = i;
  }

  const anchored = win.slice(anchorIdx);
  if (anchored.length < 2) return { signal:"neutral", confidence:0, name:"SwingVWAP" };

  const tpv  = anchored.reduce((s,c) => s + ((c.high+c.low+c.close)/3)*c.volume, 0);
  const vol  = anchored.reduce((s,c) => s + c.volume, 0);
  const vwap = vol > 0 ? tpv/vol : null;
  if (!vwap) return { signal:"neutral", confidence:0, name:"SwingVWAP" };

  const price = candles[candles.length-1].close;
  const dev   = (price - vwap) / (vwap||1);
  if (Math.abs(dev) < 0.001) return { signal:"neutral", confidence:0, name:"SwingVWAP" };

  return { signal: dev>0 ? "long":"short", confidence: Math.min(Math.abs(dev)*200,1), name:"SwingVWAP" };
}

/** CVD Trend — Cumulative Volume Delta using real taker buy/sell data from Binance */
function expertCVDTrend(candles) {
  const period = 20;
  if (candles.length < period * 2 + 1) return { signal:"neutral", confidence:0, name:"CVDTrend" };

  const cvd = (slice) => slice.reduce((sum, c) => sum + (c.takerBuyVol || 0) - (c.volume - (c.takerBuyVol || 0)), 0);

  const cvdNow  = cvd(candles.slice(-period));
  const cvdPrev = cvd(candles.slice(-period * 2, -period));
  const totalVol = candles.slice(-period).reduce((s, c) => s + c.volume, 0) || 1;

  const delta = (cvdNow - cvdPrev) / totalVol; // normalized by volume
  if (Math.abs(delta) < 0.05) return { signal:"neutral", confidence:0, name:"CVDTrend" };

  return { signal: delta > 0 ? "long" : "short", confidence: Math.min(Math.abs(delta) * 4, 1), name:"CVDTrend" };
}

// ─── Expert Evaluation ────────────────────────────────────────────────────────

async function evaluateExperts(candles, symbol) {
  const brain   = loadBrain();
  const weights = getExpertWeights(brain, symbol);

  const cc = candles.slice(0, -1); // closed candles only — exclude the live incomplete candle
  const experts = [
    await expertOrderBook(symbol),
    expertVolumeDelta(cc),
    expertKNNPivots(cc),
    expertTrendRange(cc),
    expertRSIRegression(cc.map(c => c.close)),
    expertMAOscillator(cc.map(c => c.close)),
    expertSMBreakout(cc),
    expertVolumaticSR(cc),
    expertBollingerPctB(cc),
    expertSwingVWAP(cc),
    expertCVDTrend(cc),
  ];

  let longScore = 0, shortScore = 0, totalW = 0;
  for (const e of experts) {
    const w = weights[e.name] || 0.5;
    totalW += w;
    if (e.signal === "long")  longScore  += w * e.confidence;
    if (e.signal === "short") shortScore += w * e.confidence;
  }

  const norm  = totalW || 1;
  const longPct  = longScore  / norm;
  const shortPct = shortScore / norm;

  // Print compact expert table
  const icons = experts.map(e => {
    const sym = e.signal==="long" ? "L" : e.signal==="short" ? "S" : ".";
    const w   = (weights[e.name]||0.5).toFixed(2);
    return `${e.name.substring(0,9)}:${sym}(w${w})`;
  });
  console.log(`  Experts: ${icons.join(" | ")}`);
  console.log(`  Vote -> LONG ${(longPct*100).toFixed(1)}%  SHORT ${(shortPct*100).toFixed(1)}%`);

  return { experts, longScore: longPct, shortScore: shortPct };
}

// ─── Core Safety Check (6+1 conditions) ──────────────────────────────────────

function runSafetyCheck(price, ema9, ema21, vwap, rsi3, rsi14, currentVolume, avgVolume, htfBullish = null, candles = null, mtfBullish = null) {
  const results = [];
  const check = (label, req, actual, pass) => {
    results.push({ label, required:req, actual, pass });
    console.log(`  ${pass?"[OK]":"[--]"} ${label.padEnd(36)} | ${req.padEnd(14)} | ${actual}`);
  };

  console.log("\n-- Safety Check --\n");
  const bullish = price > vwap && price > ema21;
  const bearish = price < vwap && price < ema21;

  // When 1H HTF confirms direction: relax RSI(3) and volume thresholds (captures 2+ days of trend)
  const htfAligned = htfBullish === null
    ? true
    : (bullish && htfBullish) || (bearish && !htfBullish);
  const rsi3Lo  = htfAligned ? 40  : 30;
  const rsi3Hi  = htfAligned ? 60  : 70;
  const volMult = htfAligned ? 1.2 : 1.5;
  const htfTag  = htfBullish === null ? "" : ` | 1H HTF: ${htfAligned ? "aligned" : "counter"}`;

  // Bounce-top SHORT: requires CONFIRMED reversal (top trader style — wait for signal, not prediction)
  if (htfBullish === false && !bearish && rsi3 !== null) {
    const momentumBroken = ema9 <= ema21;
    const rsiExhausted   = rsi3 > 65;
    const notBreakout    = currentVolume / avgVolume < 1.8;
    const reversalCandle = candles ? bearishReversalCandle(candles) : true;
    const mtfAligned     = mtfBullish === null || mtfBullish === false;
    if (momentumBroken && rsiExhausted && notBreakout && reversalCandle && mtfAligned) {
      console.log("  Bias: SHORT (bounce-top — confirmed reversal candle)\n");
      check("1H HTF: BEARISH",               "BEARISH",  "BEARISH",                                  true);
      check("5m HTF: BEARISH/neutral",       "≤ neutral","BEARISH",                                  mtfAligned);
      check("EMA9 ≤ EMA21 (momentum broken)","≤ EMA21",  ema9.toFixed(4),                            momentumBroken);
      check("RSI(3) > 65 (exhausted)",       "> 65",     rsi3.toFixed(1),                            rsiExhausted);
      check("Reversal candle confirmed",     "yes",      "yes",                                      reversalCandle);
      check("Volume < 1.8x (not breakout)",  "< 1.8x",   `${(currentVolume/avgVolume).toFixed(2)}x`, notBreakout);
      return { results, allPass: results.every(r => r.pass), bullish: false, bearish: true };
    }
  }

  if (bullish) {
    console.log(`  Bias: BULLISH — checking LONG conditions${htfTag}\n`);
    const reversal = candles ? bullishReversalCandle(candles) : true;
    const mtfOk    = mtfBullish === null || mtfBullish === true;
    check("Price > VWAP (session bias)",         `> ${vwap.toFixed(2)}`,   price.toFixed(2),  price > vwap);
    check("Price > EMA(21) (vdP trend)",         `> ${ema21.toFixed(2)}`,  price.toFixed(2),  price > ema21);
    check("EMA(9) > EMA(21) (momentum)",         `> ${ema21.toFixed(2)}`,  ema9.toFixed(2),   ema9 > ema21);
    check("RSI(14) > 50 (trend confirm)",        "> 50",                   rsi14.toFixed(1),  rsi14 > 50);
    check(`RSI(3) < ${rsi3Lo} (pullback)`,       `< ${rsi3Lo}`,            rsi3.toFixed(1),   rsi3 < rsi3Lo);
    check(`Volume >= ${volMult}x avg (ICT)`,     `>= ${volMult}x`,         `${(currentVolume/avgVolume).toFixed(2)}x`, currentVolume/avgVolume >= volMult);
    check("Reversal candle (higher low/wick)",   "confirmed",              reversal?"yes":"no",                       reversal);
    check("5m HTF agrees",                        "5m BULLISH",            mtfBullish === null ? "n/a" : (mtfBullish ? "BULLISH" : "BEARISH"), mtfOk);
    if (!htfAligned && htfBullish !== null)
      check("1H HTF alignment",                  "1H BULLISH",             "1H BEARISH",      false);
  } else if (bearish) {
    console.log(`  Bias: BEARISH — checking SHORT conditions${htfTag}\n`);
    const reversal = candles ? bearishReversalCandle(candles) : true;
    const mtfOk    = mtfBullish === null || mtfBullish === false;
    check("Price < VWAP (session bias)",         `< ${vwap.toFixed(2)}`,   price.toFixed(2),  price < vwap);
    check("Price < EMA(21) (vdP trend)",         `< ${ema21.toFixed(2)}`,  price.toFixed(2),  price < ema21);
    check("EMA(9) < EMA(21) (momentum)",         `< ${ema21.toFixed(2)}`,  ema9.toFixed(2),   ema9 < ema21);
    check("RSI(14) < 50 (trend confirm)",        "< 50",                   rsi14.toFixed(1),  rsi14 < 50);
    check(`RSI(3) > ${rsi3Hi} (exhaustion)`,     `> ${rsi3Hi}`,            rsi3.toFixed(1),   rsi3 > rsi3Hi);
    check(`Volume >= ${volMult}x avg (ICT)`,     `>= ${volMult}x`,         `${(currentVolume/avgVolume).toFixed(2)}x`, currentVolume/avgVolume >= volMult);
    check("Reversal candle (lower high/wick)",   "confirmed",              reversal?"yes":"no",                       reversal);
    check("5m HTF agrees",                        "5m BEARISH",            mtfBullish === null ? "n/a" : (mtfBullish ? "BULLISH" : "BEARISH"), mtfOk);
    if (!htfAligned && htfBullish !== null)
      check("1H HTF alignment",                  "1H BEARISH",             "1H BULLISH",      false);
  } else {
    console.log("  Bias: NEUTRAL — price between VWAP and EMA21, no trade\n");
    results.push({ label:"Market bias", required:"Bullish or Bearish", actual:"Neutral", pass:false });
  }

  return { results, allPass: results.every(r => r.pass), bullish, bearish };
}

// ─── Confluence Score + Dynamic Sizing ───────────────────────────────────────

function calcConfluenceScore(price, rsi3, ema50, currentVol, avgVol, isLong, expertLong, expertShort, atr) {
  let score = 0;
  const bonuses = [];

  if  (isLong && rsi3 < 15)          { score++; bonuses.push(`RSI(3) extreme ${rsi3.toFixed(1)}`); }
  if (!isLong && rsi3 > 85)          { score++; bonuses.push(`RSI(3) extreme ${rsi3.toFixed(1)}`); }
  if (currentVol >= avgVol * 2)      { score++; bonuses.push(`Vol ${(currentVol/avgVol).toFixed(1)}x`); }
  if  (isLong && price > ema50)      { score++; bonuses.push("EMA50 stack"); }
  if (!isLong && price < ema50)      { score++; bonuses.push("EMA50 stack"); }

  const expScore = isLong ? expertLong : expertShort;
  if (expScore > 0.3)                { score++; bonuses.push(`Expert ${(expScore*100).toFixed(0)}%`); }

  const capped = Math.min(score, 3);
  let size = CONFIG.minSize + capped * (CONFIG.maxSize - CONFIG.minSize) / 3;

  // Volatility-aware sizing: ATR > 1% of price = high vol → shrink by 30%
  if (atr && price) {
    const atrPct = atr / price;
    if (atrPct > 0.01) {
      size *= 0.7;
      bonuses.push(`vol-adj -30% (ATR ${(atrPct*100).toFixed(2)}%)`);
    } else if (atrPct < 0.003) {
      size *= 1.2;  // very calm market = slightly larger
      bonuses.push(`calm-adj +20% (ATR ${(atrPct*100).toFixed(2)}%)`);
    }
  }
  size = Math.min(Math.max(size, CONFIG.minSize), CONFIG.maxSize);
  return { score, capped, size: +size.toFixed(2), bonuses };
}

// ─── BitGet Futures ───────────────────────────────────────────────────────────

function signBitget(timestamp, method, path, body = "") {
  const msg  = timestamp + method.toUpperCase() + path + body;
  return crypto.createHmac("sha256", CONFIG.bitget.secretKey).update(msg).digest("base64");
}

async function bitgetReq(method, path, params = {}) {
  const timestamp = Date.now().toString();
  let   url, body = "", headers;

  if (method === "GET") {
    const qs = Object.keys(params).length
      ? "?" + Object.entries(params).map(([k,v]) => `${k}=${v}`).join("&")
      : "";
    url  = `${CONFIG.bitget.baseUrl}${path}${qs}`;
    body = "";
    headers = {
      "ACCESS-KEY":        CONFIG.bitget.apiKey,
      "ACCESS-SIGN":       signBitget(timestamp, method, path + qs, ""),
      "ACCESS-TIMESTAMP":  timestamp,
      "ACCESS-PASSPHRASE": CONFIG.bitget.passphrase,
      "Content-Type":      "application/json",
      "locale":            "en-US",
    };
  } else {
    body = JSON.stringify(params);
    url  = `${CONFIG.bitget.baseUrl}${path}`;
    headers = {
      "ACCESS-KEY":        CONFIG.bitget.apiKey,
      "ACCESS-SIGN":       signBitget(timestamp, method, path, body),
      "ACCESS-TIMESTAMP":  timestamp,
      "ACCESS-PASSPHRASE": CONFIG.bitget.passphrase,
      "Content-Type":      "application/json",
      "locale":            "en-US",
    };
  }

  const res = await fetch(url, { method, headers, body: method !== "GET" ? body : undefined });
  const d   = await res.json();
  if (d.code && d.code !== "00000") throw new Error(`BitGet: ${d.msg} (${d.code})`);
  return d.data ?? d;
}

// Fetch all open positions and return the one for the given symbol.
// Returns {size:"0"} when no position exists (confirmed closed).
// Returns null only on network/auth error (ambiguous — caller should not close).
async function getPosition(symbol) {
  try {
    const d    = await bitgetReq("GET", "/api/v2/mix/position/all-position", {
      productType: "USDT-FUTURES", marginCoin: "USDT",
    });
    const list = Array.isArray(d) ? d : (d ? [d] : []);
    return list.find(p => p.symbol === symbol) ?? { size: "0", markPrice: "0" };
  } catch (err) {
    // Fallback: try single-position endpoint
    try {
      const d2 = await bitgetReq("GET", "/api/v2/mix/position/single-position", {
        symbol, productType: "USDT-FUTURES", marginCoin: "USDT",
      });
      const pos = Array.isArray(d2) ? d2[0] : d2;
      return pos ?? { size: "0", markPrice: "0" };
    } catch (err2) {
      console.log(`  [pos] ${symbol}: ${err2.message}`);
      return null;
    }
  }
}

async function setLeverage(symbol, holdSide) {
  try {
    await bitgetReq("POST", "/api/v2/mix/account/set-leverage", {
      symbol, productType: "USDT-FUTURES", marginCoin: "USDT",
      leverage: String(CONFIG.leverage), holdSide,
    });
  } catch (err) {
    // Non-fatal but logged — account default leverage will be used (potentially dangerous)
    console.log(`  ⚠ Leverage set failed for ${symbol} ${holdSide}: ${err.message} — account default applies`);
  }
}

async function syncHistoryFromBitget() {
  if (CONFIG.paperTrading) return;
  try {
    const data = await bitgetReq("GET", "/api/v2/mix/order/orders-pending", {
      productType: "USDT-FUTURES", symbol: "default",
    });
    void data; // just tests connectivity; full history sync runs per-symbol in position check
  } catch {}
}

async function openFuturesPosition(symbol, side, sizeUSD, price, atr) {
  const precision  = QTY_PRECISION[symbol] ?? 3;
  const step       = QTY_STEP[symbol] ?? 0.001;
  const rawQty     = sizeUSD / price;
  const snapped    = Math.max(Math.floor(rawQty / step) * step, step);
  const actualCost = snapped * price;
  if (actualCost > sizeUSD * 2.5) {
    throw new Error(`Skipped ${symbol}: min order $${actualCost.toFixed(0)} exceeds budget $${sizeUSD}`);
  }
  const qty      = snapped.toFixed(precision);
  const isLong   = side === "BUY";
  const holdSide = isLong ? "long" : "short";

  await setLeverage(symbol, holdSide);

  const atrSl  = atr ? Math.max(atr * 0.75, price * CONFIG.slPct / 100) : price * CONFIG.slPct / 100;
  const atrTp  = atr ? Math.max(atr * 1.3,  price * CONFIG.tpPct / 100) : price * CONFIG.tpPct / 100;
  const pPrec  = PRICE_PRECISION[symbol] ?? 4;
  const slPrice = (price + (isLong ? -atrSl :  atrSl)).toFixed(pPrec);
  const tpPrice = (price + (isLong ?  atrTp : -atrTp)).toFixed(pPrec);
  // Safety check: SL/TP must be distinct from entry (catches future precision bugs early)
  if (parseFloat(slPrice) === price || parseFloat(tpPrice) === price) {
    throw new Error(`SL/TP collapsed to entry price for ${symbol} — check PRICE_PRECISION`);
  }

  // Market entry order
  const entry = await bitgetReq("POST", "/api/v2/mix/order/place-order", {
    symbol, productType: "USDT-FUTURES", marginMode: "crossed", marginCoin: "USDT",
    size: qty, side: isLong ? "buy" : "sell", tradeSide: "open",
    orderType: "market", force: "gtc",
  });
  const entryOrderId = entry.orderId ?? entry.clientOid ?? "unknown";
  const fill         = parseFloat(entry.price) || price;

  // Stop Loss
  const sl = await bitgetReq("POST", "/api/v2/mix/order/place-tpsl-order", {
    symbol, productType: "USDT-FUTURES", marginCoin: "USDT",
    planType: "pos_loss", triggerPrice: slPrice, triggerType: "mark_price",
    holdSide, size: "0",
  });

  // Take Profit
  const tp = await bitgetReq("POST", "/api/v2/mix/order/place-tpsl-order", {
    symbol, productType: "USDT-FUTURES", marginCoin: "USDT",
    planType: "pos_profit", triggerPrice: tpPrice, triggerType: "mark_price",
    holdSide, size: "0",
  });

  return {
    entryOrderId, quantity: qty, fillPrice: fill, slPrice, tpPrice,
    slOrderId: sl?.planOrderId ?? sl?.orderId ?? null,
    tpOrderId: tp?.planOrderId ?? tp?.orderId ?? null,
  };
}

async function closeFuturesPosition(symbol, side, quantity, slId, tpId) {
  // Cancel TP/SL orders — use cancel-tpsl-order (placed via place-tpsl-order)
  for (const id of [slId, tpId]) {
    if (!id) continue;
    try {
      await bitgetReq("POST", "/api/v2/mix/order/cancel-tpsl-order", {
        symbol, productType: "USDT-FUTURES", marginCoin: "USDT", orderId: id,
      });
    } catch {}
  }
  // Market close
  const isLong = side === "BUY";
  return bitgetReq("POST", "/api/v2/mix/order/place-order", {
    symbol, productType: "USDT-FUTURES", marginMode: "crossed", marginCoin: "USDT",
    size: quantity, side: isLong ? "sell" : "buy", tradeSide: "close",
    orderType: "market", force: "gtc", reduceOnly: "YES",
  });
}

// ─── Position Management ──────────────────────────────────────────────────────

async function checkAndCloseExistingPositions() {
  const positions = loadPositions();
  const symbols   = Object.keys(positions);
  if (!symbols.length) return;

  console.log(`\n-- Managing ${symbols.length} open position(s) --`);

  for (const symbol of symbols) {
    const pos    = positions[symbol];
    const isLong = pos.side === "BUY";
    console.log(`\n  ${symbol} | ${pos.side} @ $${(+pos.entryPrice).toFixed(4)} | SL $${pos.slPrice} | TP $${pos.tpPrice} | $${pos.sizeUSD}`);

    try {
      const candles = await fetchCandles(symbol, CONFIG.timeframe, 50);
      const closes  = candles.map(c => c.close);
      const price   = closes[closes.length - 1];
      const rsi3    = calcRSI(closes, 3);

      if (CONFIG.paperTrading) {
        const slHit  = isLong ? price <= +pos.slPrice : price >= +pos.slPrice;
        const tpHit  = isLong ? price >= +pos.tpPrice : price <= +pos.tpPrice;
        const rsiOut = isLong ? (rsi3 && rsi3 > 50)   : (rsi3 && rsi3 < 50);
        const reason = slHit ? "STOP LOSS" : tpHit ? "TAKE PROFIT" : rsiOut ? `RSI exit (${rsi3.toFixed(1)})` : null;

        if (reason) {
          const pnl  = ((isLong ? price-+pos.entryPrice : +pos.entryPrice-price) * +pos.quantity).toFixed(4);
          const fee  = (+pos.quantity * price * 0.0004).toFixed(4);
          const isWin = parseFloat(pnl) > 0;
          console.log(`  PAPER CLOSE | ${reason} | $${price.toFixed(4)} | PnL $${pnl}`);
          if (pos.expertSignals) updateBrainFromTrade(symbol, pos.expertSignals, pos.side, isWin);
          logCsv({ timestamp:new Date().toISOString(), symbol, side:isLong?"SELL":"BUY",
            quantity:pos.quantity, entryPrice:pos.entryPrice, exitPrice:price,
            sizeUSD:pos.sizeUSD, pnl, fee, net:(+pnl-+fee).toFixed(4),
            score:pos.score, orderId:`PAPER-CLOSE-${Date.now()}`, mode:"PAPER", notes:reason });
          delete positions[symbol]; savePositions(positions);
        } else {
          console.log(`  Holding | $${price.toFixed(4)} | RSI(3) ${rsi3?rsi3.toFixed(1):"N/A"}`);
        }

      } else {
        const risk = await getPosition(symbol);

        // BitGet uses "total" for position size (not "size" or "positionAmt")
        if (!risk) {
          console.log(`  Cannot confirm position — assuming still open`);
        } else {
        const posAmt = Math.abs(parseFloat(risk.total ?? risk.size ?? 0));

        if (posAmt < 0.0001) {
          // Confirmed closed by BitGet SL/TP — estimate exit from SL/TP levels
          const markNow = parseFloat(risk.markPrice ?? risk.averageOpenPrice) || price;
          let exitPrice;
          if (isLong) {
            exitPrice = markNow <= +pos.slPrice ? +pos.slPrice
                      : markNow >= +pos.tpPrice ? +pos.tpPrice
                      : markNow;
          } else {
            exitPrice = markNow >= +pos.slPrice ? +pos.slPrice
                      : markNow <= +pos.tpPrice ? +pos.tpPrice
                      : markNow;
          }
          const qty  = +pos.quantity;
          const pnl  = ((isLong ? exitPrice-+pos.entryPrice : +pos.entryPrice-exitPrice) * qty).toFixed(4);
          const fee  = (qty * exitPrice * 0.0004).toFixed(4);
          const isWin = parseFloat(pnl) > 0;
          console.log(`  CLOSED BY BITGET (SL/TP) | exit ~$${exitPrice.toFixed(4)} | PnL ~$${pnl}`);
          if (pos.expertSignals) updateBrainFromTrade(symbol, pos.expertSignals, pos.side, isWin);
          logCsv({ timestamp:new Date().toISOString(), symbol, side:isLong?"SELL":"BUY",
            quantity:pos.quantity, entryPrice:pos.entryPrice, exitPrice,
            sizeUSD:pos.sizeUSD, pnl, fee, net:(+pnl-+fee).toFixed(4),
            score:pos.score, orderId:"AUTO-CLOSED", mode:"LIVE", notes:"SL/TP BitGet" });
          delete positions[symbol]; savePositions(positions);
        } else {
          // Live: SL/TP already on BitGet — only exit manually if RSI reverses hard against position
          // (price moving strongly opposite to trade direction = reduce loss early)
          const rsiReverse = isLong
            ? (rsi3 && rsi3 < 20)   // long + extreme oversold again = trapped, cut
            : (rsi3 && rsi3 > 80);  // short + extreme overbought again = reversal, cut
          if (rsiReverse) {
            console.log(`  RSI REVERSAL EXIT | RSI(3) ${rsi3.toFixed(1)} — closing position`);
            let orderId = "RSI-EXIT";
            try {
              const closeOrd = await closeFuturesPosition(symbol, pos.side, pos.quantity, pos.slOrderId, pos.tpOrderId);
              orderId = closeOrd?.orderId ?? orderId;
            } catch (closeErr) {
              // 22002 = already closed by BitGet SL/TP — that's fine, still remove from tracking
              if (!closeErr.message.includes("22002")) throw closeErr;
              console.log(`  Position already closed by BitGet`);
              orderId = "BITGET-AUTO-CLOSED";
            }
            const pnl  = ((isLong?price-+pos.entryPrice:+pos.entryPrice-price)*+pos.quantity).toFixed(4);
            const fee  = (+pos.quantity*price*0.0004).toFixed(4);
            const isWin = parseFloat(pnl) > 0;
            if (pos.expertSignals) updateBrainFromTrade(symbol, pos.expertSignals, pos.side, isWin);
            logCsv({ timestamp:new Date().toISOString(), symbol, side:isLong?"SELL":"BUY",
              quantity:pos.quantity, entryPrice:pos.entryPrice, exitPrice:price,
              sizeUSD:pos.sizeUSD, pnl, fee, net:(+pnl-+fee).toFixed(4),
              score:pos.score, orderId, mode:"LIVE",
              notes:`RSI reversal exit (${rsi3.toFixed(1)})` });
            delete positions[symbol]; savePositions(positions);
          } else {
            const openMins = pos.openedAt
              ? ((Date.now() - new Date(pos.openedAt).getTime()) / 60000).toFixed(0)
              : "?";
            console.log(`  Holding ${openMins}m | $${price.toFixed(4)} | RSI(3) ${rsi3?rsi3.toFixed(1):"N/A"} | SL $${pos.slPrice} | TP $${pos.tpPrice}`);
          }
        }
        } // close else { const posAmt...
      }
    } catch (err) { console.log(`  Error on ${symbol}: ${err.message}`); }
    await new Promise(r => setTimeout(r, 300));
  }
}

// ─── Entry Analysis ───────────────────────────────────────────────────────────

// Daily PnL circuit breaker — pause new entries if today's net loss exceeds threshold
function dailyPnLLoss() {
  if (!existsSync(CSV_FILE)) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const rows  = readFileSync(CSV_FILE, "utf8").trim().split("\n").slice(1);
  return rows
    .filter(r => r.startsWith(today))
    .map(r => r.split(","))
    .filter(c => c[14] === "LIVE")
    .reduce((sum, c) => sum + (parseFloat(c[11]) || 0), 0); // Net column
}

async function analyzeSymbol(symbol, timeframe, log) {
  const positions = loadPositions();
  if (positions[symbol]) { console.log(`  ${symbol}: position already open — skip`); return null; }
  if (Object.keys(positions).length >= CONFIG.maxConcurrent) {
    console.log(`  ${symbol}: max concurrent (${CONFIG.maxConcurrent}) reached — skip`);
    return null;
  }
  // Circuit breaker: stop trading after $5 net loss in a day (~ 30% of $15 trade size)
  const todayNet = dailyPnLLoss();
  if (todayNet < -5) {
    console.log(`  ${symbol}: DAILY DRAWDOWN STOP — net $${todayNet.toFixed(2)} — pause new entries`);
    return null;
  }

  console.log(`\n===== ${symbol} =====`);

  const candles    = await fetchCandles(symbol, timeframe, 200);
  const closes     = candles.map(c => c.close);
  const price      = closes[closes.length - 1];
  const ema9       = calcEMA(closes, 9);
  const ema21      = calcEMA(closes, 21);
  const ema50      = calcEMA(closes, 50);
  const vwap       = calcVWAP(candles);
  const rsi3       = calcRSI(closes, 3);
  const rsi14      = calcRSI(closes, 14);
  const atr        = calcATR(candles, 14);
  const avgVol     = calcAvgVolume(candles, 20);
  const currentVol = candles[candles.length - 2].volume; // last CLOSED candle (not the live incomplete one)

  // Higher timeframes — bail out gracefully if any fetch fails (rate limit, network)
  let htfBullish, mtfBullish, m15Bullish;
  try {
    const htfCandles = await fetchCandles(symbol, "1H", 50);
    const mtfCandles = await fetchCandles(symbol, "5m", 60);
    const m15Candles = await fetchCandles(symbol, "15m", 50);
    if (htfCandles.length < 22 || mtfCandles.length < 22 || m15Candles.length < 22) {
      console.log(`  Not enough HTF data (1H:${htfCandles.length} 5m:${mtfCandles.length} 15m:${m15Candles.length})`);
      return null;
    }
    htfBullish = calcEMA(htfCandles.map(c => c.close), 9) > calcEMA(htfCandles.map(c => c.close), 21);
    mtfBullish = calcEMA(mtfCandles.map(c => c.close), 9) > calcEMA(mtfCandles.map(c => c.close), 21);
    m15Bullish = calcEMA(m15Candles.map(c => c.close), 9) > calcEMA(m15Candles.map(c => c.close), 21);
  } catch (err) {
    console.log(`  HTF fetch failed: ${err.message} — skip`);
    return null;
  }

  // Funding rate — macro crowding filter
  const funding = await fetchFundingRate(symbol);
  const fundingPct = (funding * 100).toFixed(4);

  console.log(`  Price $${price.toFixed(4)} | EMA9 $${ema9.toFixed(4)} | EMA21 $${ema21.toFixed(4)} | EMA50 $${ema50.toFixed(4)}`);
  console.log(`  VWAP $${vwap?vwap.toFixed(4):"N/A"} | RSI(3) ${rsi3?rsi3.toFixed(1):"N/A"} | RSI(14) ${rsi14?rsi14.toFixed(1):"N/A"} | Vol ${(currentVol/avgVol).toFixed(2)}x avg | Funding ${funding>=0?"+":""}${fundingPct}%`);
  console.log(`  1H: ${htfBullish?"BULL":"BEAR"} | 15m: ${m15Bullish?"BULL":"BEAR"} | 5m: ${mtfBullish?"BULL":"BEAR"}`);

  if (!vwap || rsi3 === null || rsi14 === null) { console.log(`  Not enough data.`); return null; }

  // Run 11 experts (always — data for learning even if base check fails)
  const { experts, longScore, shortScore } = await evaluateExperts(candles, symbol);

  const { results, allPass, bullish, bearish } = runSafetyCheck(price, ema9, ema21, vwap, rsi3, rsi14, currentVol, avgVol, htfBullish, candles, mtfBullish);
  const side = bullish ? "BUY" : "SELL";

  // LIVE MOMENTUM CHECK — top trader rule: don't fight the actual short-term price action
  const mom10 = recentMomentumPct(closes, 10);  // last 10 minutes
  const mom5  = recentMomentumPct(closes, 5);   // last 5 minutes
  const momTag = `${mom10>=0?"+":""}${(mom10*100).toFixed(2)}% (10m) / ${mom5>=0?"+":""}${(mom5*100).toFixed(2)}% (5m)`;
  console.log(`  Price momentum: ${momTag}`);

  const logEntry = {
    timestamp: new Date().toISOString(), symbol, timeframe, price,
    indicators: { ema9, ema21, ema50, vwap, rsi3, rsi14, atr, volumeRatio:+(currentVol/avgVol).toFixed(2) },
    conditions: results, allPass, orderPlaced:false, orderId:null, paperTrading:CONFIG.paperTrading,
  };

  console.log("\n-- Decision --");

  if (!allPass) {
    const failed = results.filter(r => !r.pass).map(r => r.label);
    console.log(`\n  BLOCKED: ${failed.join(" | ")}`);
    return logEntry;
  }

  // HARD BLOCK: don't trade against live momentum (top trader anti-counter-trend rule)
  if (bullish && (mom10 < -0.004 || mom5 < -0.003)) {
    console.log(`\n  MOMENTUM VETO: price falling (${momTag}) — won't buy a falling knife`);
    return logEntry;
  }
  if (bearish && (mom10 > 0.004 || mom5 > 0.003)) {
    console.log(`\n  MOMENTUM VETO: price rising (${momTag}) — won't short a rally`);
    return logEntry;
  }

  // MULTI-TIMEFRAME ALIGNMENT — require at least 2 of (1H, 15m, 5m) to agree with trade
  const tfAgree = [htfBullish, m15Bullish, mtfBullish].filter(x => x === bullish).length;
  if (tfAgree < 2) {
    console.log(`\n  TF VETO: only ${tfAgree}/3 timeframes agree (need 2+) — chop zone`);
    return logEntry;
  }

  // Funding rate veto: block trading against overcrowded side
  if (bullish && funding >  0.0005) {
    console.log(`\n  FUNDING VETO: ${funding>=0?"+":""}${fundingPct}% — longs overcrowded, skip LONG`);
    return logEntry;
  }
  if (bearish && funding < -0.0005) {
    console.log(`\n  FUNDING VETO: ${fundingPct}% — shorts overcrowded, skip SHORT`);
    return logEntry;
  }

  // Expert veto: block if experts disagree or have no conviction in trade direction
  const expFor = bullish ? longScore  : shortScore;
  const expAgn = bullish ? shortScore : longScore;
  if (expFor < 0.15) {
    console.log(`\n  EXPERT VETO: low conviction (${(expFor*100).toFixed(1)}% < 15% required)`);
    return logEntry;
  }
  if (expAgn > expFor + 0.15) {
    console.log(`\n  EXPERT VETO: opposite consensus ${(expAgn*100).toFixed(0)}% vs ${(expFor*100).toFixed(0)}%`);
    return logEntry;
  }

  const { score, capped, size, bonuses } = calcConfluenceScore(
    price, rsi3, ema50, currentVol, avgVol, bullish, longScore, shortScore, atr
  );

  console.log(`\n  ALL CONDITIONS PASS`);
  console.log(`  Confluence score: ${score} (capped ${capped}/3) | Size: $${size}`);
  if (bonuses.length) console.log(`  Bonuses: ${bonuses.join(", ")}`);

  if (CONFIG.paperTrading) {
    const qty = (size / price).toFixed(QTY_PRECISION[symbol] ?? 3);
    const sl  = (price * (1 + (bullish?-1:1) * CONFIG.slPct/100)).toFixed(2);
    const tp  = (price * (1 + (bullish?1:-1)  * CONFIG.tpPct/100)).toFixed(2);
    logEntry.orderPlaced = true;
    logEntry.orderId     = `PAPER-${Date.now()}`;
    const pos = loadPositions();
    pos[symbol] = { side, entryPrice:price, quantity:qty, slPrice:sl, tpPrice:tp,
      slOrderId:null, tpOrderId:null, sizeUSD:size, score:capped,
      expertSignals:experts, openedAt:new Date().toISOString() };
    savePositions(pos);
    console.log(`  PAPER TRADE: ${side} ${symbol} | $${size} | qty ${qty} | SL $${sl} | TP $${tp}`);
    logCsv({ timestamp:logEntry.timestamp, symbol, side, quantity:qty,
      entryPrice:price, exitPrice:"", sizeUSD:size, pnl:"",
      fee:(size*0.0004).toFixed(4), net:"", score:capped,
      orderId:logEntry.orderId, mode:"PAPER",
      notes:`SL $${sl} | TP $${tp} | ${bonuses.join(", ")||"base signal"}` });
  } else {
    try {
      const order = await openFuturesPosition(symbol, side, size, price, atr);
      logEntry.orderPlaced = true;
      logEntry.orderId     = order.entryOrderId;
      const pos = loadPositions();
      pos[symbol] = { side, entryPrice:order.fillPrice, quantity:order.quantity,
        slPrice:order.slPrice, tpPrice:order.tpPrice,
        slOrderId:order.slOrderId, tpOrderId:order.tpOrderId,
        sizeUSD:size, score:capped, expertSignals:experts,
        openedAt:new Date().toISOString() };
      savePositions(pos);
      console.log(`  LIVE ORDER: ${order.entryOrderId} | Fill $${(+order.fillPrice).toFixed(4)}`);
      console.log(`  SL: ${order.slOrderId} @ $${order.slPrice} | TP: ${order.tpOrderId} @ $${order.tpPrice}`);
      logCsv({ timestamp:logEntry.timestamp, symbol, side, quantity:order.quantity,
        entryPrice:order.fillPrice, exitPrice:"", sizeUSD:size, pnl:"",
        fee:(size*0.0004).toFixed(4), net:"", score:capped,
        orderId:order.entryOrderId, mode:"LIVE",
        notes:`SL $${order.slPrice} | TP $${order.tpPrice} | score ${capped} | ${bonuses.join(", ")||"base"}` });
    } catch (err) {
      console.log(`  ORDER FAILED: ${err.message}`);
      logEntry.error = err.message;
    }
  }

  return logEntry;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let _initialized = false;

async function run() {
  if (!_initialized) {
    checkOnboarding();
    await checkFuturesAccess();
    initCsv();
    _initialized = true;
    const brain = loadBrain();
    console.log("===========================================");
    console.log(" Claude Bot — ML Expert System");
    console.log(` Mode: ${CONFIG.paperTrading ? "PAPER TRADING" : "LIVE TRADING"}`);
    console.log(` Size: $${CONFIG.minSize}–$${CONFIG.maxSize} | SL -${CONFIG.slPct}% | TP +${CONFIG.tpPct}% | ${CONFIG.leverage}x`);
    console.log(` Concurrent: max ${CONFIG.maxConcurrent} | Scan: ${CONFIG.scanInterval/1000}s`);
    console.log(` Brain: ${brain.totalTrades} trades across ${Object.keys(brain.symbols).length} symbol(s)`);
    console.log("===========================================\n");
  }

  const rules     = JSON.parse(readFileSync("rules.json", "utf8"));
  const watchlist = rules.watchlist || ["BTCUSDT"];
  const timeframe = CONFIG.timeframe || "1m";
  const log       = loadLog();

  console.log(`[${new Date().toISOString().slice(11,19)}] Scan — open: ${Object.keys(loadPositions()).length}/${CONFIG.maxConcurrent}`);

  await checkAndCloseExistingPositions();

  for (const symbol of watchlist) {
    try {
      const entry = await analyzeSymbol(symbol, timeframe, log);
      if (entry) { log.trades.push(entry); saveLog(log); }
    } catch (err) { console.log(`  Error ${symbol}: ${err.message}`); }
    await new Promise(r => setTimeout(r, 400));
  }

  const openPos   = Object.keys(loadPositions());
  const brainNow  = loadBrain();
  const todayWins = brainNow.winRate
    ? Object.values(brainNow.winRate).reduce((s,w) => s + w.wins, 0) : 0;
  const todayLoss = brainNow.winRate
    ? Object.values(brainNow.winRate).reduce((s,w) => s + w.losses, 0) : 0;
  console.log(`  Positions: [${openPos.join(", ")||"none"}] | Brain: ${brainNow.totalTrades} trades W${todayWins}/L${todayLoss}\n`);
}

async function runLoop() {
  while (true) {
    try { await run(); } catch (err) { console.error(`Loop error: ${err.message}`); }
    await new Promise(r => setTimeout(r, CONFIG.scanInterval));
  }
}

if (process.argv.includes("--tax-summary")) {
  if (!existsSync(CSV_FILE)) { console.log("No trades.csv."); process.exit(0); }
  const rows  = readFileSync(CSV_FILE,"utf8").trim().split("\n").slice(1).map(l => l.split(","));
  const live  = rows.filter(r => r[14]==="LIVE");
  const paper = rows.filter(r => r[14]==="PAPER");
  const vol   = live.reduce((s,r) => s+(+r[8]||0), 0);
  const pnl   = live.reduce((s,r) => s+(+r[9]||0), 0);
  const fees  = live.reduce((s,r) => s+(+r[10]||0), 0);
  console.log(`\nLIVE  : ${live.length} trades | Vol $${vol.toFixed(2)} | PnL $${pnl.toFixed(4)} | Fees $${fees.toFixed(4)}`);
  console.log(`PAPER : ${paper.length} trades\n`);
} else {
  runLoop().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
}
