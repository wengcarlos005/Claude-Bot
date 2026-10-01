const PriceAPI = {
    _dividendsCache: {},

    async fetchQuotes(tickers, token) {
        if (!token || tickers.length === 0) return {};
        try {
            const url = `/api/quotes?tickers=${tickers.join(',')}&token=${encodeURIComponent(token)}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (e) {
            console.error('Price fetch error:', e);
            return {};
        }
    },

    async fetchDividends(tickers, token) {
        if (!token || tickers.length === 0) return {};
        const batchSize = 3;
        const allData = {};

        for (let i = 0; i < tickers.length; i += batchSize) {
            const batch = tickers.slice(i, i + batchSize);
            try {
                const url = `/api/dividends?tickers=${batch.join(',')}&token=${encodeURIComponent(token)}&_v=5`;
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    Object.assign(allData, data);
                }
            } catch (e) {
                console.error('Dividend batch error:', e);
            }
            if (i + batchSize < tickers.length) {
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        this._dividendsCache = allData;
        return allData;
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
