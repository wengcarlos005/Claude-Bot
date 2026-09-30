const Utils = {
    formatCurrency(value) {
        if (value == null || isNaN(value)) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    formatNumber(value, decimals = 2) {
        if (value == null || isNaN(value)) return '0';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    },

    formatPercent(value, decimals = 2) {
        if (value == null || isNaN(value)) return '0,00%';
        const prefix = value > 0 ? '+' : '';
        return prefix + value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    },

    formatDateShort(dateStr) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const [y, m] = dateStr.split('-');
        return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
    },

    todayStr() {
        return new Date().toISOString().slice(0, 10);
    },

    getAssetTypeLabel(type) {
        const map = {
            'acao': 'Ação',
            'fii': 'FII',
            'bdr': 'BDR',
            'etf': 'ETF',
            'fundo': 'Fundo',
            'renda-fixa': 'Renda Fixa',
            'cripto': 'Cripto',
        };
        return map[type] || type;
    },

    getSectorLabel(setor) {
        const map = {
            'financeiro': 'Financeiro',
            'energia': 'Energia',
            'petroleo': 'Petróleo e Gás',
            'mineracao': 'Mineração',
            'varejo': 'Varejo',
            'saude': 'Saúde',
            'tecnologia': 'Tecnologia',
            'imobiliario': 'Imobiliário',
            'industrial': 'Industrial',
            'consumo': 'Consumo',
            'telecomunicacao': 'Telecomunicação',
            'utilidades': 'Utilidades',
            'agro': 'Agronegócio',
            'logistica': 'Logística',
            'outros': 'Outros',
        };
        return map[setor] || setor || 'Outros';
    },

    getChartColors() {
        const style = getComputedStyle(document.documentElement);
        return [
            style.getPropertyValue('--chart-1').trim(),
            style.getPropertyValue('--chart-2').trim(),
            style.getPropertyValue('--chart-3').trim(),
            style.getPropertyValue('--chart-4').trim(),
            style.getPropertyValue('--chart-5').trim(),
            style.getPropertyValue('--chart-6').trim(),
            style.getPropertyValue('--chart-7').trim(),
            style.getPropertyValue('--chart-8').trim(),
        ];
    },

    getProventoTypeLabel(type) {
        const map = {
            'dividendo': 'Dividendo',
            'jcp': 'JCP',
            'rendimento': 'Rendimento',
            'aluguel': 'Aluguel',
        };
        return map[type] || type;
    },

    calculateCDI(annualRate, days) {
        const dailyRate = Math.pow(1 + annualRate / 100, 1 / 252) - 1;
        return Math.pow(1 + dailyRate, days) - 1;
    },

    businessDaysBetween(startDate, endDate) {
        const start = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    },

    getMonthsRange(startDate, endDate) {
        const months = [];
        const [sy, sm] = startDate.split('-').map(Number);
        const [ey, em] = endDate.split('-').map(Number);
        let y = sy, m = sm;
        while (y < ey || (y === ey && m <= em)) {
            months.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }
        return months;
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showToast(message, type = 'info') {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.borderColor = type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--accent)';
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
    },

    confirm(title, message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-box">
                    <h4>${this.escapeHtml(title)}</h4>
                    <p>${this.escapeHtml(message)}</p>
                    <div class="confirm-actions">
                        <button class="btn btn-secondary" id="confirm-no">Cancelar</button>
                        <button class="btn btn-primary" id="confirm-yes" style="background:var(--red);border-color:var(--red)">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
            overlay.querySelector('#confirm-no').onclick = () => { overlay.remove(); resolve(false); };
        });
    },

    generateSampleData() {
        const transactions = [
            { date: '2024-01-10', operacao: 'compra', ticker: 'PETR4', classe: 'acao', setor: 'petroleo', qtd: 100, preco: 36.50, taxas: 4.90, precoAtual: 42.15 },
            { date: '2024-01-15', operacao: 'compra', ticker: 'VALE3', classe: 'acao', setor: 'mineracao', qtd: 50, preco: 68.20, taxas: 4.90, precoAtual: 58.90 },
            { date: '2024-02-05', operacao: 'compra', ticker: 'ITUB4', classe: 'acao', setor: 'financeiro', qtd: 80, preco: 32.40, taxas: 4.90, precoAtual: 35.80 },
            { date: '2024-02-20', operacao: 'compra', ticker: 'HGLG11', classe: 'fii', setor: 'imobiliario', qtd: 30, preco: 160.50, taxas: 0, precoAtual: 165.20 },
            { date: '2024-03-10', operacao: 'compra', ticker: 'MXRF11', classe: 'fii', setor: 'imobiliario', qtd: 100, preco: 10.45, taxas: 0, precoAtual: 10.80 },
            { date: '2024-03-15', operacao: 'compra', ticker: 'BBDC4', classe: 'acao', setor: 'financeiro', qtd: 60, preco: 14.80, taxas: 4.90, precoAtual: 15.20 },
            { date: '2024-04-01', operacao: 'compra', ticker: 'IVVB11', classe: 'etf', setor: 'outros', qtd: 20, preco: 280.00, taxas: 4.90, precoAtual: 310.50 },
            { date: '2024-04-15', operacao: 'compra', ticker: 'AAPL34', classe: 'bdr', setor: 'tecnologia', qtd: 15, preco: 52.30, taxas: 0, precoAtual: 58.40 },
            { date: '2024-05-10', operacao: 'compra', ticker: 'PETR4', classe: 'acao', setor: 'petroleo', qtd: 50, preco: 38.90, taxas: 4.90, precoAtual: 42.15 },
            { date: '2024-06-01', operacao: 'compra', ticker: 'XPML11', classe: 'fii', setor: 'imobiliario', qtd: 20, preco: 105.00, taxas: 0, precoAtual: 109.50 },
            { date: '2024-06-15', operacao: 'compra', ticker: 'WEGE3', classe: 'acao', setor: 'industrial', qtd: 40, preco: 35.60, taxas: 4.90, precoAtual: 52.80 },
            { date: '2024-07-01', operacao: 'compra', ticker: 'BTCI', classe: 'cripto', setor: 'outros', qtd: 0.01, preco: 350000.00, taxas: 0, precoAtual: 480000.00 },
            { date: '2024-08-01', operacao: 'compra', ticker: 'BBAS3', classe: 'acao', setor: 'financeiro', qtd: 70, preco: 27.80, taxas: 4.90, precoAtual: 28.40 },
            { date: '2024-09-01', operacao: 'compra', ticker: 'TAEE11', classe: 'acao', setor: 'energia', qtd: 100, preco: 11.50, taxas: 4.90, precoAtual: 11.90 },
            { date: '2024-10-01', operacao: 'venda', ticker: 'VALE3', classe: 'acao', setor: 'mineracao', qtd: 20, preco: 62.50, taxas: 4.90, precoAtual: 58.90 },
            { date: '2024-11-01', operacao: 'compra', ticker: 'KNRI11', classe: 'fii', setor: 'imobiliario', qtd: 15, preco: 155.00, taxas: 0, precoAtual: 160.80 },
            { date: '2025-01-10', operacao: 'compra', ticker: 'PETR4', classe: 'acao', setor: 'petroleo', qtd: 30, preco: 40.20, taxas: 4.90, precoAtual: 42.15 },
            { date: '2025-02-05', operacao: 'compra', ticker: 'MSFT34', classe: 'bdr', setor: 'tecnologia', qtd: 10, preco: 68.50, taxas: 0, precoAtual: 72.30 },
            { date: '2025-03-01', operacao: 'compra', ticker: 'TESOURO-SELIC', classe: 'renda-fixa', setor: 'outros', qtd: 1, preco: 15000.00, taxas: 0, precoAtual: 15750.00 },
        ];

        const proventos = [
            { date: '2024-03-15', ativo: 'PETR4', tipo: 'dividendo', valorCota: 1.20, qtd: 100, total: 120.00 },
            { date: '2024-03-20', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.10, qtd: 30, total: 33.00 },
            { date: '2024-04-15', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2024-04-20', ativo: 'ITUB4', tipo: 'jcp', valorCota: 0.25, qtd: 80, total: 20.00 },
            { date: '2024-05-15', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.12, qtd: 30, total: 33.60 },
            { date: '2024-05-20', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2024-06-15', ativo: 'PETR4', tipo: 'dividendo', valorCota: 0.95, qtd: 150, total: 142.50 },
            { date: '2024-06-20', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.15, qtd: 30, total: 34.50 },
            { date: '2024-07-15', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2024-07-20', ativo: 'BBDC4', tipo: 'jcp', valorCota: 0.18, qtd: 60, total: 10.80 },
            { date: '2024-08-15', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.10, qtd: 30, total: 33.00 },
            { date: '2024-08-20', ativo: 'TAEE11', tipo: 'dividendo', valorCota: 0.65, qtd: 100, total: 65.00 },
            { date: '2024-09-15', ativo: 'PETR4', tipo: 'dividendo', valorCota: 1.55, qtd: 150, total: 232.50 },
            { date: '2024-09-20', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2024-10-15', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.18, qtd: 30, total: 35.40 },
            { date: '2024-10-20', ativo: 'XPML11', tipo: 'rendimento', valorCota: 0.85, qtd: 20, total: 17.00 },
            { date: '2024-11-15', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2024-11-20', ativo: 'ITUB4', tipo: 'dividendo', valorCota: 0.30, qtd: 80, total: 24.00 },
            { date: '2024-12-15', ativo: 'PETR4', tipo: 'dividendo', valorCota: 1.80, qtd: 150, total: 270.00 },
            { date: '2024-12-20', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.20, qtd: 30, total: 36.00 },
            { date: '2025-01-15', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2025-01-20', ativo: 'BBAS3', tipo: 'dividendo', valorCota: 0.42, qtd: 70, total: 29.40 },
            { date: '2025-02-15', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.22, qtd: 30, total: 36.60 },
            { date: '2025-02-20', ativo: 'TAEE11', tipo: 'dividendo', valorCota: 0.70, qtd: 100, total: 70.00 },
            { date: '2025-03-15', ativo: 'PETR4', tipo: 'dividendo', valorCota: 1.35, qtd: 180, total: 243.00 },
            { date: '2025-03-20', ativo: 'XPML11', tipo: 'rendimento', valorCota: 0.90, qtd: 20, total: 18.00 },
            { date: '2025-04-15', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.10, qtd: 100, total: 10.00 },
            { date: '2025-05-15', ativo: 'KNRI11', tipo: 'rendimento', valorCota: 0.92, qtd: 15, total: 13.80 },
            { date: '2025-06-15', ativo: 'PETR4', tipo: 'dividendo', valorCota: 1.10, qtd: 180, total: 198.00 },
            { date: '2025-07-15', ativo: 'HGLG11', tipo: 'rendimento', valorCota: 1.25, qtd: 30, total: 37.50 },
            { date: '2025-08-15', ativo: 'WEGE3', tipo: 'dividendo', valorCota: 0.15, qtd: 40, total: 6.00 },
            { date: '2025-09-15', ativo: 'MXRF11', tipo: 'rendimento', valorCota: 0.11, qtd: 100, total: 11.00 },
        ];

        transactions.forEach(tx => Store.addTransaction(tx));
        proventos.forEach(p => Store.addProvento(p));

        Store.addWatchItem({ ticker: 'MGLU3', classe: 'acao', preco: 8.50, alvo: 12.00, notas: 'Aguardando recuperação do varejo' });
        Store.addWatchItem({ ticker: 'VISC11', classe: 'fii', preco: 115.00, alvo: 105.00, notas: 'FII de shopping, bom yield' });
        Store.addWatchItem({ ticker: 'GOOGL34', classe: 'bdr', preco: 62.00, alvo: 55.00, notas: 'BDR de Alphabet' });
    },
};
