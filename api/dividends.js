export default async function handler(req, res) {
    const { tickers, token } = req.query;
    if (!tickers || !token) {
        return res.status(400).json({ error: 'Missing tickers or token' });
    }

    const tickerList = tickers.split(',').slice(0, 30);
    const results = {};
    const concurrency = 3;

    for (let i = 0; i < tickerList.length; i += concurrency) {
        const batch = tickerList.slice(i, i + concurrency);
        const promises = batch.map(async (t) => {
            try {
                const url = `https://brapi.dev/api/quote/${t}?dividends=true&token=${token}`;
                const resp = await fetch(url);
                if (!resp.ok) {
                    if (resp.status === 429) {
                        await new Promise(r => setTimeout(r, 2000));
                        const retry = await fetch(url);
                        if (retry.ok) {
                            const d = await retry.json();
                            if (d.results?.[0]) {
                                const sym = (d.results[0].symbol || t).toUpperCase();
                                results[sym] = d.results[0].dividendsData?.cashDividends || [];
                            }
                        }
                    }
                    return;
                }
                const data = await resp.json();
                if (data.results?.[0]) {
                    const sym = (data.results[0].symbol || t).toUpperCase();
                    results[sym] = data.results[0].dividendsData?.cashDividends || [];
                }
            } catch (e) {}
        });
        await Promise.all(promises);
        if (i + concurrency < tickerList.length) await new Promise(r => setTimeout(r, 400));
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(results);
}
