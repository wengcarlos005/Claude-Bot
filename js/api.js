const PriceAPI = {
    _dividendsCache: {},
    _dividendsInFlight: null,
    _dividendsProgressListeners: [],

    DIV_STORAGE_KEY: 'brapi_dividends_v1',
    DIV_TTL_MS: 24 * 60 * 60 * 1000,
    DIV_BATCH_SIZE: 3,
    DIV_BATCH_DELAY_MS: 2500,
    DIV_MAX_BACKOFF_MS: 20000,

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

    _loadDividendStore() {
        try {
            const raw = localStorage.getItem(this.DIV_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch (e) {
            return {};
        }
    },

    _saveDividendStore(store) {
        try {
            localStorage.setItem(this.DIV_STORAGE_KEY, JSON.stringify(store));
        } catch (e) {
            console.warn('Could not persist dividends:', e);
        }
    },

    // Only one fetch sequence may run at a time. Concurrent callers share it,
    // otherwise they race each other into brapi's rate limit.
    fetchDividends(tickers, token, onProgress) {
        if (!token || tickers.length === 0) return Promise.resolve(this._dividendsCache);
        if (onProgress) this._dividendsProgressListeners.push(onProgress);
        if (this._dividendsInFlight) return this._dividendsInFlight;

        this._dividendsInFlight = this._runDividendFetch(tickers, token)
            .finally(() => {
                this._dividendsInFlight = null;
                this._dividendsProgressListeners = [];
            });
        return this._dividendsInFlight;
    },

    _emitDividendProgress() {
        for (const listener of this._dividendsProgressListeners) {
            try { listener(this._dividendsCache); } catch (e) { console.error(e); }
        }
    },

    async _runDividendFetch(tickers, token) {
        const store = this._loadDividendStore();
        const now = Date.now();
        const missing = [];

        for (const ticker of tickers) {
            const entry = store[ticker];
            if (entry && Array.isArray(entry.divs) && (now - entry.ts) < this.DIV_TTL_MS) {
                this._dividendsCache[ticker] = entry.divs;
            } else {
                missing.push(ticker);
            }
        }

        this._emitDividendProgress();
        if (missing.length === 0) return this._dividendsCache;

        let delay = this.DIV_BATCH_DELAY_MS;

        for (let i = 0; i < missing.length; i += this.DIV_BATCH_SIZE) {
            const batch = missing.slice(i, i + this.DIV_BATCH_SIZE);
            let received = 0;
            try {
                const url = `/api/dividends?tickers=${batch.join(',')}&token=${encodeURIComponent(token)}&_v=6`;
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    for (const [symbol, divs] of Object.entries(data)) {
                        if (symbol.startsWith('_') || !Array.isArray(divs)) continue;
                        this._dividendsCache[symbol] = divs;
                        store[symbol] = { ts: Date.now(), divs };
                        received++;
                    }
                    this._saveDividendStore(store);
                    this._emitDividendProgress();
                }
            } catch (e) {
                console.error('Dividend batch error:', e);
            }

            // An incomplete batch means brapi is throttling us, so ease off.
            delay = received === batch.length
                ? this.DIV_BATCH_DELAY_MS
                : Math.min(delay * 2, this.DIV_MAX_BACKOFF_MS);

            if (i + this.DIV_BATCH_SIZE < missing.length) {
                await new Promise(r => setTimeout(r, delay));
            }
        }

        return this._dividendsCache;
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
