const PriceAPI = {
    BASE_URL: 'https://brapi.dev/api',

    async fetchQuotes(tickers, token) {
        if (!token || tickers.length === 0) return {};
        const results = {};
        for (let i = 0; i < tickers.length; i += 20) {
            const batch = tickers.slice(i, i + 20);
            try {
                const resp = await fetch(`${this.BASE_URL}/quote/${batch.join(',')}?token=${token}`);
                const data = await resp.json();
                if (data.results) {
                    data.results.forEach(r => {
                        results[r.symbol.toUpperCase()] = r.regularMarketPrice;
                    });
                } else if (batch.length > 1) {
                    for (const ticker of batch) {
                        try {
                            const r2 = await fetch(`${this.BASE_URL}/quote/${ticker}?token=${token}`);
                            const d2 = await r2.json();
                            if (d2.results && d2.results[0]) {
                                results[d2.results[0].symbol.toUpperCase()] = d2.results[0].regularMarketPrice;
                            }
                        } catch (e2) {}
                    }
                }
            } catch (e) {
                console.error('Price fetch error:', e);
                for (const ticker of batch) {
                    try {
                        const r2 = await fetch(`${this.BASE_URL}/quote/${ticker}?token=${token}`);
                        const d2 = await r2.json();
                        if (d2.results && d2.results[0]) {
                            results[d2.results[0].symbol.toUpperCase()] = d2.results[0].regularMarketPrice;
                        }
                    } catch (e2) {}
                }
            }
        }
        return results;
    },

    async fetchDividendsBatch(tickers, token) {
        if (!token || tickers.length === 0) return {};
        console.log('[brapi] fetching dividends for:', tickers);
        const results = {};

        for (let i = 0; i < tickers.length; i += 5) {
            const batch = tickers.slice(i, i + 5);
            try {
                const url = `${this.BASE_URL}/quote/${batch.join(',')}?dividends=true&token=${token}`;
                const resp = await fetch(url);
                if (!resp.ok) {
                    console.warn('[brapi] batch HTTP', resp.status, 'for', batch);
                    continue;
                }
                const data = await resp.json();
                if (data.results) {
                    for (const r of data.results) {
                        const sym = (r.symbol || '').toUpperCase();
                        const divs = r.dividendsData?.cashDividends || [];
                        results[sym] = divs;
                        console.log('[brapi]', sym, divs.length, 'dividends');
                    }
                }
            } catch (e) {
                console.error('[brapi] batch error:', batch, e.message);
            }
            if (i + 5 < tickers.length) await new Promise(r => setTimeout(r, 1000));
        }

        const missing = tickers.filter(t => !(t.toUpperCase() in results));
        if (missing.length > 0) {
            console.log('[brapi] retrying individually:', missing);
            for (const ticker of missing) {
                try {
                    const resp = await fetch(`${this.BASE_URL}/quote/${encodeURIComponent(ticker)}?dividends=true&token=${token}`);
                    if (!resp.ok) { console.warn('[brapi] retry HTTP', resp.status, ticker); continue; }
                    const data = await resp.json();
                    if (data.results?.[0]) {
                        const sym = (data.results[0].symbol || ticker).toUpperCase();
                        results[sym] = data.results[0].dividendsData?.cashDividends || [];
                        console.log('[brapi] retry', sym, results[sym].length, 'dividends');
                    }
                } catch (e) { console.error('[brapi] retry error', ticker, e.message); }
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return results;
    },

    async updateAllPrices(token) {
        const portfolio = await DB.getPortfolio();
        const tickers = Object.keys(portfolio).filter(t => {
            const p = portfolio[t];
            return p.classe !== 'renda-fixa';
        });
        if (tickers.length === 0) return {};
        const prices = await this.fetchQuotes(tickers, token);
        for (const [ticker, price] of Object.entries(prices)) {
            if (price > 0) await DB.updatePrice(ticker, price);
        }
        return prices;
    }
};
