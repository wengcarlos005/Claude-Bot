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

    async fetchDividends(ticker, token) {
        if (!token) return [];
        try {
            const url = `${this.BASE_URL}/quote/${ticker}?modules=dividendsData&token=${token}`;
            const resp = await fetch(url);
            const data = await resp.json();
            console.log('[brapi] dividends raw', ticker, JSON.stringify(data).slice(0, 500));
            const divs = data.results?.[0]?.dividendsData?.cashDividends || [];
            return divs;
        } catch (e) {
            console.error('Dividend fetch error:', ticker, e);
            return [];
        }
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
