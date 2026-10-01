document.addEventListener('DOMContentLoaded', () => {
    const App = {
        currentTab: 'dashboard',
        cache: {},
        _brapiDividendsCache: null,

        async init() {
            this.showScreen('auth');
            this.bindAuth();
            try {
                const user = await Auth.init();
                if (user) {
                    await this.startApp();
                }
            } catch (e) {
                console.error('Init error:', e);
            }
        },

        showScreen(screen) {
            document.getElementById('auth-screen').style.display = screen === 'auth' ? 'flex' : 'none';
            document.getElementById('loading-screen').style.display = screen === 'loading' ? 'flex' : 'none';
            document.getElementById('app').style.display = screen === 'app' ? 'block' : 'none';
        },

        async startApp() {
            this.showScreen('loading');
            try {
                const settings = await DB.getSettings();
                document.body.setAttribute('data-theme', settings.theme || 'dark');
                document.getElementById('cdi-rate').value = settings.cdi_rate || 13.15;
                const brapiInput = document.getElementById('brapi-token');
                if (brapiInput) {
                    try {
                        brapiInput.value = localStorage.getItem('brapi_token') || '';
                    } catch (e) {}
                }
                await this.refreshCache();
                this.bindNav();
                this.bindModals();
                this.bindTheme();
                this.bindExport();
                this.bindCdi();
                this.bindBrapiToken();
                this.bindForms();
                this.bindUpdatePrices();
                this.bindLogout();
                await this.checkMigration();
                this.showScreen('app');
                this.navigate('dashboard');
                this.autoUpdatePrices();
            } catch (err) {
                console.error('Erro ao carregar app:', err);
                Utils.showToast('Erro ao carregar dados. Tente novamente.', 'error');
                this.showScreen('auth');
            }
        },

        async refreshCache() {
            const [transactions, proventos, watchlist, prices, snapshots, portfolio] = await Promise.all([
                DB.getTransactions(), DB.getProventos(), DB.getWatchlist(),
                DB.getPrices(), DB.getSnapshots(), DB.getPortfolio(),
            ]);
            this.cache = { transactions, proventos, watchlist, prices, snapshots, portfolio };
            this.cache.totalValue = Object.values(portfolio).reduce((s, h) => s + h.currentValue, 0);
            this.cache.totalInvested = Object.values(portfolio).reduce((s, h) => s + h.totalInvested, 0);
            this._brapiDividendsCache = null;
        },

        async checkMigration() {
            if (this.cache.transactions.length === 0 && Store.getTransactions().length > 0) {
                Utils.showToast('Migrando dados do navegador...', 'info');
                await DB.migrateFromLocalStorage();
                await this.refreshCache();
                Utils.showToast('Dados migrados com sucesso!', 'success');
            }
        },

        // ==================== AUTH ====================
        bindAuth() {
            let isLogin = true;
            const form = document.getElementById('auth-form');
            const toggleBtn = document.getElementById('auth-toggle-btn');
            const toggleText = document.getElementById('auth-toggle-text');
            const submitBtn = document.getElementById('auth-submit');
            const errorEl = document.getElementById('auth-error');

            toggleBtn.addEventListener('click', () => {
                isLogin = !isLogin;
                submitBtn.textContent = isLogin ? 'Entrar' : 'Criar conta';
                toggleText.textContent = isLogin ? 'Não tem conta?' : 'Já tem conta?';
                toggleBtn.textContent = isLogin ? 'Criar conta' : 'Entrar';
                errorEl.textContent = '';
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('auth-email').value.trim();
                const password = document.getElementById('auth-password').value;
                errorEl.textContent = '';
                submitBtn.disabled = true;
                submitBtn.textContent = 'Aguarde...';

                try {
                    if (isLogin) {
                        await Auth.signIn(email, password);
                    } else {
                        await Auth.signUp(email, password);
                    }
                    await this.startApp();
                } catch (err) {
                    const msg = err.message || 'Erro ao autenticar';
                    const translated = {
                        'Invalid login credentials': 'E-mail ou senha incorretos',
                        'User already registered': 'Este e-mail já está cadastrado',
                        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
                        'Unable to validate email address: invalid format': 'Formato de e-mail inválido',
                    };
                    errorEl.textContent = translated[msg] || msg;
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = isLogin ? 'Entrar' : 'Criar conta';
                }
            });
        },

        bindLogout() {
            const btn = document.getElementById('btn-logout');
            if (btn && !btn._bound) {
                btn._bound = true;
                btn.addEventListener('click', async () => {
                    const ok = await Utils.confirm('Sair', 'Deseja sair da sua conta?');
                    if (ok) {
                        await Auth.signOut();
                        this.cache = {};
                        Charts.destroyAll();
                        this.showScreen('auth');
                    }
                });
            }
        },

        // ==================== NAV ====================
        bindNav() {
            document.querySelectorAll('.nav-tab').forEach(btn => {
                if (!btn._bound) {
                    btn._bound = true;
                    btn.addEventListener('click', () => this.navigate(btn.dataset.tab));
                }
            });
        },

        navigate(tab) {
            this.currentTab = tab;
            document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
            document.querySelectorAll('.tab-content').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
            Charts.destroyAll();
            this.render(tab);
        },

        render(tab) {
            switch (tab) {
                case 'dashboard': this.renderDashboard(); break;
                case 'patrimonio': this.renderPatrimonio(); break;
                case 'proventos': this.renderProventos(); break;
                case 'rentabilidade': this.renderRentabilidade(); break;
                case 'composicao': this.renderComposicao(); break;
                case 'transacoes': this.renderTransacoes(); break;
                case 'seguindo': this.renderSeguindo(); break;
                case 'calendario': this.renderCalendario(); break;
            }
        },

        // ==================== DASHBOARD ====================
        renderDashboard() {
            const { portfolio, totalValue, totalInvested } = this.cache;
            const proventos = this._getAllProventos();
            const profit = totalValue - totalInvested;
            const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

            const now = new Date();
            const thisMonth = now.toISOString().slice(0, 7);
            const provMes = proventos.filter(p => p.date.startsWith(thisMonth)).reduce((s, p) => s + p.total, 0);
            const provCount = proventos.filter(p => p.date.startsWith(thisMonth)).length;

            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
            const prov12m = proventos.filter(p => p.date >= oneYearAgo).reduce((s, p) => s + p.total, 0);
            const yieldPct = totalInvested > 0 ? (prov12m / totalInvested) * 100 : 0;

            const cdiRate = parseFloat(document.getElementById('cdi-rate').value) || 13.15;
            const txs = [...this.cache.transactions].sort((a, b) => a.date.localeCompare(b.date));
            let cdiPct = 0;
            if (txs.length > 0 && totalInvested > 0) {
                const days = Utils.businessDaysBetween(txs[0].date, Utils.todayStr());
                const cdiReturn = Utils.calculateCDI(cdiRate, days) * 100;
                cdiPct = cdiReturn > 0 ? (profitPct / cdiReturn) * 100 : 0;
            }

            document.getElementById('dash-patrimonio').textContent = Utils.formatCurrency(totalValue);
            const changeEl = document.getElementById('dash-patrimonio-change');
            changeEl.textContent = Utils.formatPercent(profitPct);
            changeEl.className = `card-change ${profitPct >= 0 ? 'positive' : 'negative'}`;

            document.getElementById('dash-proventos-mes').textContent = Utils.formatCurrency(provMes);
            document.getElementById('dash-proventos-change').textContent = `${provCount} provento${provCount !== 1 ? 's' : ''}`;
            document.getElementById('dash-proventos-ano').textContent = Utils.formatCurrency(prov12m);
            document.getElementById('dash-yield').textContent = `Yield: ${Utils.formatNumber(yieldPct)}%`;
            document.getElementById('dash-rentabilidade').textContent = Utils.formatPercent(profitPct);
            document.getElementById('dash-vs-cdi').textContent = `${Utils.formatNumber(cdiPct)}% do CDI`;

            this._renderDashPatrimonioChart();
            this._renderDashComposicaoChart(portfolio);
            this._renderDashProventosChart(proventos);
            this._renderDashTopPositions(portfolio, totalValue);
        },

        _renderDashPatrimonioChart() {
            this._drawPatrimonioChart('chart-dash-patrimonio', 'all');
        },

        _renderDashComposicaoChart(portfolio) {
            const byType = {};
            for (const h of Object.values(portfolio)) {
                const label = Utils.getAssetTypeLabel(h.classe);
                byType[label] = (byType[label] || 0) + h.currentValue;
            }
            const labels = Object.keys(byType);
            const data = Object.values(byType);
            if (labels.length === 0) { labels.push('Sem ativos'); data.push(1); }
            Charts.createPie('chart-dash-composicao', labels, data, { doughnut: true });
        },

        _renderDashProventosChart(proventos) {
            const now = new Date();
            const months = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(d.toISOString().slice(0, 7));
            }
            Charts.createBar('chart-dash-proventos',
                months.map(m => Utils.formatDateShort(m + '-01')),
                [{ data: months.map(m => proventos.filter(p => p.date.startsWith(m)).reduce((s, p) => s + p.total, 0)), label: 'Proventos', color: Utils.getChartColors()[1] }]
            );
        },

        _renderDashTopPositions(portfolio, totalValue) {
            const sorted = Object.values(portfolio).sort((a, b) => b.currentValue - a.currentValue).slice(0, 8);
            const tbody = document.getElementById('dash-top-tbody');
            tbody.innerHTML = sorted.map(h => `
                <tr>
                    <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                    <td><span class="badge badge-${h.classe}">${Utils.getAssetTypeLabel(h.classe)}</span></td>
                    <td class="mono">${Utils.formatCurrency(h.currentValue)}</td>
                    <td class="mono">${totalValue > 0 ? Utils.formatNumber((h.currentValue / totalValue) * 100) : '0'}%</td>
                </tr>
            `).join('') || '<tr><td colspan="4" class="no-data">Nenhum ativo na carteira</td></tr>';
        },

        // ==================== HELPERS: CDI / SERIES ====================
        patPeriod: '6m',

        _getCdiRate() {
            return parseFloat(document.getElementById('cdi-rate').value) || 13.15;
        },

        // Fator de acumulo (juros compostos em dias uteis, base 252) entre duas datas.
        // cdiPct = % do CDI (100 = 100% do CDI). Mesma convencao de DB._calcRendaFixa.
        _cdiFactor(fromDate, toDate, cdiRate, cdiPct = 100) {
            const days = (new Date(toDate + 'T12:00:00') - new Date(fromDate + 'T12:00:00')) / 86400000;
            if (!(days > 0)) return 1;
            const effectiveRate = (cdiRate / 100) * (cdiPct / 100);
            const bizDays = Math.floor(days * 252 / 365);
            return Math.pow(1 + effectiveRate, bizDays / 252);
        },

        _monthEnd(month) {
            const [y, m] = month.split('-').map(Number);
            return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
        },

        _addDays(dateStr, n) {
            const d = new Date(dateStr + 'T12:00:00');
            d.setDate(d.getDate() + n);
            return d.toISOString().slice(0, 10);
        },

        // Datas dos pontos do grafico: semanal para historicos curtos, fim de mes para os longos.
        _seriesDates(first, today) {
            const dates = [first];
            const span = (new Date(today + 'T12:00:00') - new Date(first + 'T12:00:00')) / 86400000;
            if (span <= 120) {
                for (let d = this._addDays(first, 7); d < today; d = this._addDays(d, 7)) dates.push(d);
            } else {
                for (const month of Utils.getMonthsRange(first.slice(0, 7), today.slice(0, 7))) {
                    const end = this._monthEnd(month);
                    if (end > first && end < today) dates.push(end);
                }
            }
            if (today > first) dates.push(today);
            return dates;
        },

        // Serie de patrimonio: [{ date, value, invested, cdi }]
        // cdi = quanto o mesmo dinheiro (mesmos aportes/resgates, nas mesmas datas) valeria a 100% do CDI.
        _buildPatrimonioSeries() {
            const { snapshots, transactions, prices, totalValue, totalInvested } = this.cache;
            const txs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
            if (txs.length === 0) return [];
            const today = Utils.todayStr();
            const cdiRate = this._getCdiRate();
            let points;

            if (snapshots.length >= 2) {
                points = snapshots.map(s => ({ date: s.date, value: s.value, invested: s.invested }));
                if (points[points.length - 1].date < today) points.push({ date: today, value: totalValue, invested: totalInvested });
            } else {
                // Sem historico de snapshots: reconstroi a partir das transacoes.
                // Renda fixa e valorizada pelo CDI; demais ativos pelo preco atual (nao ha cotacao historica).
                points = this._seriesDates(txs[0].date, today).map(date => {
                    const holdings = {};
                    let rfValue = 0, rfInvested = 0;
                    for (const tx of txs) {
                        if (tx.date > date) break;
                        const key = tx.ticker.toUpperCase();
                        if (tx.classe === 'renda-fixa') {
                            if (tx.operacao === 'compra') {
                                const principal = tx.qtd * tx.preco;
                                rfInvested += principal;
                                rfValue += principal * this._cdiFactor(tx.date, date, cdiRate, tx.precoAtual || 100);
                            }
                            continue;
                        }
                        const h = holdings[key] || (holdings[key] = { qtd: 0, cost: 0, last: tx.preco });
                        h.last = tx.preco;
                        if (tx.operacao === 'compra') {
                            h.qtd += tx.qtd;
                            h.cost += tx.qtd * tx.preco + (tx.taxas || 0);
                        } else if (h.qtd > 0) {
                            const ratio = Math.min(tx.qtd / h.qtd, 1);
                            h.cost -= h.cost * ratio;
                            h.qtd = Math.max(0, h.qtd - tx.qtd);
                        }
                    }
                    let value = rfValue, invested = rfInvested;
                    for (const [key, h] of Object.entries(holdings)) {
                        if (h.qtd <= 0.000001) continue;
                        value += h.qtd * (prices[key] || h.last);
                        invested += h.cost;
                    }
                    if (date === today) return { date, value: totalValue, invested: totalInvested };
                    return { date, value, invested };
                });
            }

            // Benchmark CDI: cada aporte rende CDI desde a sua data; resgates saem do saldo.
            const flows = txs
                .filter(tx => !(tx.classe === 'renda-fixa' && tx.operacao !== 'compra'))
                .map(tx => ({
                    date: tx.date,
                    amount: tx.operacao === 'compra' ? tx.qtd * tx.preco + (tx.taxas || 0) : -(tx.qtd * tx.preco - (tx.taxas || 0)),
                }));
            for (const p of points) {
                let cdi = 0;
                for (const f of flows) {
                    if (f.date > p.date) break;
                    cdi += f.amount * this._cdiFactor(f.date, p.date, cdiRate, 100);
                }
                p.cdi = Math.max(0, cdi);
            }
            return points;
        },

        _filterByPeriod(points, period) {
            if (period === 'all' || points.length === 0) return points;
            const months = { '6m': 6, '1y': 12, '2y': 24 }[period] || 6;
            const d = new Date();
            d.setMonth(d.getMonth() - months);
            const cutoff = d.toISOString().slice(0, 10);
            const filtered = points.filter(p => p.date >= cutoff);
            return filtered.length >= 2 ? filtered : points.slice(-2);
        },

        _drawPatrimonioChart(canvasId, period) {
            const all = this._buildPatrimonioSeries();
            if (all.length === 0) { Charts.destroy(canvasId); return; }
            const points = this._filterByPeriod(all, period);
            const span = points.length > 1
                ? (new Date(points[points.length - 1].date + 'T12:00:00') - new Date(points[0].date + 'T12:00:00')) / 86400000
                : 0;
            const labels = points.map(p => span <= 200 ? Utils.formatDate(p.date).slice(0, 5) : Utils.formatDateShort(p.date));
            const colors = Utils.getChartColors();
            const gray = Charts.getThemeColors().text || '#8b949e';

            Charts.createLine(canvasId, labels, [
                { label: 'Patrimônio', data: points.map(p => p.value), color: colors[0], fill: true },
                { label: 'Total Investido', data: points.map(p => p.invested), color: gray },
                { label: 'CDI (benchmark)', data: points.map(p => p.cdi), color: colors[5], dashed: true, pointRadius: 0 },
            ], {
                tooltipCallbacks: {
                    title: items => items.length ? Utils.formatDate(points[items[0].dataIndex].date) : '',
                    label: ctx => ` ${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw)}`,
                },
            });
        },

        _bindPatrimonioPeriodBtns() {
            const btns = document.querySelectorAll('#tab-patrimonio .period-btn');
            btns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.period === this.patPeriod);
                if (!btn._bound) {
                    btn._bound = true;
                    btn.addEventListener('click', () => {
                        this.patPeriod = btn.dataset.period;
                        document.querySelectorAll('#tab-patrimonio .period-btn')
                            .forEach(b => b.classList.toggle('active', b === btn));
                        this._drawPatrimonioChart('chart-patrimonio', this.patPeriod);
                    });
                }
            });
        },

        _bindRentPeriodBtns() {
            const btns = document.querySelectorAll('#rent-period-btns .period-btn');
            btns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.period === this.rentPeriod);
                if (!btn._bound) {
                    btn._bound = true;
                    btn.addEventListener('click', () => {
                        this.rentPeriod = btn.dataset.period;
                        document.querySelectorAll('#rent-period-btns .period-btn')
                            .forEach(b => b.classList.toggle('active', b === btn));
                        this._drawPatrimonioChart('chart-rent-patrimonio', this.rentPeriod);
                    });
                }
            });
        },

        _dividendTickers() {
            const portfolio = this.cache.portfolio || {};
            return Object.keys(portfolio).filter(t => portfolio[t].classe !== 'renda-fixa');
        },

        // Fills rows from localStorage so a view can paint immediately.
        _primeDividends() {
            const tickers = this._dividendTickers();
            if (tickers.length > 0) PriceAPI.primeFromStorage(tickers);
            this._buildBrapiRows();
        },

        // Background refresh. Never awaited by a render, so the UI never blocks
        // on a slow, rate-limited API.
        _refreshDividends(onUpdate) {
            const tickers = this._dividendTickers();
            const token = this._getBrapiToken();
            if (!token || tickers.length === 0) return;
            PriceAPI.fetchDividends(tickers, token, () => {
                this._buildBrapiRows();
                if (onUpdate) onUpdate();
            });
        },

        // Assets the API returned nothing for, with the reason, so a missing
        // asset is explained rather than silently absent.
        _missingDividendNote() {
            const withRows = new Set((this._brapiDividendsCache || []).map(r => r.ativo));
            const status = PriceAPI.getDividendStatus();
            const reasons = { 'empty-results': [], '429': [], other: [], pending: [] };

            for (const ticker of this._dividendTickers()) {
                if (withRows.has(ticker)) continue;
                const s = status[ticker];
                if (s === undefined) reasons.pending.push(ticker);
                else if (s === '429' || s === 'skipped-budget') reasons['429'].push(ticker);
                else if (s === 'empty-results' || s === 'cache' || /^ok:0/.test(s)) reasons['empty-results'].push(ticker);
                else reasons.other.push(ticker);
            }

            const parts = [];
            if (reasons['empty-results'].length) {
                parts.push(`A brapi.dev nao tem proventos publicados para: <strong>${reasons['empty-results'].join(', ')}</strong>.`);
            }
            if (reasons['429'].length) {
                parts.push(`Ainda carregando (limite de requisicoes da brapi): <strong>${reasons['429'].join(', ')}</strong>. Recarregue em alguns minutos.`);
            }
            if (reasons.other.length) {
                parts.push(`Erro ao consultar: <strong>${reasons.other.join(', ')}</strong>.`);
            }
            if (reasons.pending.length) {
                parts.push(`Buscando: <strong>${reasons.pending.join(', ')}</strong>...`);
            }
            return parts.join(' ');
        },

        _buildBrapiRows() {
            const portfolio = this.cache.portfolio || {};
            const firstBuy = {};
            for (const tx of this.cache.transactions) {
                const k = tx.ticker.toUpperCase();
                if (tx.operacao === 'compra' && (!firstBuy[k] || tx.date < firstBuy[k])) firstBuy[k] = tx.date;
            }

            const divs = PriceAPI.getCachedDividends();
            const rows = [];
            for (const [ticker, arr] of Object.entries(divs)) {
                for (const d of arr) {
                    const payDate = String(d.paymentDate || '').slice(0, 10);
                    const baseDate = String(d.lastDatePrior || '').slice(0, 10);
                    const approvedDate = String(d.approvedOn || '').slice(0, 10);
                    const date = (payDate && /^\d{4}/.test(payDate)) ? payDate
                        : (baseDate && /^\d{4}/.test(baseDate)) ? baseDate : approvedDate;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
                    if (firstBuy[ticker] && date < firstBuy[ticker]) continue;
                    const rate = Number(d.rate || 0);
                    if (rate <= 0) continue;
                    const qtd = portfolio[ticker]?.qtd || 0;
                    rows.push({
                        id: `brapi-${ticker}-${date}-${rate.toFixed(4)}`,
                        date,
                        dataBase: (baseDate && /^\d{4}/.test(baseDate)) ? baseDate : '',
                        ativo: ticker,
                        tipo: (d.label || 'dividendo').toLowerCase(),
                        valorCota: rate, qtd, total: rate * qtd,
                        synthetic: false, brapi: true,
                    });
                }
            }

            this._brapiDividendsCache = rows;
            return rows;
        },

        _getSyntheticProventos() {
            const { transactions, proventos } = this.cache;
            const cdiRate = this._getCdiRate();
            const today = Utils.todayStr();
            const byKey = new Map();

            for (const tx of transactions) {
                if (tx.classe !== 'renda-fixa' || tx.operacao !== 'compra') continue;
                const ticker = tx.ticker.toUpperCase();
                const pct = tx.precoAtual || 100;
                const principal = tx.qtd * tx.preco;
                let prevBalance = principal;
                for (const month of Utils.getMonthsRange(tx.date.slice(0, 7), today.slice(0, 7))) {
                    const end = this._monthEnd(month);
                    if (end > today) break;
                    const balance = principal * this._cdiFactor(tx.date, end, cdiRate, pct);
                    const yieldValue = balance - prevBalance;
                    prevBalance = balance;
                    if (yieldValue < 0.005) continue;
                    const key = `${ticker}|${month}`;
                    const cur = byKey.get(key) || { date: end, ativo: ticker, total: 0, qtd: 0 };
                    cur.total += yieldValue;
                    cur.qtd += tx.qtd;
                    byKey.set(key, cur);
                }
            }

            const manual = new Set(proventos.map(p => `${p.ativo.toUpperCase()}|${p.date.slice(0, 7)}`));
            const out = [];
            for (const [key, v] of byKey) {
                if (manual.has(key)) continue;
                out.push({
                    id: `rf-${key}`, date: v.date, ativo: v.ativo, tipo: 'rendimento',
                    valorCota: v.qtd > 0 ? v.total / v.qtd : v.total, qtd: v.qtd, total: v.total, synthetic: true,
                });
            }
            return out;
        },

        _getAllProventos() {
            const all = [...this.cache.proventos, ...this._getSyntheticProventos()];
            if (this._brapiDividendsCache && this._brapiDividendsCache.length > 0) {
                for (const bd of this._brapiDividendsCache) {
                    const dup = all.some(r =>
                        r.ativo.toUpperCase() === bd.ativo.toUpperCase() &&
                        r.date.slice(0, 7) === bd.date.slice(0, 7) &&
                        Math.abs(r.valorCota - bd.valorCota) < 0.01
                    );
                    if (!dup) all.push(bd);
                }
            }
            return all.sort((a, b) => b.date.localeCompare(a.date));
        },

        // ==================== PATRIMONIO ====================
        renderPatrimonio() {
            const { portfolio, totalValue, totalInvested } = this.cache;
            const profit = totalValue - totalInvested;

            document.getElementById('pat-total').textContent = Utils.formatCurrency(totalValue);
            document.getElementById('pat-investido').textContent = Utils.formatCurrency(totalInvested);
            const lucroEl = document.getElementById('pat-lucro');
            lucroEl.textContent = Utils.formatCurrency(profit);
            lucroEl.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
            document.getElementById('pat-ativos').textContent = Object.keys(portfolio).length;

            this._bindPatrimonioPeriodBtns();
            this._drawPatrimonioChart('chart-patrimonio', this.patPeriod);

            const sorted = Object.values(portfolio).sort((a, b) => b.currentValue - a.currentValue);
            document.getElementById('pat-assets-tbody').innerHTML = sorted.map(h => `
                <tr>
                    <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                    <td><span class="badge badge-${h.classe}">${Utils.getAssetTypeLabel(h.classe)}</span></td>
                    <td class="mono">${Utils.formatNumber(h.qtd, h.qtd < 1 ? 6 : 0)}</td>
                    <td class="mono">${Utils.formatCurrency(h.avgPrice)}</td>
                    <td class="mono">${Utils.formatCurrency(h.currentPrice)}</td>
                    <td class="mono">${Utils.formatCurrency(h.totalInvested)}</td>
                    <td class="mono">${Utils.formatCurrency(h.currentValue)}</td>
                    <td class="mono ${h.profit >= 0 ? 'text-green' : 'text-red'}">${Utils.formatCurrency(h.profit)}</td>
                    <td class="mono ${h.profitPct >= 0 ? 'text-green' : 'text-red'}">${Utils.formatPercent(h.profitPct)}</td>
                </tr>
            `).join('') || '<tr><td colspan="9" class="no-data">Nenhum ativo na carteira</td></tr>';
        },

        // ==================== PROVENTOS ====================
        renderProventos() {
            this._primeDividends();
            this._renderProventosUI();
            this._refreshDividends(() => {
                if (this.currentTab === 'proventos') this._renderProventosTable();
            });
        },

        _renderProventosUI() {
            const { totalInvested } = this.cache;
            const proventos = this._getAllProventos();
            const now = new Date();
            const thisMonth = now.toISOString().slice(0, 7);
            const thisYear = String(now.getFullYear());
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);

            document.getElementById('prov-mes').textContent = Utils.formatCurrency(proventos.filter(p => p.date.startsWith(thisMonth)).reduce((s, p) => s + p.total, 0));
            document.getElementById('prov-ano').textContent = Utils.formatCurrency(proventos.filter(p => p.date.startsWith(thisYear)).reduce((s, p) => s + p.total, 0));
            const prov12m = proventos.filter(p => p.date >= oneYearAgo).reduce((s, p) => s + p.total, 0);
            document.getElementById('prov-12m').textContent = Utils.formatCurrency(prov12m);
            document.getElementById('prov-yield').textContent = Utils.formatNumber(totalInvested > 0 ? (prov12m / totalInvested) * 100 : 0) + '%';

            const months = [];
            for (let i = 11; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
            Charts.createBar('chart-proventos', months.map(m => Utils.formatDateShort(m + '-01')), [{ data: months.map(m => proventos.filter(p => p.date.startsWith(m)).reduce((s, p) => s + p.total, 0)), label: 'Proventos', color: Utils.getChartColors()[1] }]);

            const byTipo = {};
            proventos.forEach(p => { byTipo[p.tipo] = (byTipo[p.tipo] || 0) + p.total; });
            Charts.createPie('chart-proventos-tipo', Object.keys(byTipo).map(Utils.getProventoTypeLabel), Object.values(byTipo), { doughnut: true });

            const byAtivo = {};
            proventos.forEach(p => { byAtivo[p.ativo] = (byAtivo[p.ativo] || 0) + p.total; });
            const sortedAtivos = Object.entries(byAtivo).sort((a, b) => b[1] - a[1]).slice(0, 8);
            Charts.createPie('chart-proventos-ativos', sortedAtivos.map(a => a[0]), sortedAtivos.map(a => a[1]), { doughnut: true });

            this._populateProventoAssetFilter();
            this._renderProventosTable();
        },

        _populateProventoAssetFilter() {
            const { portfolio } = this.cache;
            const proventos = this._getAllProventos();
            const select = document.getElementById('prov-filter-asset');
            const current = select.value;
            select.innerHTML = '<option value="">Todos os ativos</option>';
            const allTickers = [...new Set([...Object.keys(portfolio), ...proventos.map(p => p.ativo)])].sort();
            for (const t of allTickers) select.innerHTML += `<option value="${t}">${t}</option>`;
            select.value = current;
        },

        _renderProventosTable() {
            const filterType = document.getElementById('prov-filter-type').value;
            const filterAsset = document.getElementById('prov-filter-asset').value;
            let filtered = this._getAllProventos();
            if (filterType) filtered = filtered.filter(p => p.tipo === filterType);
            if (filterAsset) filtered = filtered.filter(p => p.ativo === filterAsset);

            document.getElementById('prov-tbody').innerHTML = filtered.map(p => {
                const dataBase = p.dataBase ? Utils.formatDate(p.dataBase) : '-';
                const origem = p.brapi ? 'brapi.dev' : (p.synthetic ? 'Estimado' : '');
                return `<tr>
                    <td>${Utils.formatDate(p.date)}</td>
                    <td>${dataBase}</td>
                    <td><strong>${Utils.escapeHtml(p.ativo)}</strong></td>
                    <td>${Utils.getProventoTypeLabel(p.tipo)}</td>
                    <td class="mono">${Utils.formatCurrency(p.valorCota)}</td>
                    <td class="mono">${Utils.formatNumber(p.qtd, p.qtd < 1 ? 6 : 0)}</td>
                    <td class="mono text-green">${Utils.formatCurrency(p.total)}</td>
                    <td>${(p.synthetic || p.brapi) ? `<span style="color:var(--text-muted)" title="${p.brapi ? 'Dados da brapi.dev' : 'Calculado a partir do CDI'}">${origem}</span>` : `
                    <div class="action-btns">
                        <button class="action-btn" onclick="App.editProvento('${p.id}')" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button class="action-btn delete" onclick="App.deleteProvento('${p.id}')" title="Excluir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                    </div>
                    `}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="8" class="no-data">Nenhum provento registrado</td></tr>';
        },

        // ==================== RENTABILIDADE ====================
        rentPeriod: '6m',

        renderRentabilidade() {
            const { portfolio, totalValue, totalInvested, transactions, prices } = this.cache;
            const profit = totalValue - totalInvested;
            const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
            const cdiRate = parseFloat(document.getElementById('cdi-rate').value) || 13.15;

            const txs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
            const firstDate = txs.length > 0 ? txs[0].date : Utils.todayStr();
            const totalDays = Utils.businessDaysBetween(firstDate, Utils.todayStr());
            const cdiTotal = Utils.calculateCDI(cdiRate, totalDays) * 100;
            const vsCdi = cdiTotal > 0 ? (profitPct / cdiTotal) * 100 : 0;

            const currentYear = String(new Date().getFullYear());
            const yearDays = Utils.businessDaysBetween(`${currentYear}-01-01`, Utils.todayStr());
            const cdiYear = Utils.calculateCDI(cdiRate, yearDays) * 100;
            const monthDays = Utils.businessDaysBetween(new Date().toISOString().slice(0, 7) + '-01', Utils.todayStr());
            const cdiMonth = Utils.calculateCDI(cdiRate, monthDays) * 100;

            document.getElementById('rent-total').textContent = Utils.formatPercent(profitPct);
            document.getElementById('rent-total').style.color = profitPct >= 0 ? 'var(--green)' : 'var(--red)';
            document.getElementById('rent-mes').textContent = Utils.formatPercent(cdiMonth);
            document.getElementById('rent-ano').textContent = Utils.formatPercent(cdiYear);
            document.getElementById('rent-cdi').textContent = Utils.formatNumber(vsCdi) + '%';

            const lucroEl = document.getElementById('rent-lucro-rs');
            lucroEl.textContent = Utils.formatCurrency(profit);
            lucroEl.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
            const lucroSub = document.getElementById('rent-lucro-pct');
            lucroSub.textContent = Utils.formatPercent(profitPct);
            lucroSub.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
            document.getElementById('rent-patrimonio-rs').textContent = Utils.formatCurrency(totalValue);
            document.getElementById('rent-investido-rs').textContent = Utils.formatCurrency(totalInvested);

            this._bindRentPeriodBtns();
            this._drawPatrimonioChart('chart-rent-patrimonio', this.rentPeriod);

            if (txs.length > 0) {
                const months = Utils.getMonthsRange(txs[0].date.slice(0, 7), Utils.todayStr().slice(0, 7));
                const labels = months.map(m => Utils.formatDateShort(m + '-01'));
                const portfolioReturns = [];
                const cdiReturns = [];
                let cumInvested = 0, cumValue = 0;

                for (const month of months) {
                    for (const tx of txs.filter(t => t.date.startsWith(month))) {
                        if (tx.operacao === 'compra') {
                            cumInvested += tx.qtd * tx.preco + (tx.taxas || 0);
                            cumValue += tx.qtd * (prices[tx.ticker.toUpperCase()] || tx.preco);
                        } else {
                            const h = portfolio[tx.ticker.toUpperCase()];
                            const avgP = h ? h.avgPrice : tx.preco;
                            cumInvested -= tx.qtd * avgP;
                            cumValue -= tx.qtd * (prices[tx.ticker.toUpperCase()] || tx.preco);
                        }
                    }
                    portfolioReturns.push(cumInvested > 0 ? ((cumValue - cumInvested) / cumInvested) * 100 : 0);
                    cdiReturns.push(Utils.calculateCDI(cdiRate, Utils.businessDaysBetween(txs[0].date, month + '-28')) * 100);
                }
                if (portfolioReturns.length > 0) portfolioReturns[portfolioReturns.length - 1] = profitPct;

                Charts.createLine('chart-rentabilidade', labels, [
                    { data: portfolioReturns, label: 'Carteira', color: Utils.getChartColors()[0], fill: true },
                    { data: cdiReturns, label: 'CDI', color: Utils.getChartColors()[3], dashed: true },
                ], { yFormat: v => v.toFixed(1) + '%', tooltipCallbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%` } });

                const monthlyReturns = portfolioReturns.map((r, i) => {
                    if (i === 0) return r;
                    const prev = 1 + portfolioReturns[i - 1] / 100;
                    const curr = 1 + r / 100;
                    return prev > 0 ? ((curr / prev) - 1) * 100 : 0;
                });
                Charts.createBar('chart-rent-mensal', labels, [{
                    data: monthlyReturns, label: 'Retorno Mensal',
                    colors: monthlyReturns.map(v => v >= 0 ? Utils.getChartColors()[1] : Utils.getChartColors()[4]),
                }], { yFormat: v => v.toFixed(1) + '%', tooltipCallbacks: { label: ctx => ` ${ctx.raw.toFixed(2)}%` } });
            }

            const sorted = Object.values(portfolio).sort((a, b) => b.profitPct - a.profitPct);
            document.getElementById('rent-tbody').innerHTML = sorted.map(h => {
                const vs = cdiTotal > 0 ? (h.profitPct / cdiTotal) * 100 : 0;
                return `<tr>
                    <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                    <td><span class="badge badge-${h.classe}">${Utils.getAssetTypeLabel(h.classe)}</span></td>
                    <td class="mono ${h.profitPct >= 0 ? 'text-green' : 'text-red'}">${Utils.formatPercent(h.profitPct)}</td>
                    <td class="mono">-</td><td class="mono">-</td>
                    <td class="mono">${Utils.formatNumber(vs)}%</td>
                </tr>`;
            }).join('') || '<tr><td colspan="6" class="no-data">Nenhum ativo na carteira</td></tr>';
        },

        // ==================== COMPOSICAO ====================
        renderComposicao() {
            const { portfolio, totalValue } = this.cache;
            const byType = {}, bySetor = {};
            for (const h of Object.values(portfolio)) {
                byType[Utils.getAssetTypeLabel(h.classe)] = (byType[Utils.getAssetTypeLabel(h.classe)] || 0) + h.currentValue;
                bySetor[Utils.getSectorLabel(h.setor)] = (bySetor[Utils.getSectorLabel(h.setor)] || 0) + h.currentValue;
            }

            const typeLabels = Object.keys(byType), typeData = Object.values(byType);
            Charts.createPie('chart-comp-tipo', typeLabels.length ? typeLabels : ['Sem ativos'], typeLabels.length ? typeData : [1], { doughnut: true });
            const colors = Utils.getChartColors();
            document.getElementById('comp-tipo-legend').innerHTML = typeLabels.map((l, i) => `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l}<span class="legend-value">${Utils.formatCurrency(typeData[i])} (${totalValue > 0 ? ((typeData[i] / totalValue) * 100).toFixed(1) : 0}%)</span></div>`).join('');

            const setorLabels = Object.keys(bySetor), setorData = Object.values(bySetor);
            Charts.createPie('chart-comp-setor', setorLabels.length ? setorLabels : ['Sem setores'], setorLabels.length ? setorData : [1], { doughnut: true });
            document.getElementById('comp-setor-legend').innerHTML = setorLabels.map((l, i) => `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l}<span class="legend-value">${Utils.formatCurrency(setorData[i])} (${totalValue > 0 ? ((setorData[i] / totalValue) * 100).toFixed(1) : 0}%)</span></div>`).join('');

            const sorted = Object.values(portfolio).sort((a, b) => b.currentValue - a.currentValue);
            Charts.createHorizontalBar('chart-comp-ativos', sorted.map(h => h.ticker), sorted.map(h => h.currentValue));

            document.getElementById('comp-tbody').innerHTML = sorted.map(h => {
                const typePct = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                const typeTotal = byType[Utils.getAssetTypeLabel(h.classe)] || 0;
                return `<tr>
                    <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                    <td><span class="badge badge-${h.classe}">${Utils.getAssetTypeLabel(h.classe)}</span></td>
                    <td>${Utils.getSectorLabel(h.setor)}</td>
                    <td class="mono">${Utils.formatCurrency(h.currentValue)}</td>
                    <td class="mono">${Utils.formatNumber(typePct)}%</td>
                    <td class="mono">${Utils.formatNumber(typeTotal > 0 ? (h.currentValue / typeTotal) * 100 : 0)}%</td>
                </tr>`;
            }).join('') || '<tr><td colspan="6" class="no-data">Nenhum ativo na carteira</td></tr>';
        },

        // ==================== TRANSACOES ====================
        transPage: 1,
        transPerPage: 20,

        renderTransacoes() {
            this._renderTransacoesTable();
            this._bindTransFilters();
        },

        _bindTransFilters() {
            ['trans-filter-operation', 'trans-filter-class', 'trans-filter-from', 'trans-filter-to', 'trans-filter-ticker'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el._bound) {
                    el._bound = true;
                    el.addEventListener('change', () => { this.transPage = 1; this._renderTransacoesTable(); });
                    if (el.type === 'text') el.addEventListener('input', () => { this.transPage = 1; this._renderTransacoesTable(); });
                }
            });
            const clearBtn = document.getElementById('btn-clear-filters');
            if (clearBtn && !clearBtn._bound) {
                clearBtn._bound = true;
                clearBtn.addEventListener('click', () => {
                    ['trans-filter-operation', 'trans-filter-class', 'trans-filter-from', 'trans-filter-to', 'trans-filter-ticker'].forEach(id => document.getElementById(id).value = '');
                    this.transPage = 1;
                    this._renderTransacoesTable();
                });
            }
        },

        _renderTransacoesTable() {
            let txs = [...this.cache.transactions];
            const op = document.getElementById('trans-filter-operation').value;
            const cls = document.getElementById('trans-filter-class').value;
            const from = document.getElementById('trans-filter-from').value;
            const to = document.getElementById('trans-filter-to').value;
            const ticker = document.getElementById('trans-filter-ticker').value.toUpperCase();

            if (op) txs = txs.filter(t => t.operacao === op);
            if (cls) txs = txs.filter(t => t.classe === cls);
            if (from) txs = txs.filter(t => t.date >= from);
            if (to) txs = txs.filter(t => t.date <= to);
            if (ticker) txs = txs.filter(t => t.ticker.toUpperCase().includes(ticker));

            const totalPages = Math.max(1, Math.ceil(txs.length / this.transPerPage));
            if (this.transPage > totalPages) this.transPage = totalPages;
            const paged = txs.slice((this.transPage - 1) * this.transPerPage, this.transPage * this.transPerPage);

            document.getElementById('trans-tbody').innerHTML = paged.map(t => {
                const total = t.qtd * t.preco + (t.operacao === 'compra' ? (t.taxas || 0) : -(t.taxas || 0));
                return `<tr>
                    <td>${Utils.formatDate(t.date)}</td>
                    <td><span class="badge badge-${t.operacao}">${t.operacao === 'compra' ? 'Compra' : 'Venda'}</span></td>
                    <td><strong>${Utils.escapeHtml(t.ticker)}</strong></td>
                    <td><span class="badge badge-${t.classe}">${Utils.getAssetTypeLabel(t.classe)}</span></td>
                    <td class="mono">${Utils.formatNumber(t.qtd, t.qtd < 1 ? 6 : 0)}</td>
                    <td class="mono">${Utils.formatCurrency(t.preco)}</td>
                    <td class="mono">${Utils.formatCurrency(t.taxas || 0)}</td>
                    <td class="mono">${Utils.formatCurrency(Math.abs(total))}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn" onclick="App.editTransaction('${t.id}')" title="Editar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button class="action-btn delete" onclick="App.deleteTransaction('${t.id}')" title="Excluir">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('') || '<tr><td colspan="9" class="no-data">Nenhuma transação encontrada</td></tr>';

            const pagDiv = document.getElementById('trans-pagination');
            if (totalPages <= 1) { pagDiv.innerHTML = ''; return; }
            pagDiv.innerHTML = Array.from({ length: totalPages }, (_, i) => `<button class="${i + 1 === this.transPage ? 'active' : ''}" onclick="App.transGoPage(${i + 1})">${i + 1}</button>`).join('');
        },

        transGoPage(page) { this.transPage = page; this._renderTransacoesTable(); },

        // ==================== SEGUINDO ====================
        renderSeguindo() {
            const watchlist = this.cache.watchlist;
            const grid = document.getElementById('watchlist-grid');
            const empty = document.getElementById('seguindo-empty');

            if (watchlist.length === 0) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
            grid.style.display = 'grid'; empty.style.display = 'none';

            grid.innerHTML = watchlist.map(w => {
                const upside = w.alvo && w.preco ? ((w.alvo - w.preco) / w.preco * 100) : null;
                return `<div class="watchlist-card">
                    <div class="watchlist-card-header">
                        <span class="watchlist-ticker">${Utils.escapeHtml(w.ticker)}</span>
                        <span class="badge badge-${w.classe}">${Utils.getAssetTypeLabel(w.classe)}</span>
                    </div>
                    <div class="watchlist-price">${Utils.formatCurrency(w.preco)}</div>
                    ${w.alvo ? `<div class="watchlist-target">Alvo: ${Utils.formatCurrency(w.alvo)} ${upside !== null ? `<span class="${upside >= 0 ? 'text-green' : 'text-red'}">(${Utils.formatPercent(upside)})</span>` : ''}</div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, (w.preco / w.alvo) * 100))}%;background:${upside >= 0 ? 'var(--green)' : 'var(--red)'}"></div></div>` : ''}
                    ${w.notas ? `<div class="watchlist-notes">${Utils.escapeHtml(w.notas)}</div>` : ''}
                    <div class="watchlist-actions">
                        <button class="btn btn-sm btn-primary" onclick="App.buyFromWatchlist('${w.id}')">Comprar</button>
                        <button class="btn btn-sm btn-danger" onclick="App.deleteWatchItem('${w.id}')">Remover</button>
                    </div>
                </div>`;
            }).join('');
        },

        // ==================== CALENDARIO ====================
        renderCalendario() {
            this._primeDividends();
            this._renderCalendarioUI();
            this._refreshDividends(() => {
                if (this.currentTab === 'calendario') this._renderCalendarioUI();
            });
        },

        _renderCalendarioUI() {
            const container = document.getElementById('calendario-content');
            if (!container) return;
            const token = this._getBrapiToken();
            const today = Utils.todayStr();
            const tickers = this._dividendTickers();

            const allProvs = this._getAllProventos();
            const rows = allProvs.map(p => ({
                date: p.date, dataBase: p.dataBase || '',
                ativo: p.ativo, tipo: Utils.getProventoTypeLabel(p.tipo),
                valorCota: p.valorCota, qtd: p.qtd, total: p.total,
                origem: p.brapi ? 'brapi' : (p.synthetic ? 'estimado' : 'meu'),
            }));

            rows.sort((a, b) => b.date.localeCompare(a.date));
            const shown = rows.slice(0, 100);

            if (shown.length === 0) {
                const emptyNote = token ? this._missingDividendNote() : '';
                container.innerHTML = '<div class="empty-state"><p>Nenhum provento encontrado. Adicione proventos na aba Proventos'
                    + (token ? '' : ' ou configure seu token brapi.dev no topo da pagina para buscar dividendos dos seus ativos')
                    + '.</p>'
                    + (emptyNote ? `<p style="font-size:13px">${emptyNote}</p>` : '')
                    + '</div>';
                return;
            }

            const origemLabel = { meu: 'Meu registro', estimado: 'Estimado (CDI)', brapi: 'brapi.dev' };
            let html = '<div class="card"><div class="card-header"><h3>Proventos dos seus Ativos</h3></div>';
            if (!token && tickers.length > 0) {
                html += '<p style="padding:0 20px 12px;color:var(--text-secondary);font-size:13px">Configure seu token brapi.dev no topo da pagina para incluir tambem os dividendos publicados das suas acoes e FIIs.</p>';
            }
            const note = token ? this._missingDividendNote() : '';
            if (note) {
                html += `<p style="padding:0 20px 12px;color:var(--text-secondary);font-size:13px">${note}</p>`;
            }
            html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Data Pgto</th><th>Data Base</th><th>Ativo</th><th>Tipo</th><th>Valor/Cota</th><th>Qtd</th><th>Total</th><th>Origem</th></tr></thead><tbody>';
            for (const r of shown) {
                const future = r.date > today ? ' <span class="badge badge-compra">Futuro</span>' : '';
                const dataBase = r.dataBase ? Utils.formatDate(r.dataBase) : '-';
                html += `<tr><td>${Utils.formatDate(r.date)}${future}</td><td>${dataBase}</td><td><strong>${Utils.escapeHtml(r.ativo)}</strong></td><td>${Utils.escapeHtml(r.tipo)}</td>`
                    + `<td class="mono">R$ ${Number(r.valorCota || 0).toFixed(4)}</td>`
                    + `<td class="mono">${Utils.formatNumber(r.qtd, r.qtd < 1 ? 6 : 0)}</td>`
                    + `<td class="mono text-green">${Utils.formatCurrency(r.total)}</td>`
                    + `<td>${origemLabel[r.origem]}</td></tr>`;
            }
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        },

        // ==================== MODALS ====================
        bindModals() {
            document.querySelectorAll('[data-close]').forEach(btn => {
                if (!btn._bound) {
                    btn._bound = true;
                    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open'));
                }
            });
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                if (!overlay._bound) {
                    overlay._bound = true;
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
                }
            });

            const addTx = document.getElementById('btn-add-transacao');
            if (addTx && !addTx._bound) { addTx._bound = true; addTx.addEventListener('click', () => this.openTransactionModal()); }
            const addProv = document.getElementById('btn-add-provento');
            if (addProv && !addProv._bound) { addProv._bound = true; addProv.addEventListener('click', () => this.openProventoModal()); }
            const addSeg = document.getElementById('btn-add-seguindo');
            if (addSeg && !addSeg._bound) { addSeg._bound = true; addSeg.addEventListener('click', () => this.openSeguindoModal()); }
        },

        openTransactionModal(txData = null) {
            const form = document.getElementById('form-transacao');
            if (txData) {
                document.getElementById('modal-trans-title').textContent = 'Editar Transação';
                document.getElementById('trans-edit-id').value = txData.id;
                document.getElementById('trans-operacao').value = txData.operacao;
                document.getElementById('trans-data').value = txData.date;
                document.getElementById('trans-ticker').value = txData.ticker;
                document.getElementById('trans-classe').value = txData.classe;
                document.getElementById('trans-setor').value = txData.setor || 'outros';
                document.getElementById('trans-qtd').value = txData.qtd;
                document.getElementById('trans-preco').value = txData.preco;
                document.getElementById('trans-taxas').value = txData.taxas || 0;
                document.getElementById('trans-preco-atual').value = txData.precoAtual || '';
                this._toggleRendaFixaForm(txData.classe === 'renda-fixa');
            } else {
                document.getElementById('modal-trans-title').textContent = 'Nova Transação';
                form.reset();
                document.getElementById('trans-edit-id').value = '';
                document.getElementById('trans-data').value = Utils.todayStr();
                this._toggleRendaFixaForm(false);
            }
            document.getElementById('modal-transacao').classList.add('open');
        },

        openProventoModal(pData = null) {
            const { portfolio, proventos } = this.cache;
            const select = document.getElementById('prov-ativo');
            const allTickers = [...new Set([...Object.keys(portfolio), ...proventos.map(p => p.ativo)])].sort();
            select.innerHTML = '<option value="">Selecione...</option>' + allTickers.map(t => `<option value="${t}">${t}</option>`).join('');

            if (pData) {
                document.getElementById('modal-prov-title').textContent = 'Editar Provento';
                document.getElementById('prov-edit-id').value = pData.id;
                select.value = pData.ativo;
                document.getElementById('prov-data').value = pData.date;
                document.getElementById('prov-tipo').value = pData.tipo;
                document.getElementById('prov-valor-cota').value = pData.valorCota;
                document.getElementById('prov-qtd').value = pData.qtd;
                document.getElementById('prov-total').value = pData.total;
            } else {
                document.getElementById('modal-prov-title').textContent = 'Adicionar Provento';
                document.getElementById('form-provento').reset();
                document.getElementById('prov-edit-id').value = '';
                document.getElementById('prov-data').value = Utils.todayStr();
            }
            document.getElementById('modal-provento').classList.add('open');
        },

        openSeguindoModal() {
            document.getElementById('form-seguindo').reset();
            document.getElementById('modal-seguindo').classList.add('open');
        },

        // ==================== FORMS ====================
        _toggleRendaFixaForm(isRF) {
            document.getElementById('label-qtd').textContent = isRF ? 'Quantidade (1)' : 'Quantidade';
            document.getElementById('label-preco').textContent = isRF ? 'Valor Investido (R$)' : 'Preço Unitário (R$)';
            document.getElementById('label-preco-atual').textContent = isRF ? '% do CDI' : 'Preço Atual (R$)';
            const qtdInput = document.getElementById('trans-qtd');
            const precoAtualInput = document.getElementById('trans-preco-atual');
            const taxasGroup = document.getElementById('group-taxas');
            if (isRF) {
                qtdInput.value = 1;
                qtdInput.readOnly = true;
                qtdInput.style.opacity = '0.5';
                if (!precoAtualInput.value) precoAtualInput.value = '100';
                precoAtualInput.placeholder = 'Ex: 115';
                taxasGroup.style.display = 'none';
            } else {
                qtdInput.readOnly = false;
                qtdInput.style.opacity = '1';
                precoAtualInput.placeholder = '';
                taxasGroup.style.display = '';
            }
        },

        bindForms() {
            const classeSelect = document.getElementById('trans-classe');
            if (classeSelect && !classeSelect._rfBound) {
                classeSelect._rfBound = true;
                classeSelect.addEventListener('change', (e) => {
                    this._toggleRendaFixaForm(e.target.value === 'renda-fixa');
                });
            }

            const txForm = document.getElementById('form-transacao');
            if (txForm && !txForm._bound) {
                txForm._bound = true;
                txForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const editId = document.getElementById('trans-edit-id').value;
                    const tx = {
                        date: document.getElementById('trans-data').value,
                        operacao: document.getElementById('trans-operacao').value,
                        ticker: document.getElementById('trans-ticker').value.toUpperCase().trim(),
                        classe: document.getElementById('trans-classe').value,
                        setor: document.getElementById('trans-setor').value,
                        qtd: parseFloat(document.getElementById('trans-qtd').value),
                        preco: parseFloat(document.getElementById('trans-preco').value),
                        taxas: parseFloat(document.getElementById('trans-taxas').value) || 0,
                        precoAtual: parseFloat(document.getElementById('trans-preco-atual').value) || 0,
                    };
                    if (!tx.ticker || !tx.date || tx.qtd <= 0 || tx.preco <= 0) { Utils.showToast('Preencha todos os campos obrigatórios', 'error'); return; }

                    try {
                        if (editId) { await DB.updateTransaction(editId, tx); Utils.showToast('Transação atualizada!', 'success'); }
                        else { await DB.addTransaction(tx); Utils.showToast('Transação adicionada!', 'success'); }
                        document.getElementById('modal-transacao').classList.remove('open');
                        await this.refreshCache();
                        this.navigate(this.currentTab);
                    } catch (err) { Utils.showToast('Erro ao salvar: ' + err.message, 'error'); }
                });
            }

            const provForm = document.getElementById('form-provento');
            if (provForm && !provForm._bound) {
                provForm._bound = true;
                provForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const editId = document.getElementById('prov-edit-id').value;
                    const valorCota = parseFloat(document.getElementById('prov-valor-cota').value);
                    const qtd = parseFloat(document.getElementById('prov-qtd').value);
                    const p = {
                        date: document.getElementById('prov-data').value,
                        ativo: document.getElementById('prov-ativo').value.toUpperCase().trim(),
                        tipo: document.getElementById('prov-tipo').value,
                        valorCota, qtd, total: valorCota * qtd,
                    };
                    if (!p.ativo || !p.date || p.valorCota <= 0 || p.qtd <= 0) { Utils.showToast('Preencha todos os campos obrigatórios', 'error'); return; }

                    try {
                        if (editId) { await DB.updateProvento(editId, p); Utils.showToast('Provento atualizado!', 'success'); }
                        else { await DB.addProvento(p); Utils.showToast('Provento adicionado!', 'success'); }
                        document.getElementById('modal-provento').classList.remove('open');
                        await this.refreshCache();
                        this.navigate(this.currentTab);
                    } catch (err) { Utils.showToast('Erro ao salvar: ' + err.message, 'error'); }
                });
            }

            const provValorCota = document.getElementById('prov-valor-cota');
            const provQtd = document.getElementById('prov-qtd');
            const provTotal = document.getElementById('prov-total');
            const calcTotal = () => { provTotal.value = ((parseFloat(provValorCota.value) || 0) * (parseFloat(provQtd.value) || 0)).toFixed(2); };
            if (provValorCota && !provValorCota._bound) { provValorCota._bound = true; provValorCota.addEventListener('input', calcTotal); }
            if (provQtd && !provQtd._bound) { provQtd._bound = true; provQtd.addEventListener('input', calcTotal); }

            const provAtivo = document.getElementById('prov-ativo');
            if (provAtivo && !provAtivo._bound) {
                provAtivo._bound = true;
                provAtivo.addEventListener('change', (e) => {
                    const h = this.cache.portfolio[e.target.value];
                    if (h) { document.getElementById('prov-qtd').value = h.qtd; calcTotal(); }
                });
            }

            const segForm = document.getElementById('form-seguindo');
            if (segForm && !segForm._bound) {
                segForm._bound = true;
                segForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const item = {
                        ticker: document.getElementById('seg-ticker').value.toUpperCase().trim(),
                        classe: document.getElementById('seg-classe').value,
                        preco: parseFloat(document.getElementById('seg-preco').value) || 0,
                        alvo: parseFloat(document.getElementById('seg-alvo').value) || null,
                        notas: document.getElementById('seg-notas').value.trim(),
                    };
                    if (!item.ticker) { Utils.showToast('Informe o ticker do ativo', 'error'); return; }
                    try {
                        await DB.addWatchItem(item);
                        Utils.showToast('Ativo adicionado!', 'success');
                        document.getElementById('modal-seguindo').classList.remove('open');
                        await this.refreshCache();
                        this.renderSeguindo();
                    } catch (err) { Utils.showToast('Erro ao salvar: ' + err.message, 'error'); }
                });
            }

            const provFilterType = document.getElementById('prov-filter-type');
            if (provFilterType && !provFilterType._bound) { provFilterType._bound = true; provFilterType.addEventListener('change', () => this._renderProventosTable()); }
            const provFilterAsset = document.getElementById('prov-filter-asset');
            if (provFilterAsset && !provFilterAsset._bound) { provFilterAsset._bound = true; provFilterAsset.addEventListener('change', () => this._renderProventosTable()); }
        },

        // ==================== ACTIONS ====================
        editTransaction(id) {
            const tx = this.cache.transactions.find(t => t.id === id);
            if (tx) this.openTransactionModal(tx);
        },

        async deleteTransaction(id) {
            if (await Utils.confirm('Excluir Transação', 'Tem certeza que deseja excluir esta transação?')) {
                await DB.deleteTransaction(id);
                Utils.showToast('Transação excluída', 'success');
                await this.refreshCache();
                this.navigate(this.currentTab);
            }
        },

        editProvento(id) {
            const p = this.cache.proventos.find(x => x.id === id);
            if (p) this.openProventoModal(p);
        },

        async deleteProvento(id) {
            if (await Utils.confirm('Excluir Provento', 'Tem certeza que deseja excluir este provento?')) {
                await DB.deleteProvento(id);
                Utils.showToast('Provento excluído', 'success');
                await this.refreshCache();
                this.navigate(this.currentTab);
            }
        },

        async deleteWatchItem(id) {
            if (await Utils.confirm('Remover Ativo', 'Tem certeza que deseja parar de seguir este ativo?')) {
                await DB.deleteWatchItem(id);
                Utils.showToast('Ativo removido', 'success');
                await this.refreshCache();
                this.renderSeguindo();
            }
        },

        buyFromWatchlist(id) {
            const w = this.cache.watchlist.find(x => x.id === id);
            if (w) {
                this.navigate('transacoes');
                setTimeout(() => {
                    this.openTransactionModal();
                    document.getElementById('trans-ticker').value = w.ticker;
                    document.getElementById('trans-classe').value = w.classe;
                    document.getElementById('trans-preco').value = w.preco || '';
                    document.getElementById('trans-preco-atual').value = w.preco || '';
                }, 100);
            }
        },

        // ==================== THEME ====================
        bindTheme() {
            const btn = document.getElementById('btn-theme');
            if (btn && !btn._bound) {
                btn._bound = true;
                btn.addEventListener('click', async () => {
                    const current = document.body.getAttribute('data-theme');
                    const next = current === 'dark' ? 'light' : 'dark';
                    document.body.setAttribute('data-theme', next);
                    await DB.updateSettings({ theme: next });
                    Charts.destroyAll();
                    this.render(this.currentTab);
                });
            }
        },

        // ==================== CDI ====================
        bindCdi() {
            const el = document.getElementById('cdi-rate');
            if (el && !el._bound) {
                el._bound = true;
                el.addEventListener('change', async (e) => {
                    const rate = parseFloat(e.target.value) || 13.15;
                    await DB.updateSettings({ cdi_rate: rate });
                    await this.refreshCache();
                    if (['rentabilidade', 'dashboard', 'patrimonio', 'proventos', 'calendario'].includes(this.currentTab)) {
                        Charts.destroyAll();
                        this.render(this.currentTab);
                    }
                });
            }
        },

        // ==================== BRAPI TOKEN ====================
        bindBrapiToken() {
            const el = document.getElementById('brapi-token');
            if (el && !el._bound) {
                el._bound = true;
                el.addEventListener('change', (e) => {
                    const token = e.target.value.trim();
                    try {
                        localStorage.setItem('brapi_token', token);
                    } catch (err) {}
                    if (token) {
                        Utils.showToast('Token brapi.dev salvo!', 'success');
                    }
                });
            }
        },

        _getBrapiToken() {
            try {
                return localStorage.getItem('brapi_token') || '';
            } catch (e) {
                return '';
            }
        },

        async autoUpdatePrices() {
            const token = this._getBrapiToken();
            if (!token) return;
            try {
                const prices = await PriceAPI.updateAllPrices(token);
                if (Object.keys(prices).length > 0) {
                    await this.refreshCache();
                    if (this.currentTab === 'dashboard') this.renderDashboard();
                    if (this.currentTab === 'carteira') this.renderPatrimonio();
                }
            } catch (e) {
                console.error('Auto price update failed:', e);
            }
        },

        // ==================== EXPORT/IMPORT ====================
        bindExport() {
            const expBtn = document.getElementById('btn-export');
            if (expBtn && !expBtn._bound) {
                expBtn._bound = true;
                expBtn.addEventListener('click', async () => {
                    const data = await DB.exportData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `investtracker-backup-${Utils.todayStr()}.json`; a.click();
                    URL.revokeObjectURL(url);
                    Utils.showToast('Dados exportados!', 'success');
                });
            }

            const impBtn = document.getElementById('btn-import');
            if (impBtn && !impBtn._bound) {
                impBtn._bound = true;
                impBtn.addEventListener('click', () => document.getElementById('import-file').click());
            }

            const impFile = document.getElementById('import-file');
            if (impFile && !impFile._bound) {
                impFile._bound = true;
                impFile.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        try {
                            const data = JSON.parse(ev.target.result);
                            await DB.importData(data);
                            await this.refreshCache();
                            Utils.showToast('Dados importados!', 'success');
                            Charts.destroyAll();
                            this.navigate(this.currentTab);
                        } catch { Utils.showToast('Erro ao importar dados.', 'error'); }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                });
            }
        },

        // ==================== UPDATE PRICES ====================
        bindUpdatePrices() {
            const btn = document.getElementById('btn-update-prices');
            if (btn && !btn._bound) {
                btn._bound = true;
                btn.addEventListener('click', async () => {
                    const token = this._getBrapiToken();
                    if (!token) {
                        this.openPriceUpdateModal();
                        return;
                    }
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                    try {
                        const prices = await PriceAPI.updateAllPrices(token);
                        const count = Object.keys(prices).length;
                        if (count > 0) {
                            await DB._takeSnapshot();
                            await this.refreshCache();
                            Charts.destroyAll();
                            this.navigate(this.currentTab);
                            Utils.showToast(`${count} cotacoes atualizadas!`, 'success');
                        } else {
                            Utils.showToast('Nenhuma cotacao encontrada', 'error');
                        }
                    } catch (e) {
                        console.error('Price update error:', e);
                        Utils.showToast('Erro ao atualizar cotacoes', 'error');
                    }
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
            }
            const saveBtn = document.getElementById('btn-save-precos');
            if (saveBtn && !saveBtn._bound) {
                saveBtn._bound = true;
                saveBtn.addEventListener('click', async () => {
                    const rows = document.querySelectorAll('#preco-tbody tr');
                    for (const row of rows) {
                        const ticker = row.dataset.ticker;
                        const input = row.querySelector('input');
                        if (ticker && input && input.value) {
                            await DB.updatePrice(ticker, parseFloat(input.value));
                        }
                    }
                    await DB._takeSnapshot();
                    document.getElementById('modal-preco').classList.remove('open');
                    Utils.showToast('Precos atualizados!', 'success');
                    await this.refreshCache();
                    Charts.destroyAll();
                    this.navigate(this.currentTab);
                });
            }
        },

        openPriceUpdateModal() {
            const sorted = Object.values(this.cache.portfolio).sort((a, b) => a.ticker.localeCompare(b.ticker));
            document.getElementById('preco-tbody').innerHTML = sorted.map(h => `
                <tr data-ticker="${h.ticker}">
                    <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                    <td class="mono">${Utils.formatCurrency(h.currentPrice)}</td>
                    <td><input type="number" step="0.01" min="0" value="${h.currentPrice.toFixed(2)}" style="width:120px"></td>
                </tr>
            `).join('');
            document.getElementById('modal-preco').classList.add('open');
        },
    };

    window.App = App;
    App.init();
});
