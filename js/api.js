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
                }
            } catch (e) {
                console.error('Price fetch error:', e);
            }
        }
        return results;
    },

    async fetchDividends(ticker, token) {
        if (!token) return [];
        try {
            const resp = await fetch(`${this.BASE_URL}/quote/${ticker}?modules=dividendsData&token=${token}`);
            const data = await resp.json();
            return data.results?.[0]?.dividendsData?.cashDividends || [];
        } catch (e) {
            console.error('Dividend fetch error:', e);
            return [];
        }
    },

    async updateAllPrices(token) {
        const portfolio = await DB.getPortfolio();
        const tickers = Object.keys(portfolio);
        if (tickers.length === 0) return {};
        const prices = await this.fetchQuotes(tickers, token);
        for (const [ticker, price] of Object.entries(prices)) {
            if (price > 0) await DB.updatePrice(ticker, price);
        }
        return prices;
    }
};
