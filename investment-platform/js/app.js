document.addEventListener('DOMContentLoaded', () => {
    const App = {
        currentTab: 'dashboard',

        init() {
            this.applyTheme();
            this.applyCdiRate();
            this.bindNav();
            this.bindModals();
            this.bindTheme();
            this.bindExport();
            this.bindCdi();
            this.bindForms();
            this.bindUpdatePrices();
            this.checkFirstRun();
            this.navigate('dashboard');
        },

        checkFirstRun() {
            if (Store.getTransactions().length === 0) {
                Utils.generateSampleData();
                Utils.showToast('Dados de exemplo carregados!', 'success');
            }
        },

        applyTheme() {
            const theme = Store.getTheme();
            document.body.setAttribute('data-theme', theme);
        },

        applyCdiRate() {
            document.getElementById('cdi-rate').value = Store.getCdiRate();
        },

        bindNav() {
            document.querySelectorAll('.nav-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.navigate(btn.dataset.tab);
                });
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
            }
        },

        // ==================== DASHBOARD ====================
        renderDashboard() {
            const portfolio = Store.getPortfolio();
            const totalValue = Store.getTotalValue();
            const totalInvested = Store.getTotalInvested();
            const profit = totalValue - totalInvested;
            const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

            const proventos = Store.getProventos();
            const now = new Date();
            const thisMonth = now.toISOString().slice(0, 7);
            const provMes = proventos.filter(p => p.date.startsWith(thisMonth)).reduce((s, p) => s + p.total, 0);
            const provCount = proventos.filter(p => p.date.startsWith(thisMonth)).length;

            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
            const prov12m = proventos.filter(p => p.date >= oneYearAgo).reduce((s, p) => s + p.total, 0);
            const yieldPct = totalInvested > 0 ? (prov12m / totalInvested) * 100 : 0;

            const cdiRate = Store.getCdiRate();
            const firstTx = Store.getTransactions().sort((a, b) => a.date.localeCompare(b.date))[0];
            let cdiPct = 0;
            if (firstTx && totalInvested > 0) {
                const days = Utils.businessDaysBetween(firstTx.date, Utils.todayStr());
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
            const snapshots = Store.getSnapshots();
            if (snapshots.length < 2) {
                const portfolio = Store.getPortfolio();
                const txs = Store.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
                if (txs.length === 0) return;
                const months = Utils.getMonthsRange(txs[0].date.slice(0, 7), Utils.todayStr().slice(0, 7));
                const labels = months.map(m => Utils.formatDateShort(m + '-01'));
                const values = [];
                let runningValue = 0;
                for (const month of months) {
                    const monthTxs = txs.filter(t => t.date.startsWith(month));
                    for (const tx of monthTxs) {
                        const price = Store.getPrices()[tx.ticker.toUpperCase()] || tx.preco;
                        if (tx.operacao === 'compra') runningValue += tx.qtd * price;
                        else runningValue -= tx.qtd * price;
                    }
                    values.push(Math.max(0, runningValue));
                }
                const lastVal = Store.getTotalValue();
                if (values.length > 0) values[values.length - 1] = lastVal;
                Charts.createLine('chart-dash-patrimonio', labels, [{ data: values, label: 'Patrimônio', fill: true, color: Utils.getChartColors()[0] }]);
            } else {
                const labels = snapshots.map(s => Utils.formatDateShort(s.date));
                const values = snapshots.map(s => s.value);
                Charts.createLine('chart-dash-patrimonio', labels, [{ data: values, label: 'Patrimônio', fill: true, color: Utils.getChartColors()[0] }]);
            }
        },

        _renderDashComposicaoChart(portfolio) {
            const byType = {};
            for (const h of Object.values(portfolio)) {
                const label = Utils.getAssetTypeLabel(h.classe);
                byType[label] = (byType[label] || 0) + h.currentValue;
            }
            const labels = Object.keys(byType);
            const data = Object.values(byType);
            if (labels.length === 0) {
                labels.push('Sem ativos');
                data.push(1);
            }
            Charts.createPie('chart-dash-composicao', labels, data, { doughnut: true });
        },

        _renderDashProventosChart(proventos) {
            const now = new Date();
            const months = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(d.toISOString().slice(0, 7));
            }
            const labels = months.map(m => Utils.formatDateShort(m + '-01'));
            const data = months.map(m => proventos.filter(p => p.date.startsWith(m)).reduce((s, p) => s + p.total, 0));
            Charts.createBar('chart-dash-proventos', labels, [{ data, label: 'Proventos', color: Utils.getChartColors()[1] }]);
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
            `).join('');
            if (sorted.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="no-data">Nenhum ativo na carteira</td></tr>';
            }
        },

        // ==================== PATRIMONIO ====================
        renderPatrimonio() {
            const portfolio = Store.getPortfolio();
            const totalValue = Store.getTotalValue();
            const totalInvested = Store.getTotalInvested();
            const profit = totalValue - totalInvested;
            const numAssets = Object.keys(portfolio).length;

            document.getElementById('pat-total').textContent = Utils.formatCurrency(totalValue);
            document.getElementById('pat-investido').textContent = Utils.formatCurrency(totalInvested);
            const lucroEl = document.getElementById('pat-lucro');
            lucroEl.textContent = Utils.formatCurrency(profit);
            lucroEl.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
            document.getElementById('pat-ativos').textContent = numAssets;

            this._renderDashPatrimonioChart();
            const canvas = document.getElementById('chart-patrimonio');
            if (canvas) {
                const snapshots = Store.getSnapshots();
                const txs = Store.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
                if (txs.length > 0) {
                    const months = Utils.getMonthsRange(txs[0].date.slice(0, 7), Utils.todayStr().slice(0, 7));
                    const labels = months.map(m => Utils.formatDateShort(m + '-01'));
                    let values;
                    if (snapshots.length >= 2) {
                        values = snapshots.map(s => s.value);
                        const snapLabels = snapshots.map(s => Utils.formatDateShort(s.date));
                        Charts.createLine('chart-patrimonio', snapLabels, [{ data: values, label: 'Patrimônio', fill: true, color: Utils.getChartColors()[0] }]);
                    } else {
                        values = [];
                        let rv = 0;
                        for (const month of months) {
                            const mTxs = txs.filter(t => t.date.startsWith(month));
                            for (const tx of mTxs) {
                                const price = Store.getPrices()[tx.ticker.toUpperCase()] || tx.preco;
                                if (tx.operacao === 'compra') rv += tx.qtd * price;
                                else rv -= tx.qtd * price;
                            }
                            values.push(Math.max(0, rv));
                        }
                        if (values.length > 0) values[values.length - 1] = totalValue;
                        Charts.createLine('chart-patrimonio', labels, [{ data: values, label: 'Patrimônio', fill: true, color: Utils.getChartColors()[0] }]);
                    }
                }
            }

            const sorted = Object.values(portfolio).sort((a, b) => b.currentValue - a.currentValue);
            const tbody = document.getElementById('pat-assets-tbody');
            tbody.innerHTML = sorted.map(h => `
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
            `).join('');
            if (sorted.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="no-data">Nenhum ativo na carteira</td></tr>';
            }
        },

        // ==================== PROVENTOS ====================
        renderProventos() {
            const proventos = Store.getProventos();
            const totalInvested = Store.getTotalInvested();
            const now = new Date();
            const thisMonth = now.toISOString().slice(0, 7);
            const thisYear = String(now.getFullYear());
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);

            const provMes = proventos.filter(p => p.date.startsWith(thisMonth)).reduce((s, p) => s + p.total, 0);
            const provAno = proventos.filter(p => p.date.startsWith(thisYear)).reduce((s, p) => s + p.total, 0);
            const prov12m = proventos.filter(p => p.date >= oneYearAgo).reduce((s, p) => s + p.total, 0);
            const yieldPct = totalInvested > 0 ? (prov12m / totalInvested) * 100 : 0;

            document.getElementById('prov-mes').textContent = Utils.formatCurrency(provMes);
            document.getElementById('prov-ano').textContent = Utils.formatCurrency(provAno);
            document.getElementById('prov-12m').textContent = Utils.formatCurrency(prov12m);
            document.getElementById('prov-yield').textContent = Utils.formatNumber(yieldPct) + '%';

            const months = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(d.toISOString().slice(0, 7));
            }
            const labels = months.map(m => Utils.formatDateShort(m + '-01'));
            const data = months.map(m => proventos.filter(p => p.date.startsWith(m)).reduce((s, p) => s + p.total, 0));
            Charts.createBar('chart-proventos', labels, [{ data, label: 'Proventos', color: Utils.getChartColors()[1] }]);

            const byTipo = {};
            proventos.forEach(p => { byTipo[p.tipo] = (byTipo[p.tipo] || 0) + p.total; });
            Charts.createPie('chart-proventos-tipo',
                Object.keys(byTipo).map(Utils.getProventoTypeLabel),
                Object.values(byTipo),
                { doughnut: true }
            );

            const byAtivo = {};
            proventos.forEach(p => { byAtivo[p.ativo] = (byAtivo[p.ativo] || 0) + p.total; });
            const sortedAtivos = Object.entries(byAtivo).sort((a, b) => b[1] - a[1]).slice(0, 8);
            Charts.createPie('chart-proventos-ativos',
                sortedAtivos.map(a => a[0]),
                sortedAtivos.map(a => a[1]),
                { doughnut: true }
            );

            this._populateProventoAssetFilter();
            this._renderProventosTable();
        },

        _populateProventoAssetFilter() {
            const portfolio = Store.getPortfolio();
            const select = document.getElementById('prov-filter-asset');
            const current = select.value;
            select.innerHTML = '<option value="">Todos os ativos</option>';
            for (const ticker of Object.keys(portfolio).sort()) {
                select.innerHTML += `<option value="${ticker}">${ticker}</option>`;
            }
            const allTickers = [...new Set(Store.getProventos().map(p => p.ativo))];
            for (const t of allTickers) {
                if (!portfolio[t]) {
                    select.innerHTML += `<option value="${t}">${t}</option>`;
                }
            }
            select.value = current;
        },

        _renderProventosTable() {
            const proventos = Store.getProventos();
            const filterType = document.getElementById('prov-filter-type').value;
            const filterAsset = document.getElementById('prov-filter-asset').value;

            let filtered = proventos;
            if (filterType) filtered = filtered.filter(p => p.tipo === filterType);
            if (filterAsset) filtered = filtered.filter(p => p.ativo === filterAsset);

            const tbody = document.getElementById('prov-tbody');
            tbody.innerHTML = filtered.map(p => `
                <tr>
                    <td>${Utils.formatDate(p.date)}</td>
                    <td><strong>${Utils.escapeHtml(p.ativo)}</strong></td>
                    <td>${Utils.getProventoTypeLabel(p.tipo)}</td>
                    <td class="mono">${Utils.formatCurrency(p.valorCota)}</td>
                    <td class="mono">${Utils.formatNumber(p.qtd, p.qtd < 1 ? 6 : 0)}</td>
                    <td class="mono text-green">${Utils.formatCurrency(p.total)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn" onclick="App.editProvento('${p.id}')" title="Editar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button class="action-btn delete" onclick="App.deleteProvento('${p.id}')" title="Excluir">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="no-data">Nenhum provento registrado</td></tr>';
            }
        },

        // ==================== RENTABILIDADE ====================
        renderRentabilidade() {
            const portfolio = Store.getPortfolio();
            const totalValue = Store.getTotalValue();
            const totalInvested = Store.getTotalInvested();
            const profitPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
            const cdiRate = Store.getCdiRate();

            const txs = Store.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
            const firstDate = txs.length > 0 ? txs[0].date : Utils.todayStr();
            const totalDays = Utils.businessDaysBetween(firstDate, Utils.todayStr());
            const cdiTotal = Utils.calculateCDI(cdiRate, totalDays) * 100;
            const vsCdi = cdiTotal > 0 ? (profitPct / cdiTotal) * 100 : 0;

            const currentYear = String(new Date().getFullYear());
            const janFirst = `${currentYear}-01-01`;
            const yearDays = Utils.businessDaysBetween(janFirst, Utils.todayStr());
            const cdiYear = Utils.calculateCDI(cdiRate, yearDays) * 100;

            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthStr = lastMonth.toISOString().slice(0, 7);
            const thisMonthStr = new Date().toISOString().slice(0, 7);
            const monthDays = Utils.businessDaysBetween(thisMonthStr + '-01', Utils.todayStr());
            const cdiMonth = Utils.calculateCDI(cdiRate, monthDays) * 100;

            document.getElementById('rent-total').textContent = Utils.formatPercent(profitPct);
            document.getElementById('rent-total').style.color = profitPct >= 0 ? 'var(--green)' : 'var(--red)';
            document.getElementById('rent-mes').textContent = Utils.formatPercent(cdiMonth);
            document.getElementById('rent-ano').textContent = Utils.formatPercent(cdiYear);
            document.getElementById('rent-cdi').textContent = Utils.formatNumber(vsCdi) + '%';

            if (txs.length > 0) {
                const months = Utils.getMonthsRange(txs[0].date.slice(0, 7), Utils.todayStr().slice(0, 7));
                const labels = months.map(m => Utils.formatDateShort(m + '-01'));

                const portfolioReturns = [];
                const cdiReturns = [];
                let cumInvested = 0;
                let cumValue = 0;

                for (const month of months) {
                    const mTxs = txs.filter(t => t.date.startsWith(month));
                    for (const tx of mTxs) {
                        if (tx.operacao === 'compra') {
                            cumInvested += tx.qtd * tx.preco + (tx.taxas || 0);
                            cumValue += tx.qtd * (Store.getPrices()[tx.ticker.toUpperCase()] || tx.preco);
                        } else {
                            const portfolio = Store.getPortfolio();
                            const h = portfolio[tx.ticker.toUpperCase()];
                            const avgP = h ? h.avgPrice : tx.preco;
                            cumInvested -= tx.qtd * avgP;
                            cumValue -= tx.qtd * (Store.getPrices()[tx.ticker.toUpperCase()] || tx.preco);
                        }
                    }
                    const ret = cumInvested > 0 ? ((cumValue - cumInvested) / cumInvested) * 100 : 0;
                    portfolioReturns.push(ret);

                    const days = Utils.businessDaysBetween(txs[0].date, month + '-28');
                    cdiReturns.push(Utils.calculateCDI(cdiRate, days) * 100);
                }

                if (portfolioReturns.length > 0) {
                    portfolioReturns[portfolioReturns.length - 1] = profitPct;
                }

                Charts.createLine('chart-rentabilidade', labels, [
                    { data: portfolioReturns, label: 'Carteira', color: Utils.getChartColors()[0], fill: true },
                    { data: cdiReturns, label: 'CDI', color: Utils.getChartColors()[3], dashed: true },
                ], {
                    yFormat: v => v.toFixed(1) + '%',
                    tooltipCallbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`,
                    },
                });

                const monthlyReturns = [];
                for (let i = 0; i < months.length; i++) {
                    if (i === 0) monthlyReturns.push(portfolioReturns[0]);
                    else {
                        const prev = 1 + portfolioReturns[i - 1] / 100;
                        const curr = 1 + portfolioReturns[i] / 100;
                        monthlyReturns.push(prev > 0 ? ((curr / prev) - 1) * 100 : 0);
                    }
                }

                const barColors = monthlyReturns.map(v => v >= 0 ? Utils.getChartColors()[1] : Utils.getChartColors()[4]);
                Charts.createBar('chart-rent-mensal', labels, [{
                    data: monthlyReturns,
                    label: 'Retorno Mensal',
                    colors: barColors,
                }], {
                    yFormat: v => v.toFixed(1) + '%',
                    tooltipCallbacks: {
                        label: ctx => ` ${ctx.raw.toFixed(2)}%`,
                    },
                });
            }

            const sorted = Object.values(portfolio).sort((a, b) => b.profitPct - a.profitPct);
            const tbody = document.getElementById('rent-tbody');
            tbody.innerHTML = sorted.map(h => {
                const days = Utils.businessDaysBetween(firstDate, Utils.todayStr());
                const cdiPeriod = Utils.calculateCDI(cdiRate, days) * 100;
                const vs = cdiPeriod > 0 ? (h.profitPct / cdiPeriod) * 100 : 0;
                return `
                    <tr>
                        <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                        <td><span class="badge badge-${h.classe}">${Utils.getAssetTypeLabel(h.classe)}</span></td>
                        <td class="mono ${h.profitPct >= 0 ? 'text-green' : 'text-red'}">${Utils.formatPercent(h.profitPct)}</td>
                        <td class="mono">-</td>
                        <td class="mono">-</td>
                        <td class="mono">${Utils.formatNumber(vs)}%</td>
                    </tr>
                `;
            }).join('');
            if (sorted.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">Nenhum ativo na carteira</td></tr>';
            }
        },

        // ==================== COMPOSICAO ====================
        renderComposicao() {
            const portfolio = Store.getPortfolio();
            const totalValue = Store.getTotalValue();

            const byType = {};
            const bySetor = {};
            for (const h of Object.values(portfolio)) {
                const typeLabel = Utils.getAssetTypeLabel(h.classe);
                byType[typeLabel] = (byType[typeLabel] || 0) + h.currentValue;
                const setorLabel = Utils.getSectorLabel(h.setor);
                bySetor[setorLabel] = (bySetor[setorLabel] || 0) + h.currentValue;
            }

            const typeLabels = Object.keys(byType);
            const typeData = Object.values(byType);
            Charts.createPie('chart-comp-tipo', typeLabels.length ? typeLabels : ['Sem ativos'], typeLabels.length ? typeData : [1], { doughnut: true });

            const typeLegend = document.getElementById('comp-tipo-legend');
            const colors = Utils.getChartColors();
            typeLegend.innerHTML = typeLabels.map((label, i) => `
                <div class="legend-item">
                    <span class="legend-dot" style="background:${colors[i]}"></span>
                    ${label}
                    <span class="legend-value">${Utils.formatCurrency(typeData[i])} (${totalValue > 0 ? ((typeData[i] / totalValue) * 100).toFixed(1) : 0}%)</span>
                </div>
            `).join('');

            const setorLabels = Object.keys(bySetor);
            const setorData = Object.values(bySetor);
            Charts.createPie('chart-comp-setor', setorLabels.length ? setorLabels : ['Sem setores'], setorLabels.length ? setorData : [1], { doughnut: true });

            const setorLegend = document.getElementById('comp-setor-legend');
            setorLegend.innerHTML = setorLabels.map((label, i) => `
                <div class="legend-item">
                    <span class="legend-dot" style="background:${colors[i]}"></span>
                    ${label}
                    <span class="legend-value">${Utils.formatCurrency(setorData[i])} (${totalValue > 0 ? ((setorData[i] / totalValue) * 100).toFixed(1) : 0}%)</span>
                </div>
            `).join('');

            const sorted = Object.values(portfolio).sort((a, b) => b.currentValue - a.currentValue);
            Charts.createHorizontalBar('chart-comp-ativos',
                sorted.map(h => h.ticker),
                sorted.map(h => h.currentValue)
            );

            const tbody = document.getElementById('comp-tbody');
            tbody.innerHTML = sorted.map(h => {
                const typePct = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                const typeTotal = byType[Utils.getAssetTypeLabel(h.classe)] || 0;
                const typePctInner = typeTotal > 0 ? (h.currentValue / typeTotal) * 100 : 0;
                return `
                    <tr>
                        <td><strong>${Utils.escapeHtml(h.ticker)}</strong></td>
                        <td><span class="badge badge-${h.classe}">${Utils.getAssetTypeLabel(h.classe)}</span></td>
                        <td>${Utils.getSectorLabel(h.setor)}</td>
                        <td class="mono">${Utils.formatCurrency(h.currentValue)}</td>
                        <td class="mono">${Utils.formatNumber(typePct)}%</td>
                        <td class="mono">${Utils.formatNumber(typePctInner)}%</td>
                    </tr>
                `;
            }).join('');
            if (sorted.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">Nenhum ativo na carteira</td></tr>';
            }
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
                    if (el.type === 'text') {
                        el.addEventListener('input', () => { this.transPage = 1; this._renderTransacoesTable(); });
                    }
                }
            });
            const clearBtn = document.getElementById('btn-clear-filters');
            if (clearBtn && !clearBtn._bound) {
                clearBtn._bound = true;
                clearBtn.addEventListener('click', () => {
                    document.getElementById('trans-filter-operation').value = '';
                    document.getElementById('trans-filter-class').value = '';
                    document.getElementById('trans-filter-from').value = '';
                    document.getElementById('trans-filter-to').value = '';
                    document.getElementById('trans-filter-ticker').value = '';
                    this.transPage = 1;
                    this._renderTransacoesTable();
                });
            }
        },

        _renderTransacoesTable() {
            let txs = Store.getTransactions();
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
            const start = (this.transPage - 1) * this.transPerPage;
            const paged = txs.slice(start, start + this.transPerPage);

            const tbody = document.getElementById('trans-tbody');
            tbody.innerHTML = paged.map(t => {
                const total = t.qtd * t.preco + (t.operacao === 'compra' ? (t.taxas || 0) : -(t.taxas || 0));
                return `
                    <tr>
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
                    </tr>
                `;
            }).join('');
            if (paged.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="no-data">Nenhuma transação encontrada</td></tr>';
            }

            const pagDiv = document.getElementById('trans-pagination');
            if (totalPages <= 1) { pagDiv.innerHTML = ''; return; }
            let pagHtml = '';
            for (let i = 1; i <= totalPages; i++) {
                pagHtml += `<button class="${i === this.transPage ? 'active' : ''}" onclick="App.transGoPage(${i})">${i}</button>`;
            }
            pagDiv.innerHTML = pagHtml;
        },

        transGoPage(page) {
            this.transPage = page;
            this._renderTransacoesTable();
        },

        // ==================== SEGUINDO ====================
        renderSeguindo() {
            const watchlist = Store.getWatchlist();
            const grid = document.getElementById('watchlist-grid');
            const empty = document.getElementById('seguindo-empty');

            if (watchlist.length === 0) {
                grid.style.display = 'none';
                empty.style.display = 'block';
                return;
            }
            grid.style.display = 'grid';
            empty.style.display = 'none';

            grid.innerHTML = watchlist.map(w => {
                const upside = w.alvo && w.preco ? ((w.alvo - w.preco) / w.preco * 100) : null;
                return `
                    <div class="watchlist-card">
                        <div class="watchlist-card-header">
                            <span class="watchlist-ticker">${Utils.escapeHtml(w.ticker)}</span>
                            <span class="badge badge-${w.classe}">${Utils.getAssetTypeLabel(w.classe)}</span>
                        </div>
                        <div class="watchlist-price">${Utils.formatCurrency(w.preco)}</div>
                        ${w.alvo ? `
                            <div class="watchlist-target">
                                Alvo: ${Utils.formatCurrency(w.alvo)}
                                ${upside !== null ? `<span class="${upside >= 0 ? 'text-green' : 'text-red'}">(${Utils.formatPercent(upside)})</span>` : ''}
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width:${Math.min(100, Math.max(0, (w.preco / w.alvo) * 100))}%;background:${upside >= 0 ? 'var(--green)' : 'var(--red)'}"></div>
                            </div>
                        ` : ''}
                        ${w.notas ? `<div class="watchlist-notes">${Utils.escapeHtml(w.notas)}</div>` : ''}
                        <div class="watchlist-actions">
                            <button class="btn btn-sm btn-primary" onclick="App.buyFromWatchlist('${w.id}')">Comprar</button>
                            <button class="btn btn-sm btn-danger" onclick="App.deleteWatchItem('${w.id}')">Remover</button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        // ==================== MODALS ====================
        bindModals() {
            document.querySelectorAll('[data-close]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById(btn.dataset.close).classList.remove('open');
                });
            });
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) overlay.classList.remove('open');
                });
            });

            document.getElementById('btn-add-transacao').addEventListener('click', () => this.openTransactionModal());
            document.getElementById('btn-add-provento').addEventListener('click', () => this.openProventoModal());
            document.getElementById('btn-add-seguindo').addEventListener('click', () => this.openSeguindoModal());
        },

        openTransactionModal(txData = null) {
            const modal = document.getElementById('modal-transacao');
            const title = document.getElementById('modal-trans-title');
            const form = document.getElementById('form-transacao');

            if (txData) {
                title.textContent = 'Editar Transação';
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
            } else {
                title.textContent = 'Nova Transação';
                form.reset();
                document.getElementById('trans-edit-id').value = '';
                document.getElementById('trans-data').value = Utils.todayStr();
            }
            modal.classList.add('open');
        },

        openProventoModal(pData = null) {
            const modal = document.getElementById('modal-provento');
            const title = document.getElementById('modal-prov-title');
            const form = document.getElementById('form-provento');
            const select = document.getElementById('prov-ativo');

            const portfolio = Store.getPortfolio();
            const allTickers = [...new Set([...Object.keys(portfolio), ...Store.getProventos().map(p => p.ativo)])].sort();
            select.innerHTML = '<option value="">Selecione...</option>' + allTickers.map(t => `<option value="${t}">${t}</option>`).join('');

            if (pData) {
                title.textContent = 'Editar Provento';
                document.getElementById('prov-edit-id').value = pData.id;
                select.value = pData.ativo;
                document.getElementById('prov-data').value = pData.date;
                document.getElementById('prov-tipo').value = pData.tipo;
                document.getElementById('prov-valor-cota').value = pData.valorCota;
                document.getElementById('prov-qtd').value = pData.qtd;
                document.getElementById('prov-total').value = pData.total;
            } else {
                title.textContent = 'Adicionar Provento';
                form.reset();
                document.getElementById('prov-edit-id').value = '';
                document.getElementById('prov-data').value = Utils.todayStr();
            }
            modal.classList.add('open');
        },

        openSeguindoModal() {
            document.getElementById('form-seguindo').reset();
            document.getElementById('modal-seguindo').classList.add('open');
        },

        // ==================== FORMS ====================
        bindForms() {
            document.getElementById('form-transacao').addEventListener('submit', (e) => {
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

                if (!tx.ticker || !tx.date || tx.qtd <= 0 || tx.preco <= 0) {
                    Utils.showToast('Preencha todos os campos obrigatórios', 'error');
                    return;
                }

                if (editId) {
                    Store.updateTransaction(editId, tx);
                    Utils.showToast('Transação atualizada!', 'success');
                } else {
                    Store.addTransaction(tx);
                    Utils.showToast('Transação adicionada!', 'success');
                }

                document.getElementById('modal-transacao').classList.remove('open');
                this.navigate(this.currentTab);
            });

            document.getElementById('form-provento').addEventListener('submit', (e) => {
                e.preventDefault();
                const editId = document.getElementById('prov-edit-id').value;
                const valorCota = parseFloat(document.getElementById('prov-valor-cota').value);
                const qtd = parseFloat(document.getElementById('prov-qtd').value);
                const p = {
                    date: document.getElementById('prov-data').value,
                    ativo: document.getElementById('prov-ativo').value.toUpperCase().trim(),
                    tipo: document.getElementById('prov-tipo').value,
                    valorCota,
                    qtd,
                    total: valorCota * qtd,
                };

                if (!p.ativo || !p.date || p.valorCota <= 0 || p.qtd <= 0) {
                    Utils.showToast('Preencha todos os campos obrigatórios', 'error');
                    return;
                }

                if (editId) {
                    Store.updateProvento(editId, p);
                    Utils.showToast('Provento atualizado!', 'success');
                } else {
                    Store.addProvento(p);
                    Utils.showToast('Provento adicionado!', 'success');
                }

                document.getElementById('modal-provento').classList.remove('open');
                this.navigate(this.currentTab);
            });

            const provValorCota = document.getElementById('prov-valor-cota');
            const provQtd = document.getElementById('prov-qtd');
            const provTotal = document.getElementById('prov-total');
            const calcTotal = () => {
                const v = parseFloat(provValorCota.value) || 0;
                const q = parseFloat(provQtd.value) || 0;
                provTotal.value = (v * q).toFixed(2);
            };
            provValorCota.addEventListener('input', calcTotal);
            provQtd.addEventListener('input', calcTotal);

            document.getElementById('prov-ativo').addEventListener('change', (e) => {
                const ticker = e.target.value;
                if (ticker) {
                    const portfolio = Store.getPortfolio();
                    const h = portfolio[ticker];
                    if (h) {
                        document.getElementById('prov-qtd').value = h.qtd;
                        calcTotal();
                    }
                }
            });

            document.getElementById('form-seguindo').addEventListener('submit', (e) => {
                e.preventDefault();
                const item = {
                    ticker: document.getElementById('seg-ticker').value.toUpperCase().trim(),
                    classe: document.getElementById('seg-classe').value,
                    preco: parseFloat(document.getElementById('seg-preco').value) || 0,
                    alvo: parseFloat(document.getElementById('seg-alvo').value) || null,
                    notas: document.getElementById('seg-notas').value.trim(),
                };
                if (!item.ticker) {
                    Utils.showToast('Informe o ticker do ativo', 'error');
                    return;
                }
                Store.addWatchItem(item);
                Utils.showToast('Ativo adicionado à lista de seguidos!', 'success');
                document.getElementById('modal-seguindo').classList.remove('open');
                this.renderSeguindo();
            });

            document.getElementById('prov-filter-type').addEventListener('change', () => this._renderProventosTable());
            document.getElementById('prov-filter-asset').addEventListener('change', () => this._renderProventosTable());
        },

        // ==================== ACTIONS ====================
        editTransaction(id) {
            const tx = Store.getTransactions().find(t => t.id === id);
            if (tx) this.openTransactionModal(tx);
        },

        async deleteTransaction(id) {
            const ok = await Utils.confirm('Excluir Transação', 'Tem certeza que deseja excluir esta transação?');
            if (ok) {
                Store.deleteTransaction(id);
                Utils.showToast('Transação excluída', 'success');
                this.navigate(this.currentTab);
            }
        },

        editProvento(id) {
            const p = Store.getProventos().find(x => x.id === id);
            if (p) this.openProventoModal(p);
        },

        async deleteProvento(id) {
            const ok = await Utils.confirm('Excluir Provento', 'Tem certeza que deseja excluir este provento?');
            if (ok) {
                Store.deleteProvento(id);
                Utils.showToast('Provento excluído', 'success');
                this.navigate(this.currentTab);
            }
        },

        async deleteWatchItem(id) {
            const ok = await Utils.confirm('Remover Ativo', 'Tem certeza que deseja parar de seguir este ativo?');
            if (ok) {
                Store.deleteWatchItem(id);
                Utils.showToast('Ativo removido', 'success');
                this.renderSeguindo();
            }
        },

        buyFromWatchlist(id) {
            const w = Store.getWatchlist().find(x => x.id === id);
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
            document.getElementById('btn-theme').addEventListener('click', () => {
                const current = Store.getTheme();
                const next = current === 'dark' ? 'light' : 'dark';
                Store.setTheme(next);
                document.body.setAttribute('data-theme', next);
                Charts.destroyAll();
                this.render(this.currentTab);
            });
        },

        // ==================== CDI ====================
        bindCdi() {
            document.getElementById('cdi-rate').addEventListener('change', (e) => {
                const rate = parseFloat(e.target.value) || 13.15;
                Store.setCdiRate(rate);
                if (this.currentTab === 'rentabilidade' || this.currentTab === 'dashboard') {
                    Charts.destroyAll();
                    this.render(this.currentTab);
                }
            });
        },

        // ==================== EXPORT/IMPORT ====================
        bindExport() {
            document.getElementById('btn-export').addEventListener('click', () => {
                const data = Store.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `investtracker-backup-${Utils.todayStr()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                Utils.showToast('Dados exportados com sucesso!', 'success');
            });

            document.getElementById('btn-import').addEventListener('click', () => {
                document.getElementById('import-file').click();
            });

            document.getElementById('import-file').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        Store.importData(data);
                        Utils.showToast('Dados importados com sucesso!', 'success');
                        Charts.destroyAll();
                        this.navigate(this.currentTab);
                    } catch {
                        Utils.showToast('Erro ao importar dados. Verifique o arquivo.', 'error');
                    }
                };
                reader.readAsText(file);
                e.target.value = '';
            });
        },

        // ==================== UPDATE PRICES ====================
        bindUpdatePrices() {
            document.getElementById('btn-update-prices').addEventListener('click', () => {
                this.openPriceUpdateModal();
            });

            document.getElementById('btn-save-precos').addEventListener('click', () => {
                const rows = document.querySelectorAll('#preco-tbody tr');
                rows.forEach(row => {
                    const ticker = row.dataset.ticker;
                    const input = row.querySelector('input');
                    if (ticker && input && input.value) {
                        Store.updatePrice(ticker, parseFloat(input.value));
                    }
                });
                Store._takeSnapshot();
                document.getElementById('modal-preco').classList.remove('open');
                Utils.showToast('Preços atualizados!', 'success');
                Charts.destroyAll();
                this.navigate(this.currentTab);
            });
        },

        openPriceUpdateModal() {
            const portfolio = Store.getPortfolio();
            const tbody = document.getElementById('preco-tbody');
            const sorted = Object.values(portfolio).sort((a, b) => a.ticker.localeCompare(b.ticker));
            tbody.innerHTML = sorted.map(h => `
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
