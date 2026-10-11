import { getLatestRates, getPrevRates, getCurrencies, getRate } from '@js/modules/api/rates-api.js';
import { format, showBlockError } from '@js/modules/utils.js';

const PAIRS = [
	['EUR', 'UAH'],
	['GBP', 'UAH'],
	['PLN', 'UAH'],
	['USD', 'EUR'],
	['CHF', 'UAH'],
];

class PopularPairs {
	constructor(root) {
		this.root = root;
		this.pairListEl = this.root.querySelector('[data-pairs-list]');
		this.pairTemplateEl = this.root.querySelector('[data-pairs-template]');
		this.#init();
		this.#getPrevRates();

		this.pairListEl.addEventListener('click', (e) => {
			const button = e.target.closest('[data-pair-button]');
			if (!button) return;

			if (button.classList.contains('_active')) return;

			this.#setActivePair(button);
		});
	}

	#setActivePair(currentBtn) {
		if (!currentBtn) return;

		const from = currentBtn.dataset.from;
		const to = currentBtn.dataset.to;

		currentBtn.classList.add('_active');
		currentBtn.setAttribute('aria-pressed', 'true');
		this.root.querySelectorAll('[data-pair-button]')
			.forEach((button) => {
				if (currentBtn === button) return;

				button.classList.remove('_active');
				button.setAttribute('aria-pressed', 'false');
			});

		this.root.dispatchEvent(
			new CustomEvent('pairs:select', {
				bubbles: true,
				detail: { from, to },
			})
		);
	}

	async #init() {
		try {
			this.root.classList.add('skeleton');
			const [latestRates, currencies] = await Promise.all([getLatestRates(), getCurrencies()]);
			this.rates = latestRates;
			this.currencies = currencies;
			this.#render();
		} catch (error) {
			showBlockError(this.root);
			console.error('Get Pairs Failed', error);
		} finally {
			this.root.classList.remove('skeleton');
		}
	}

	async #getPrevRates() {
		try {
			this.prevRatesDone = false;
			this.prevRates = await getPrevRates();
			this.#updateRateChanges();
		} catch (error) {
			console.error('History load failed', error);
		} finally {
			this.prevRatesDone = true;
			this.pairListEl.querySelectorAll('[data-pair-rate-info]')
				.forEach((el) => el.classList.remove('skeleton'));
		}
	}

	#render() {
		PAIRS
			.filter(([from, to]) => from in this.rates && to in this.rates)
			.forEach(([from, to]) => {
				const pairItem = this.pairTemplateEl.content.cloneNode(true);
				const icon = pairItem.querySelector('[data-pair-icon]');
				const name = pairItem.querySelector('[data-pair-name]');
				const rate = pairItem.querySelector('[data-pair-rate]');
				const rateInfo = pairItem.querySelector('[data-pair-rate-info]');
				const button = pairItem.querySelector('[data-pair-button]');
				if (!this.prevRatesDone) rateInfo.classList.add('skeleton');
				const currentCurrency = this.currencies?.find(
					(currency) => currency['iso_code'].toUpperCase() === from.toUpperCase()
				);
				icon.textContent = currentCurrency?.symbol || from.toUpperCase();
				name.textContent = `${from} / ${to}`;
				rate.textContent = format(getRate(this.rates, from, to), 4);
				button.dataset.from = from;
				button.dataset.to = to;
				this.pairListEl.appendChild(pairItem);
			});
		this.#updateRateChanges();
		this.#setActivePair(this.pairListEl.querySelector('[data-pair-button]'));
	}

	#updateRateChanges() {
		if (!this.prevRates) return;
		this.pairListEl.querySelectorAll('[data-pair-button]')
			.forEach((button) => {
				const from = button.dataset.from;
				const to = button.dataset.to;
				const rateInfo = button.querySelector('[data-pair-rate-info]');

				const lastRate = getRate(this.rates, from, to);
				const prevRate = getRate(this.prevRates, from, to);
				const changePercent = (lastRate / prevRate - 1) * 100;

				if (!Number.isFinite(changePercent)) {
					rateInfo.textContent = '';
					rateInfo.classList.remove('_status-up', '_status-down');
				} else {
					rateInfo.textContent = `${changePercent > 0 ? '+' : ''}${format(changePercent, 3)}%`;
					rateInfo.classList.toggle('_status-up', changePercent >= 0);
					rateInfo.classList.toggle('_status-down', changePercent < 0);
				}
				rateInfo.classList.remove('skeleton');
			});
	}
}

const pairs = document.querySelectorAll('[data-pairs]');

pairs.forEach((root) => new PopularPairs(root));
