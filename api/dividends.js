export const config = { maxDuration: 60 };

// Stay well under Vercel's 10s default so the function always returns what it
// collected instead of being killed and losing the whole batch.
const BUDGET_MS = 7500;
const RETRY_WAIT_MS = 1500;
const BETWEEN_TICKERS_MS = 1200;
const MAX_TICKERS = 5;

export default async function handler(req, res) {
    const { tickers, token, debug } = req.query;
    if (!tickers || !token) {
        return res.status(400).json({ error: 'Missing tickers or token' });
    }

    const deadline = Date.now() + BUDGET_MS;
    const tickerList = tickers.split(',').map(t => t.trim()).filter(Boolean).slice(0, MAX_TICKERS);
    const results = {};
    const log = [];

    for (let i = 0; i < tickerList.length; i++) {
        const ticker = tickerList[i];

        if (Date.now() >= deadline) {
            log.push({ ticker, status: 'skipped-budget' });
            continue;
        }

        let status = 'pending';
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const url = `https://brapi.dev/api/quote/${ticker}?dividends=true&token=${token}`;
                const resp = await fetch(url);

                if (resp.status === 429) {
                    status = '429';
                    if (attempt === 0 && Date.now() + RETRY_WAIT_MS < deadline) {
                        await new Promise(r => setTimeout(r, RETRY_WAIT_MS));
                        continue;
                    }
                    break;
                }

                if (!resp.ok) {
                    status = `http-${resp.status}`;
                    break;
                }

                const data = await resp.json();
                if (data.results?.[0]) {
                    const result = data.results[0];
                    const symbol = (result.symbol || ticker).toUpperCase();
                    const dividends = result.dividendsData?.cashDividends || [];
                    results[symbol] = dividends;
                    status = `ok:${dividends.length}`;
                } else {
                    status = 'empty-results';
                }
                break;
            } catch (e) {
                status = `error:${e.message}`;
                break;
            }
        }

        log.push({ ticker, status });

        if (i < tickerList.length - 1 && Date.now() + BETWEEN_TICKERS_MS < deadline) {
            await new Promise(r => setTimeout(r, BETWEEN_TICKERS_MS));
        }
    }

    // A partial response must not sit in the CDN for a day, or the tickers that
    // failed would keep being served as missing.
    const complete = Object.keys(results).length === tickerList.length;
    const cacheControl = complete
        ? 's-maxage=86400, stale-while-revalidate=3600'
        : 'no-store';

    res.setHeader('Cache-Control', debug === '1' ? 'no-store' : cacheControl);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(debug === '1' ? { ...results, _debug: log } : results);
}
