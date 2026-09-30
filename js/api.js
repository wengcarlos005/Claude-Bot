const PriceAPI = {
    BASE_URL: 'https://brapi.dev/api',
    _dividendsCache: {},

    async fetchQuotes(tickers, token, { includeDividends = false } = {}) {
        if (!token || tickers.length === 0) return {};
        const results = {};
        const batchSize = includeDividends ? 5 : 20;
        for (let i = 0; i < tickers.length; i += batchSize) {
            const batch = tickers.slice(i, i + batchSize);
            const divParam = includeDividends ? '&dividends=true' : '';
            try {
                const resp = await fetch(`${this.BASE_URL}/quote/${batch.join(',')}?token=${token}${divParam}`);
                const data = await resp.json();
                if (data.results) {
                    data.results.forEach(r => {
                        const sym = r.symbol.toUpperCase();
                        results[sym] = r.regularMarketPrice;
                        if (includeDividends) {
                            this._dividendsCache[sym] = r.dividendsData?.cashDividends || [];
                        }
                    });
                } else if (batch.length > 1) {
                    for (const ticker of batch) {
                        try {
                            const r2 = await fetch(`${this.BASE_URL}/quote/${ticker}?token=${token}${divParam}`);
                            const d2 = await r2.json();
                            if (d2.results && d2.results[0]) {
                                const sym = d2.results[0].symbol.toUpperCase();
                                results[sym] = d2.results[0].regularMarketPrice;
                                if (includeDividends) {
                                    this._dividendsCache[sym] = d2.results[0].dividendsData?.cashDividends || [];
                                }
                            }
                        } catch (e2) {}
                    }
                }
            } catch (e) {
                console.error('Price fetch error:', e);
                for (const ticker of batch) {
                    try {
                        const r2 = await fetch(`${this.BASE_URL}/quote/${ticker}?token=${token}${divParam}`);
                        const d2 = await r2.json();
                        if (d2.results && d2.results[0]) {
                            const sym = d2.results[0].symbol.toUpperCase();
                            results[sym] = d2.results[0].regularMarketPrice;
                            if (includeDividends) {
                                this._dividendsCache[sym] = d2.results[0].dividendsData?.cashDividends || [];
                            }
                        }
                    } catch (e2) {}
                }
            }
            if (includeDividends && i + batchSize < tickers.length) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        return results;
    },

    getCachedDividends() {
        return this._dividendsCache;
    },

    async updateAllPrices(token) {
        const portfolio = await DB.getPortfolio();
        const tickers = Object.keys(portfolio).filter(t => {
            const p = portfolio[t];
            return p.classe !== 'renda-fixa';
        });
        if (tickers.length === 0) return {};
        const prices = await this.fetchQuotes(tickers, token, { includeDividends: true });
        for (const [ticker, price] of Object.entries(prices)) {
            if (price > 0) await DB.updatePrice(ticker, price);
        }
        return prices;
    }
};
