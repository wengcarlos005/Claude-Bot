const Store = {
    KEYS: {
        TRANSACTIONS: 'investtracker_transactions',
        PROVENTOS: 'investtracker_proventos',
        WATCHLIST: 'investtracker_watchlist',
        PRICES: 'investtracker_prices',
        CDI_RATE: 'investtracker_cdi',
        THEME: 'investtracker_theme',
        SNAPSHOTS: 'investtracker_snapshots',
    },

    _read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },

    _write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },

    getTransactions() { return this._read(this.KEYS.TRANSACTIONS, []); },
    setTransactions(data) { this._write(this.KEYS.TRANSACTIONS, data); },

    getProventos() { return this._read(this.KEYS.PROVENTOS, []); },
    setProventos(data) { this._write(this.KEYS.PROVENTOS, data); },

    getWatchlist() { return this._read(this.KEYS.WATCHLIST, []); },
    setWatchlist(data) { this._write(this.KEYS.WATCHLIST, data); },

    getPrices() { return this._read(this.KEYS.PRICES, {}); },
    setPrices(data) { this._write(this.KEYS.PRICES, data); },

    getCdiRate() { return this._read(this.KEYS.CDI_RATE, 13.15); },
    setCdiRate(rate) { this._write(this.KEYS.CDI_RATE, rate); },

    getTheme() { return this._read(this.KEYS.THEME, 'dark'); },
    setTheme(theme) { this._write(this.KEYS.THEME, theme); },

    getSnapshots() { return this._read(this.KEYS.SNAPSHOTS, []); },
    setSnapshots(data) { this._write(this.KEYS.SNAPSHOTS, data); },

    addTransaction(tx) {
        tx.id = tx.id || this._uid();
        const list = this.getTransactions();
        list.push(tx);
        list.sort((a, b) => b.date.localeCompare(a.date));
        this.setTransactions(list);
        this._updatePriceFromTx(tx);
        this._takeSnapshot();
        return tx;
    },

    updateTransaction(id, data) {
        let list = this.getTransactions();
        const idx = list.findIndex(t => t.id === id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...data, id };
            list.sort((a, b) => b.date.localeCompare(a.date));
            this.setTransactions(list);
            this._takeSnapshot();
        }
    },

    deleteTransaction(id) {
        let list = this.getTransactions().filter(t => t.id !== id);
        this.setTransactions(list);
        this._takeSnapshot();
    },

    addProvento(p) {
        p.id = p.id || this._uid();
        const list = this.getProventos();
        list.push(p);
        list.sort((a, b) => b.date.localeCompare(a.date));
        this.setProventos(list);
        return p;
    },

    updateProvento(id, data) {
        let list = this.getProventos();
        const idx = list.findIndex(p => p.id === id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...data, id };
            list.sort((a, b) => b.date.localeCompare(a.date));
            this.setProventos(list);
        }
    },

    deleteProvento(id) {
        this.setProventos(this.getProventos().filter(p => p.id !== id));
    },

    addWatchItem(item) {
        item.id = item.id || this._uid();
        const list = this.getWatchlist();
        list.push(item);
        this.setWatchlist(list);
        return item;
    },

    deleteWatchItem(id) {
        this.setWatchlist(this.getWatchlist().filter(w => w.id !== id));
    },

    updateWatchItem(id, data) {
        let list = this.getWatchlist();
        const idx = list.findIndex(w => w.id === id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...data, id };
            this.setWatchlist(list);
        }
    },

    updatePrice(ticker, price) {
        const prices = this.getPrices();
        prices[ticker.toUpperCase()] = price;
        this.setPrices(prices);
    },

    getPortfolio() {
        const transactions = this.getTransactions();
        const prices = this.getPrices();
        const holdings = {};

        for (const tx of transactions) {
            const key = tx.ticker.toUpperCase();
            if (!holdings[key]) {
                holdings[key] = {
                    ticker: key,
                    classe: tx.classe,
                    setor: tx.setor || 'outros',
                    qtd: 0,
                    totalInvested: 0,
                    avgPrice: 0,
                };
            }
            const h = holdings[key];
            h.classe = tx.classe;
            h.setor = tx.setor || h.setor;

            if (tx.operacao === 'compra') {
                const cost = tx.qtd * tx.preco + (tx.taxas || 0);
                h.totalInvested += cost;
                h.qtd += tx.qtd;
            } else {
                if (h.qtd > 0) {
                    const ratio = Math.min(tx.qtd / h.qtd, 1);
                    h.totalInvested -= h.totalInvested * ratio;
                }
                h.qtd -= tx.qtd;
            }

            if (h.qtd > 0) {
                h.avgPrice = h.totalInvested / h.qtd;
            } else {
                h.avgPrice = 0;
                h.totalInvested = 0;
                h.qtd = Math.max(0, h.qtd);
            }
        }

        const active = {};
        for (const [k, h] of Object.entries(holdings)) {
            if (h.qtd > 0.000001) {
                h.currentPrice = prices[k] || h.avgPrice;
                h.currentValue = h.qtd * h.currentPrice;
                h.profit = h.currentValue - h.totalInvested;
                h.profitPct = h.totalInvested > 0 ? (h.profit / h.totalInvested) * 100 : 0;
                active[k] = h;
            }
        }
        return active;
    },

    getTotalInvested() {
        const p = this.getPortfolio();
        return Object.values(p).reduce((s, h) => s + h.totalInvested, 0);
    },

    getTotalValue() {
        const p = this.getPortfolio();
        return Object.values(p).reduce((s, h) => s + h.currentValue, 0);
    },

    exportData() {
        return {
            version: 1,
            exportDate: new Date().toISOString(),
            transactions: this.getTransactions(),
            proventos: this.getProventos(),
            watchlist: this.getWatchlist(),
            prices: this.getPrices(),
            cdiRate: this.getCdiRate(),
            snapshots: this.getSnapshots(),
        };
    },

    importData(data) {
        if (data.transactions) this.setTransactions(data.transactions);
        if (data.proventos) this.setProventos(data.proventos);
        if (data.watchlist) this.setWatchlist(data.watchlist);
        if (data.prices) this.setPrices(data.prices);
        if (data.cdiRate) this.setCdiRate(data.cdiRate);
        if (data.snapshots) this.setSnapshots(data.snapshots);
    },

    _updatePriceFromTx(tx) {
        if (tx.precoAtual && tx.precoAtual > 0) {
            this.updatePrice(tx.ticker, tx.precoAtual);
        }
    },

    _takeSnapshot() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const snapshots = this.getSnapshots();
        const totalValue = this.getTotalValue();
        const totalInvested = this.getTotalInvested();

        const existing = snapshots.findIndex(s => s.date === dateStr);
        const snap = { date: dateStr, value: totalValue, invested: totalInvested };

        if (existing >= 0) {
            snapshots[existing] = snap;
        } else {
            snapshots.push(snap);
            snapshots.sort((a, b) => a.date.localeCompare(b.date));
        }
        this.setSnapshots(snapshots);
    },

    _uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }
};
