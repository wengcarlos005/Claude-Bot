const PriceAPI = {
    BASE_URL: 'https://brapi.dev/api',
    _dividendsCache: {},

    async fetchQuotes(tickers, token) {
        if (!token || tickers.length === 0) return {};
        const results = {};
        try {
            const url = `${this.BASE_URL}/quote/${tickers.join(',')}?dividends=true&token=${token}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.results) {
                for (const r of data.results) {
                    const sym = r.symbol.toUpperCase();
                    results[sym] = r.regularMarketPrice;
                    this._dividendsCache[sym] = r.dividendsData?.cashDividends || [];
                }
            }
        } catch (e) {
            console.error('Quote+dividend fetch error:', e);
        }
        this._saveDividendsToStorage();
        return results;
    },

    _saveDividendsToStorage() {
        try {
            const data = { ts: Date.now(), divs: this._dividendsCache };
            localStorage.setItem('brapi_dividends_cache', JSON.stringify(data));
        } catch (e) {}
    },

    loadDividendsFromStorage() {
        try {
            const raw = localStorage.getItem('brapi_dividends_cache');
            if (!raw) return false;
            const data = JSON.parse(raw);
            const age = Date.now() - (data.ts || 0);
            if (age > 24 * 60 * 60 * 1000) return false;
            this._dividendsCache = data.divs || {};
            return Object.keys(this._dividendsCache).length > 0;
        } catch (e) { return false; }
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
        const prices = await this.fetchQuotes(tickers, token);
        for (const [ticker, price] of Object.entries(prices)) {
            if (price > 0) await DB.updatePrice(ticker, price);
        }
        return prices;
    }
};
