export const config = { maxDuration: 60 };

export default async function handler(req, res) {
    const { tickers, token } = req.query;
    if (!tickers || !token) {
        return res.status(400).json({ error: 'Missing tickers or token' });
    }

    const tickerList = tickers.split(',').slice(0, 30);
    const results = {};

    for (let i = 0; i < tickerList.length; i++) {
        const t = tickerList[i].trim();
        if (!t) continue;

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const url = `https://brapi.dev/api/quote/${t}?dividends=true&token=${token}`;
                const resp = await fetch(url);

                if (resp.status === 429) {
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }

                if (!resp.ok) break;

                const data = await resp.json();
                if (data.results?.[0]) {
                    const sym = (data.results[0].symbol || t).toUpperCase();
                    results[sym] = data.results[0].dividendsData?.cashDividends || [];
                }
                break;
            } catch (e) {
                if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (i < tickerList.length - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(results);
}
