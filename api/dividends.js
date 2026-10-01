export const config = { maxDuration: 60 };

const BUDGET_MS = 7500;
const BRAPI_SPACING_MS = 300;
const MAX_TICKERS = 30;

// Yahoo publishes the ex-dividend date, not the payment date, so it maps to
// "data base". brapi carries both plus the JCP/dividend label, which is why it
// still runs as an upgrade pass where the plan allows it.
async function fetchYahoo(ticker) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA`
        + '?interval=1d&range=5y&events=div';
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return null;

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    return Object.values(result.events?.dividends || {})
        .filter(d => d && d.amount > 0)
        .map(d => ({
            lastDatePrior: new Date(d.date * 1000).toISOString().slice(0, 10),
            rate: d.amount,
            label: 'Provento',
            source: 'yahoo',
        }))
        .sort((a, b) => a.lastDatePrior.localeCompare(b.lastDatePrior));
}

async function fetchBrapi(ticker, token) {
    const url = `https://brapi.dev/api/quote/${ticker}?dividends=true&token=${token}`;
    const resp = await fetch(url);
    if (!resp.ok) return { paywalled: resp.status === 403, dividends: null };

    const data = await resp.json();
    const cash = data.results?.[0]?.dividendsData?.cashDividends;
    if (!Array.isArray(cash) || cash.length === 0) return { paywalled: false, dividends: null };

    return { paywalled: false, dividends: cash.map(d => ({ ...d, source: 'brapi' })) };
}

export default async function handler(req, res) {
    const { tickers, token } = req.query;
    if (!tickers) {
        return res.status(400).json({ error: 'Missing tickers' });
    }

    const deadline = Date.now() + BUDGET_MS;
    const tickerList = tickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, MAX_TICKERS);

    const results = {};
    const status = {};

    // Yahoo carries every asset class, answers in parallel and does not rate
    // limit, so it establishes the baseline before anything slower runs.
    await Promise.all(tickerList.map(async (ticker) => {
        try {
            const dividends = await fetchYahoo(ticker);
            if (dividends && dividends.length > 0) {
                results[ticker] = dividends;
                status[ticker] = `yahoo:${dividends.length}`;
            } else {
                status[ticker] = 'sem-dados';
            }
        } catch (e) {
            status[ticker] = 'erro-yahoo';
        }
    }));

    // brapi only upgrades what it can within the budget; whatever it cannot
    // reach keeps the Yahoo data, so this pass can never make things worse.
    if (token) {
        for (const ticker of tickerList) {
            if (Date.now() >= deadline) break;
            try {
                const { paywalled, dividends } = await fetchBrapi(ticker, token);
                if (dividends) {
                    results[ticker] = dividends;
                    status[ticker] = `brapi:${dividends.length}`;
                } else if (paywalled && !results[ticker]) {
                    status[ticker] = 'plano-pago';
                }
            } catch (e) {
                // Yahoo's result stands.
            }
            if (Date.now() + BRAPI_SPACING_MS < deadline) {
                await new Promise(r => setTimeout(r, BRAPI_SPACING_MS));
            }
        }
    }

    const checked = tickerList.every(t => status[t] && !status[t].startsWith('erro'));
    res.setHeader('Cache-Control', checked
        ? 's-maxage=86400, stale-while-revalidate=3600'
        : 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
        ...results,
        _status: tickerList.map(t => ({ ticker: t, status: status[t] || 'desconhecido' })),
    });
}
