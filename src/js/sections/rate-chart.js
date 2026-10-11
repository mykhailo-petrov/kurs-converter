import { format, isPrefersReduced, showBlockError } from '@js/modules/utils.js';
import { getHistory } from '@js/modules/api/rates-api.js';
import {
	Chart,
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Filler,
	Tooltip,
} from 'chart.js';

Chart.register(
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Filler,
	Tooltip
);

class RateChart {
	#requestId = 0;
	constructor(root) {
		this.root = root;
		this.canvasEl = this.root.querySelector('[data-chart-canvas]');
		this.canvasWrapperEl = this.root.querySelector('[data-chart-canvas-wrap]');
		this.pairEl = root.querySelector('[data-chart-pair]');
		this.rateEl = root.querySelector('[data-chart-rate]');
		this.rateInfoEl = root.querySelector('[data-chart-rate-info]');
		this.periodsContainer = root.querySelector('[data-chart-periods]');
		this.from = 'EUR';
		this.to = 'UAH';
		this.pairEl.textContent = `${this.from} / ${this.to}`;
		this.#initCurrentPeriod();

		document.addEventListener('pairs:select', (e) => {
			if (e.detail.from === this.from && e.detail.to === this.to) return;

			this.from = e.detail.from;
			this.to = e.detail.to;
			this.pairEl.textContent = `${this.from} / ${this.to}`;
			this.#load();
		});

		this.periodsContainer.addEventListener('click', (e) => this.#periodClickHandler(e));

		this.#load();
	}

	async #load() {
		const requestId = ++this.#requestId;

		try {
			this.canvasWrapperEl.classList.add('skeleton');
			const { historyDates: labels, historyRates: data } = await getHistory(
				this.from,
				this.to,
				this.currentPeriod
			);
			if (requestId !== this.#requestId) return;
			this.history = { data, labels };
			this.#renderChart();
			this.#updateHeader();
		} catch (error) {
			if (requestId !== this.#requestId) return;
			showBlockError(this.root);
			console.error(error);
		} finally {
			if (requestId === this.#requestId) this.canvasWrapperEl.classList.remove('skeleton');
		}
	}

	#renderChart() {
		if (!this.chart) {
			this.chart = new Chart(this.canvasEl, this.#getChartConfig());
		} else {
			this.chart.data.labels = this.history.labels;
			this.chart.data.datasets[0].data = this.history.data;
			this.chart.update();
		}
	}

	#periodClickHandler(e) {
		const targetPeriod = e.target.closest('[data-chart-period]');
		if (!targetPeriod) return;
		if (targetPeriod.classList.contains('_active')) return;

		this.#setActivePeriod(targetPeriod);
		this.#load();
	}

	#initCurrentPeriod() {
		const activePeriod = this.#getPeriods()
			.find((period) => period.classList.contains('_active'));
		this.#setActivePeriod(activePeriod ?? this.#getFirstPeriod());
	}

	#setActivePeriod(period) {
		if (!period) return;

		if (this.currentPeriodEl) {
			this.currentPeriodEl.classList.remove('_active');
			this.currentPeriodEl.setAttribute('aria-pressed', 'false');
		}

		period.classList.add('_active');
		period.setAttribute('aria-pressed', 'true');
		this.currentPeriod = period.dataset.chartPeriod || null;
		this.currentPeriodEl = period;
	}

	#getPeriods() {
		return [...this.periodsContainer.children];
	}

	#getFirstPeriod() {
		return this.#getPeriods()[0] || null;
	}

	#updateHeader() {
		if (!this.history.data.length) {
			this.rateInfoEl.classList.remove('_status-up', '_status-down');
			this.rateEl.textContent = '-';
			this.rateInfoEl.textContent = '-';
			return;
		}

		const currentRate = this.history.data.at(-1);
		const startRate = this.history.data[0];
		this.rateEl.textContent = `${format(currentRate, 4)}`;
		const changePercent = (currentRate / startRate - 1) * 100;

		if (!Number.isFinite(changePercent)) {
			this.rateInfoEl.textContent = '';
			this.rateInfoEl.classList.remove('_status-up', '_status-down');
		} else {
			this.rateInfoEl.textContent = `${changePercent > 0 ? '+' : ''}${format(changePercent, 3)}% - ${this.currentPeriod}`;
			this.rateInfoEl.classList.toggle('_status-up', changePercent >= 0);
			this.rateInfoEl.classList.toggle('_status-down', changePercent < 0);
		}
	}

	#getChartConfig() {
		const rateChart = this;
		const styles = getComputedStyle(document.documentElement);
		const color = (name) =>
			styles
				.getPropertyValue(name)
				.trim();

		const accent = color('--sss-accent-def');
		const muted = color('--sss-text-muted');
		const surface = color('--sss-bg-surface-raised');
		const border = color('--sss-border-def');
		const fillStart = color('--sss-chart-fill-start');
		const fillEnd = color('--sss-chart-fill-end');

		return {
			type: 'line',
			data: {
				labels: this.history.labels,
				datasets: [
					{
						data: this.history.data,
						borderColor: accent,
						borderWidth: 2,
						tension: 0,
						fill: true,
						backgroundColor: (ctx) => {
							const { chart } = ctx;
							const { chartArea } = chart;
							if (!chartArea) return 'transparent';
							const gradient = chart.ctx.createLinearGradient(
								0,
								chartArea.top,
								0,
								chartArea.bottom
							);
							gradient.addColorStop(0, fillStart);
							gradient.addColorStop(1, fillEnd);
							return gradient;
						},
						pointRadius: (ctx) => (ctx.dataIndex === ctx.dataset.data.length - 1 ? 4 : 0),
						pointBackgroundColor: accent,
						pointHoverRadius: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: { display: false },
						border: { display: false },
						ticks: {
							align: 'inner',
							autoSkip: true,
							autoSkipPadding: 24,
							color: muted,
							maxTicksLimit: 8,
							maxRotation: 0,
							font: { family: color('--sss-font-mono'), size: 12 },
							callback(value) {
								const date = new Date(this.getLabelForValue(value));
								const options = {
									'1Y': { month: 'short', year: '2-digit', timeZone: 'UTC' },
									'5Y': { year: 'numeric', timeZone: 'UTC' },
								};

								return date
									.toLocaleDateString(
										'en-US',
										options[rateChart.currentPeriod] ?? {
											month: 'short',
											day: 'numeric',
											timeZone: 'UTC',
										}
									)
									.toUpperCase();
							},
						},
					},
					y: {
						ticks: {
							display: false,
							maxTicksLimit: 4,
						},
						border: { display: false },
						grid: {
							color: border,
							drawTicks: false,
						},
					},
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: surface,
						borderColor: accent,
						borderWidth: 1,
						displayColors: false,
						callbacks: {
							label: (ctx) => ctx.parsed.y.toFixed(4),
						},
					},
				},
				interaction: { mode: 'index', intersect: false },
				animation: isPrefersReduced() ? false : undefined,
			},
		};
	}
}

const rateCharts = document.querySelectorAll('[data-chart]');
rateCharts.forEach((root) => new RateChart(root));
