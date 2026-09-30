const SUPABASE_URL = 'https://rkmndimsgqwjhsejpszl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_umPlxsx7GPFjc8ypzCwzHQ_cefg7L6t';

let supabase;
try {
    const lib = window.supabase;
    supabase = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.error('Supabase init error:', e);
}

const Auth = {
    user: null,

    async init() {
        if (!supabase) return null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                this.user = session.user;
                await this._ensureSettings();
            }
            supabase.auth.onAuthStateChange((_event, session) => {
                this.user = session?.user || null;
            });
        } catch (e) {
            console.error('Auth init error:', e);
        }
        return this.user;
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        this.user = data.user;
        await this._ensureSettings();
        return data;
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.user = data.user;
        await this._ensureSettings();
        return data;
    },

    async signOut() {
        await supabase.auth.signOut();
        this.user = null;
    },

    async _ensureSettings() {
        if (!this.user) return;
        try {
            const { data } = await supabase.from('user_settings').select().eq('user_id', this.user.id).single();
            if (!data) {
                await supabase.from('user_settings').insert({ user_id: this.user.id, cdi_rate: 13.15, theme: 'dark' });
            }
        } catch (e) {
            console.warn('Settings check failed (tables may not exist yet):', e);
        }
    },

    isLoggedIn() {
        return !!this.user;
    },

    getUserId() {
        return this.user?.id;
    },
};

