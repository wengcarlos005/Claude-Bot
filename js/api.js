const PriceAPI = {
    _dividendsCache: {},
    _dividendStatus: {},
    _dividendsInFlight: null,
    _dividendsProgressListeners: [],

    DIV_STORAGE_KEY: 'brapi_dividends_v1',
    DIV_TTL_MS: 24 * 60 * 60 * 1000,
    DIV_BATCH_SIZE: 15,
    DIV_BATCH_DELAY_MS: 400,

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

    // Synchronous: fills the cache from localStorage so a view can render
    // immediately. Returns the tickers that still need a network fetch.
    primeFromStorage(tickers) {
        const store = this._loadDividendStore();
        const now = Date.now();
        const missing = [];

        for (const ticker of tickers) {
            const entry = store[ticker];
            if (entry && Array.isArray(entry.divs) && (now - entry.ts) < this.DIV_TTL_MS) {
                this._dividendsCache[ticker] = entry.divs;
                if (!this._dividendStatus[ticker]) this._dividendStatus[ticker] = 'cache';
            } else {
                missing.push(ticker);
            }
        }
        return missing;
    },

    getDividendStatus() {
        return this._dividendStatus;
    },

    async _runDividendFetch(tickers, token) {
        const missing = this.primeFromStorage(tickers);
        const store = this._loadDividendStore();

        this._emitDividendProgress();
        if (missing.length === 0) return this._dividendsCache;

        for (let i = 0; i < missing.length; i += this.DIV_BATCH_SIZE) {
            const batch = missing.slice(i, i + this.DIV_BATCH_SIZE);
            try {
                const url = `/api/dividends?tickers=${batch.join(',')}&token=${encodeURIComponent(token)}&_v=7`;
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    for (const [symbol, divs] of Object.entries(data)) {
                        if (symbol.startsWith('_') || !Array.isArray(divs)) continue;
                        this._dividendsCache[symbol] = divs;
                        store[symbol] = { ts: Date.now(), divs };
                    }
                    // Cache the misses too, so an asset no source carries is not
                    // looked up again on every page load.
                    for (const entry of (data._status || [])) {
                        this._dividendStatus[entry.ticker] = entry.status;
                        if (!store[entry.ticker] && !entry.status.startsWith('erro')) {
                            store[entry.ticker] = { ts: Date.now(), divs: [] };
                            this._dividendsCache[entry.ticker] = [];
                        }
                    }
                    this._saveDividendStore(store);
                    this._emitDividendProgress();
                }
            } catch (e) {
                console.error('Dividend batch error:', e);
                for (const ticker of batch) this._dividendStatus[ticker] = 'erro-rede';
            }

            if (i + this.DIV_BATCH_SIZE < missing.length) {
                await new Promise(r => setTimeout(r, this.DIV_BATCH_DELAY_MS));
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
