const Charts = {
    instances: {},

    getThemeColors() {
        const s = getComputedStyle(document.documentElement);
        return {
            text: s.getPropertyValue('--text-secondary').trim(),
            textPrimary: s.getPropertyValue('--text-primary').trim(),
            grid: s.getPropertyValue('--border').trim(),
            bg: s.getPropertyValue('--bg-card').trim(),
            accent: s.getPropertyValue('--accent').trim(),
            green: s.getPropertyValue('--green').trim(),
            red: s.getPropertyValue('--red').trim(),
        };
    },

    destroy(id) {
        if (this.instances[id]) {
            this.instances[id].destroy();
            delete this.instances[id];
        }
    },

    destroyAll() {
        for (const id of Object.keys(this.instances)) {
            this.destroy(id);
        }
    },

    createLine(canvasId, labels, datasets, opts = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const theme = this.getThemeColors();

        const defaultDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            borderColor: ds.color || Utils.getChartColors()[i],
            backgroundColor: ds.fill ? this._gradient(ctx, ds.color || Utils.getChartColors()[i]) : 'transparent',
            borderWidth: 2,
            pointRadius: ds.pointRadius ?? 2,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: ds.fill || false,
            borderDash: ds.dashed ? [6, 4] : [],
            ...ds.extra,
        }));

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: defaultDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        labels: { color: theme.text, font: { family: "'Inter', sans-serif", size: 12 }, boxWidth: 12, padding: 16 },
                    },
                    tooltip: {
                        backgroundColor: theme.bg,
                        titleColor: theme.textPrimary,
                        bodyColor: theme.text,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" },
                        callbacks: opts.tooltipCallbacks || {},
                    },
                    datalabels: { display: false },
                },
                scales: {
                    x: {
                        grid: { color: theme.grid, drawBorder: false, lineWidth: 0.5 },
                        ticks: { color: theme.text, font: { size: 11, family: "'Inter', sans-serif" }, maxRotation: 45 },
                    },
                    y: {
                        grid: { color: theme.grid, drawBorder: false, lineWidth: 0.5 },
                        ticks: {
                            color: theme.text,
                            font: { size: 11, family: "'Inter', sans-serif" },
                            callback: opts.yFormat || (v => Utils.formatCurrency(v)),
                        },
                    },
                },
                ...opts.chartOpts,
            },
        });
        return this.instances[canvasId];
    },

    createBar(canvasId, labels, datasets, opts = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const theme = this.getThemeColors();
        const colors = Utils.getChartColors();

        const defaultDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            backgroundColor: ds.colors || ds.color || colors[i],
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 40,
            ...ds.extra,
        }));

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: defaultDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        labels: { color: theme.text, font: { family: "'Inter', sans-serif", size: 12 }, boxWidth: 12, padding: 16 },
                    },
                    tooltip: {
                        backgroundColor: theme.bg,
                        titleColor: theme.textPrimary,
                        bodyColor: theme.text,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" },
                        callbacks: opts.tooltipCallbacks || {},
                    },
                    datalabels: { display: false },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.text, font: { size: 11, family: "'Inter', sans-serif" } },
                    },
                    y: {
                        grid: { color: theme.grid, drawBorder: false, lineWidth: 0.5 },
                        ticks: {
                            color: theme.text,
                            font: { size: 11, family: "'Inter', sans-serif" },
                            callback: opts.yFormat || (v => Utils.formatCurrency(v)),
                        },
                    },
                },
                ...opts.chartOpts,
            },
        });
        return this.instances[canvasId];
    },

    createPie(canvasId, labels, data, opts = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const theme = this.getThemeColors();
        const colors = opts.colors || Utils.getChartColors();

        this.instances[canvasId] = new Chart(ctx, {
            type: opts.doughnut ? 'doughnut' : 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, data.length),
                    borderColor: theme.bg,
                    borderWidth: 2,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: opts.doughnut ? '60%' : 0,
                plugins: {
                    legend: {
                        display: opts.showLegend !== false,
                        position: 'right',
                        labels: {
                            color: theme.text,
                            font: { family: "'Inter', sans-serif", size: 12 },
                            boxWidth: 12,
                            padding: 10,
                            generateLabels: (chart) => {
                                const ds = chart.data.datasets[0];
                                const total = ds.data.reduce((a, b) => a + b, 0);
                                return chart.data.labels.map((label, i) => ({
                                    text: `${label} (${total > 0 ? ((ds.data[i] / total) * 100).toFixed(1) : 0}%)`,
                                    fillStyle: ds.backgroundColor[i],
                                    strokeStyle: ds.backgroundColor[i],
                                    hidden: false,
                                    index: i,
                                }));
                            },
                        },
                    },
                    tooltip: {
                        backgroundColor: theme.bg,
                        titleColor: theme.textPrimary,
                        bodyColor: theme.text,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${Utils.formatCurrency(ctx.raw)} (${pct}%)`;
                            },
                        },
                    },
                    datalabels: { display: false },
                },
                ...opts.chartOpts,
            },
        });
        return this.instances[canvasId];
    },

    createHorizontalBar(canvasId, labels, data, opts = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const theme = this.getThemeColors();
        const colors = opts.colors || Utils.getChartColors();

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, data.length),
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 28,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.bg,
                        titleColor: theme.textPrimary,
                        bodyColor: theme.text,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => ` ${Utils.formatCurrency(ctx.raw)}`,
                        },
                    },
                    datalabels: { display: false },
                },
                scales: {
                    x: {
                        grid: { color: theme.grid, drawBorder: false, lineWidth: 0.5 },
                        ticks: {
                            color: theme.text,
                            font: { size: 11, family: "'Inter', sans-serif" },
                            callback: opts.xFormat || (v => Utils.formatCurrency(v)),
                        },
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: theme.text, font: { size: 12, family: "'Inter', sans-serif" } },
                    },
                },
            },
        });
        return this.instances[canvasId];
    },

    _gradient(ctx, color) {
        const canvas = ctx.getContext ? ctx : ctx.canvas || ctx;
        const context = canvas.getContext ? canvas.getContext('2d') : null;
        if (!context) return color + '33';
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height || 300);
        gradient.addColorStop(0, color + '44');
        gradient.addColorStop(1, color + '05');
        return gradient;
    },
};