const DB = {
    async getTransactions() {
        const { data } = await supabase
            .from('transactions')
            .select()
            .eq('user_id', Auth.getUserId())
            .order('date', { ascending: false });
        return (data || []).map(r => ({
            id: r.id, date: r.date, operacao: r.operacao, ticker: r.ticker,
            classe: r.classe, setor: r.setor, qtd: Number(r.qtd), preco: Number(r.preco),
            taxas: Number(r.taxas), precoAtual: Number(r.preco_atual),
        }));
    },

    async addTransaction(tx) {
        tx.id = tx.id || this._uid();
        const { error } = await supabase.from('transactions').insert({
            id: tx.id, user_id: Auth.getUserId(), date: tx.date, operacao: tx.operacao,
            ticker: tx.ticker, classe: tx.classe, setor: tx.setor || 'outros',
            qtd: tx.qtd, preco: tx.preco, taxas: tx.taxas || 0, preco_atual: tx.precoAtual || 0,
        });
        if (error) throw error;
        if (tx.precoAtual > 0 && tx.classe !== 'renda-fixa') await this.updatePrice(tx.ticker, tx.precoAtual);
        await this._takeSnapshot();
        return tx;
    },

    async updateTransaction(id, data) {
        const { error } = await supabase.from('transactions').update({
            date: data.date, operacao: data.operacao, ticker: data.ticker,
            classe: data.classe, setor: data.setor || 'outros', qtd: data.qtd,
            preco: data.preco, taxas: data.taxas || 0, preco_atual: data.precoAtual || 0,
        }).eq('id', id).eq('user_id', Auth.getUserId());
        if (error) throw error;
        await this._takeSnapshot();
    },

    async deleteTransaction(id) {
        await supabase.from('transactions').delete().eq('id', id).eq('user_id', Auth.getUserId());
        await this._takeSnapshot();
    },

    async getProventos() {
        const { data } = await supabase
            .from('proventos')
            .select()
            .eq('user_id', Auth.getUserId())
            .order('date', { ascending: false });
        return (data || []).map(r => ({
            id: r.id, date: r.date, ativo: r.ativo, tipo: r.tipo,
            valorCota: Number(r.valor_cota), qtd: Number(r.qtd), total: Number(r.total),
        }));
    },

    async addProvento(p) {
        p.id = p.id || this._uid();
        const { error } = await supabase.from('proventos').insert({
            id: p.id, user_id: Auth.getUserId(), date: p.date, ativo: p.ativo,
            tipo: p.tipo, valor_cota: p.valorCota, qtd: p.qtd, total: p.total,
        });
        if (error) throw error;
        return p;
    },

    async updateProvento(id, data) {
        await supabase.from('proventos').update({
            date: data.date, ativo: data.ativo, tipo: data.tipo,
            valor_cota: data.valorCota, qtd: data.qtd, total: data.total,
        }).eq('id', id).eq('user_id', Auth.getUserId());
    },

    async deleteProvento(id) {
        await supabase.from('proventos').delete().eq('id', id).eq('user_id', Auth.getUserId());
    },

    async getWatchlist() {
        const { data } = await supabase
            .from('watchlist')
            .select()
            .eq('user_id', Auth.getUserId());
        return (data || []).map(r => ({
            id: r.id, ticker: r.ticker, classe: r.classe,
            preco: Number(r.preco), alvo: r.alvo ? Number(r.alvo) : null, notas: r.notas || '',
        }));
    },

    async addWatchItem(item) {
        item.id = item.id || this._uid();
        await supabase.from('watchlist').insert({
            id: item.id, user_id: Auth.getUserId(), ticker: item.ticker,
            classe: item.classe, preco: item.preco, alvo: item.alvo, notas: item.notas || '',
        });
        return item;
    },

    async deleteWatchItem(id) {
        await supabase.from('watchlist').delete().eq('id', id).eq('user_id', Auth.getUserId());
    },

    async getPrices() {
        const { data } = await supabase
            .from('prices')
            .select()
            .eq('user_id', Auth.getUserId());
        const map = {};
        (data || []).forEach(r => { map[r.ticker.toUpperCase()] = Number(r.price); });
        return map;
    },

    async updatePrice(ticker, price) {
        const t = ticker.toUpperCase();
        await supabase.from('prices').upsert({
            user_id: Auth.getUserId(), ticker: t, price, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,ticker' });
    },

    async getSnapshots() {
        const { data } = await supabase
            .from('snapshots')
            .select()
            .eq('user_id', Auth.getUserId())
            .order('date', { ascending: true });
        return (data || []).map(r => ({
            date: r.date, value: Number(r.value), invested: Number(r.invested),
        }));
    },

    async getSettings() {
        const { data } = await supabase
            .from('user_settings')
            .select()
            .eq('user_id', Auth.getUserId())
            .single();
        return data || { cdi_rate: 13.15, theme: 'dark' };
    },

    async updateSettings(settings) {
        await supabase.from('user_settings').update(settings).eq('user_id', Auth.getUserId());
    },

    _calcRendaFixa(principal, cdiPct, purchaseDate, cdiRate) {
        const rate = (cdiRate || 13.15) / 100;
        const pct = (cdiPct || 100) / 100;
        const effectiveRate = rate * pct;
        const start = new Date(purchaseDate);
        const now = new Date();
        const daysDiff = (now - start) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 0) return principal;
        const bizDays = Math.floor(daysDiff * 252 / 365);
        const dailyRate = Math.pow(1 + effectiveRate, 1 / 252) - 1;
        return principal * Math.pow(1 + dailyRate, bizDays);
    },

    async getPortfolio() {
        const transactions = await this.getTransactions();
        const prices = await this.getPrices();
        const settings = await this.getSettings();
        const cdiRate = settings.cdi_rate || 13.15;
        const holdings = {};

        for (const tx of transactions) {
            const key = tx.ticker.toUpperCase();
            if (!holdings[key]) {
                holdings[key] = { ticker: key, classe: tx.classe, setor: tx.setor || 'outros', qtd: 0, totalInvested: 0, avgPrice: 0 };
            }
            const h = holdings[key];
            h.classe = tx.classe;
            h.setor = tx.setor || h.setor;

            if (tx.classe === 'renda-fixa') {
                if (tx.operacao === 'compra') {
                    const invested = tx.qtd * tx.preco;
                    h.totalInvested += invested;
                    h.qtd += tx.qtd;
                    h.cdiPct = tx.precoAtual || 100;
                    h.purchaseDate = h.purchaseDate || tx.date;
                }
            } else if (tx.operacao === 'compra') {
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
                h.avgPrice = 0; h.totalInvested = 0; h.qtd = Math.max(0, h.qtd);
            }
        }

        const active = {};
        for (const [k, h] of Object.entries(holdings)) {
            if (h.qtd > 0.000001) {
                if (h.classe === 'renda-fixa') {
                    h.currentValue = this._calcRendaFixa(h.totalInvested, h.cdiPct, h.purchaseDate, cdiRate);
                    h.currentPrice = h.currentValue / h.qtd;
                } else {
                    h.currentPrice = prices[k] || h.avgPrice;
                    h.currentValue = h.qtd * h.currentPrice;
                }
                h.profit = h.currentValue - h.totalInvested;
                h.profitPct = h.totalInvested > 0 ? (h.profit / h.totalInvested) * 100 : 0;
                active[k] = h;
            }
        }
        return active;
    },

    async _takeSnapshot() {
        const portfolio = await this.getPortfolio();
        const totalValue = Object.values(portfolio).reduce((s, h) => s + h.currentValue, 0);
        const totalInvested = Object.values(portfolio).reduce((s, h) => s + h.totalInvested, 0);
        const dateStr = new Date().toISOString().slice(0, 10);

        await supabase.from('snapshots').upsert({
            user_id: Auth.getUserId(), date: dateStr, value: totalValue, invested: totalInvested,
        }, { onConflict: 'user_id,date' });
    },

    async migrateFromLocalStorage() {
        const txs = Store.getTransactions();
        const provs = Store.getProventos();
        const watch = Store.getWatchlist();
        const prices = Store.getPrices();
        const snaps = Store.getSnapshots();

        if (txs.length === 0 && provs.length === 0) return false;

        const uid = Auth.getUserId();
        const batchSize = 50;

        for (let i = 0; i < txs.length; i += batchSize) {
            const batch = txs.slice(i, i + batchSize).map(tx => ({
                id: tx.id || this._uid(), user_id: uid, date: tx.date, operacao: tx.operacao,
                ticker: tx.ticker, classe: tx.classe, setor: tx.setor || 'outros',
                qtd: tx.qtd, preco: tx.preco, taxas: tx.taxas || 0, preco_atual: tx.precoAtual || 0,
            }));
            await supabase.from('transactions').upsert(batch, { onConflict: 'id' });
        }

        for (let i = 0; i < provs.length; i += batchSize) {
            const batch = provs.slice(i, i + batchSize).map(p => ({
                id: p.id || this._uid(), user_id: uid, date: p.date, ativo: p.ativo,
                tipo: p.tipo, valor_cota: p.valorCota, qtd: p.qtd, total: p.total,
            }));
            await supabase.from('proventos').upsert(batch, { onConflict: 'id' });
        }

        for (const w of watch) {
            await supabase.from('watchlist').upsert({
                id: w.id || this._uid(), user_id: uid, ticker: w.ticker,
                classe: w.classe, preco: w.preco, alvo: w.alvo, notas: w.notas || '',
            }, { onConflict: 'id' });
        }

        for (const [ticker, price] of Object.entries(prices)) {
            await supabase.from('prices').upsert({
                user_id: uid, ticker: ticker.toUpperCase(), price, updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,ticker' });
        }

        for (const s of snaps) {
            await supabase.from('snapshots').upsert({
                user_id: uid, date: s.date, value: s.value, invested: s.invested,
            }, { onConflict: 'user_id,date' });
        }

        return true;
    },

    async exportData() {
        const [transactions, proventos, watchlist, prices, snapshots, settings] = await Promise.all([
            this.getTransactions(), this.getProventos(), this.getWatchlist(),
            this.getPrices(), this.getSnapshots(), this.getSettings(),
        ]);
        return {
            version: 1, exportDate: new Date().toISOString(),
            transactions, proventos, watchlist, prices, snapshots,
            cdiRate: settings.cdi_rate,
        };
    },

    async importData(data) {
        if (data.transactions) {
            for (const tx of data.transactions) await this.addTransaction(tx);
        }
        if (data.proventos) {
            for (const p of data.proventos) await this.addProvento(p);
        }
        if (data.watchlist) {
            for (const w of data.watchlist) await this.addWatchItem(w);
        }
        if (data.prices) {
            for (const [ticker, price] of Object.entries(data.prices)) {
                await this.updatePrice(ticker, price);
            }
        }
        if (data.cdiRate) {
            await this.updateSettings({ cdi_rate: data.cdiRate });
        }
    },

    _uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    },
};
