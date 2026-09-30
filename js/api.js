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
        for (let i = 0; i < tickers.length; i++) {
            const ticker = tickers[i];
            try {
                const url = `${this.BASE_URL}/quote/${encodeURIComponent(ticker)}?dividends=true&token=${token}`;
                const resp = await fetch(url);
                if (!resp.ok) {
                    console.warn('[brapi] HTTP', resp.status, 'for', ticker);
                    continue;
                }
                const data = await resp.json();
                if (data.results && data.results[0]) {
                    const sym = (data.results[0].symbol || ticker).toUpperCase();
                    const divs = data.results[0].dividendsData?.cashDividends || [];
                    results[sym] = divs;
                    console.log('[brapi]', ticker, '->', sym, divs.length, 'dividends');
                } else {
                    console.warn('[brapi] no results for', ticker, data);
                }
            } catch (e) {
                console.error('[brapi] error for', ticker, e.message);
            }
            if (i < tickers.length - 1) await new Promise(r => setTimeout(r, 600));
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
