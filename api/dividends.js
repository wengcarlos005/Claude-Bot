export default async function handler(req, res) {
    const { tickers, token } = req.query;
    if (!tickers || !token) {
        return res.status(400).json({ error: 'Missing tickers or token' });
    }

    const tickerList = tickers.split(',').slice(0, 30);
    const results = {};

    for (let i = 0; i < tickerList.length; i += 5) {
        const batch = tickerList.slice(i, i + 5);
        try {
            const url = `https://brapi.dev/api/quote/${batch.join(',')}?dividends=true&token=${token}`;
            const resp = await fetch(url);
            if (!resp.ok) {
                for (const t of batch) {
                    try {
                        const r2 = await fetch(`https://brapi.dev/api/quote/${t}?dividends=true&token=${token}`);
                        if (!r2.ok) continue;
                        const d2 = await r2.json();
                        if (d2.results?.[0]) {
                            const sym = (d2.results[0].symbol || t).toUpperCase();
                            results[sym] = d2.results[0].dividendsData?.cashDividends || [];
                        }
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, 300));
                }
                continue;
            }
            const data = await resp.json();
            if (data.results) {
                for (const r of data.results) {
                    const sym = (r.symbol || '').toUpperCase();
                    results[sym] = r.dividendsData?.cashDividends || [];
                }
            }
        } catch (e) {
            for (const t of batch) {
                try {
                    const r2 = await fetch(`https://brapi.dev/api/quote/${t}?dividends=true&token=${token}`);
                    if (!r2.ok) continue;
                    const d2 = await r2.json();
                    if (d2.results?.[0]) {
                        const sym = (d2.results[0].symbol || t).toUpperCase();
                        results[sym] = d2.results[0].dividendsData?.cashDividends || [];
                    }
                } catch (e2) {}
                await new Promise(r => setTimeout(r, 300));
            }
        }
        if (i + 5 < tickerList.length) await new Promise(r => setTimeout(r, 500));
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(results);
}
