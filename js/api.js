const PriceAPI = {
    BASE_URL: 'https://brapi.dev/api',
    _dividendsCache: {},

    async fetchQuotes(tickers, token) {
        if (!token || tickers.length === 0) return {};
        const results = {};
        try {
            const resp = await fetch(`${this.BASE_URL}/quote/${tickers.join(',')}?token=${token}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.results) {
                data.results.forEach(r => {
                    results[r.symbol.toUpperCase()] = r.regularMarketPrice;
                });
            }
        } catch (e) {
            console.error('Price fetch error:', e);
            for (const ticker of tickers) {
                try {
                    const r2 = await fetch(`${this.BASE_URL}/quote/${ticker}?token=${token}`);
                    const d2 = await r2.json();
                    if (d2.results?.[0]) {
                        results[d2.results[0].symbol.toUpperCase()] = d2.results[0].regularMarketPrice;
                    }
                } catch (e2) {}
            }
        }
        return results;
    },

    async fetchDividends(tickers, token) {
        if (!token || tickers.length === 0) return {};
        try {
            const url = `/api/dividends?tickers=${tickers.join(',')}&token=${encodeURIComponent(token)}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this._dividendsCache = data;
            this._saveDividendsToStorage();
            return data;
        } catch (e) {
            console.error('Dividend fetch error:', e);
            return {};
        }
    },

    _saveDividendsToStorage() {
        try {
            localStorage.setItem('brapi_dividends_cache', JSON.stringify({
                ts: Date.now(), divs: this._dividendsCache
            }));
        } catch (e) {}
    },

    loadDividendsFromStorage() {
        try {
            const raw = localStorage.getItem('brapi_dividends_cache');
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (Date.now() - (data.ts || 0) > 24 * 60 * 60 * 1000) return false;
            this._dividendsCache = data.divs || {};
            return Object.keys(this._dividendsCache).length > 0;
        } catch (e) { return false; }
    },

    getCachedDividends() {
        return this._dividendsCache;
    },

    async updateAllPrices(token) {
        const portfolio = await DB.getPortfolio();
        const tickers = Object.keys(portfolio).filter(t => portfolio[t].classe !== 'renda-fixa');
        if (tickers.length === 0) return {};
        const prices = await this.fetchQuotes(tickers, token);
        for (const [ticker, price] of Object.entries(prices)) {
            if (price > 0) await DB.updatePrice(ticker, price);
        }
        this.fetchDividends(tickers, token);
        return prices;
    }
};
