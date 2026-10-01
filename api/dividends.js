export const config = { maxDuration: 60 };

export default async function handler(req, res) {
    const { tickers, token, debug } = req.query;
    if (!tickers || !token) {
        return res.status(400).json({ error: 'Missing tickers or token' });
    }

    const tickerList = tickers.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    const results = {};
    const log = [];

    for (let i = 0; i < tickerList.length; i++) {
        const t = tickerList[i];
        let status = 'pending';

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const url = `https://brapi.dev/api/quote/${t}?dividends=true&token=${token}`;
                const resp = await fetch(url);

                if (resp.status === 429) {
                    status = `429-attempt${attempt}`;
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }

                if (!resp.ok) {
                    status = `http-${resp.status}`;
                    break;
                }

                const data = await resp.json();
                if (data.results?.[0]) {
                    const r = data.results[0];
                    const sym = (r.symbol || t).toUpperCase();
                    const dividends = r.dividendsData?.cashDividends || [];
                    results[sym] = dividends;
                    status = `ok:${dividends.length}divs`;
                } else {
                    status = 'empty-results';
                }
                break;
            } catch (e) {
                status = `error:${e.message}`;
                if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
            }
        }

        log.push({ ticker: t, status });

        if (i < tickerList.length - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    const response = debug === '1' ? { ...results, _debug: log } : results;

    res.setHeader('Cache-Control', debug === '1' ? 'no-cache' : 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(response);
}
