import { getPrevRates, getLatestRates, getCurrencies, getRate } from '@js/modules/api/rates-api.js';
import { format, showBlockError, validateAmount } from '@js/modules/utils.js';

const POPULAR = ['USD', 'EUR', 'UAH', 'GBP', 'PLN'];
const DEFAULT_FROM = 'USD';
const DEFAULT_TO = 'UAH';
const STORAGE_KEYS = {
	from: 'converter:from',
	to: 'converter:to',
};

function readStorage(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {
		return;
	}
}

class CurrencyConverter {
	#activeChip = null;

	constructor(root) {
		this.root = root;
		this.inputFromEl = root.querySelector('[data-converter-input-from]');
		this.selectFromEl = root.querySelector('[data-converter-select-from]');
		this.swapBtnEl = root.querySelector('[data-converter-swap]');
		this.inputToEl = root.querySelector('[data-converter-input-to]');
		this.selectToEl = root.querySelector('[data-converter-select-to]');
		this.chipsContainerEl = root.querySelector('[data-converter-chips]');
		this.lastUpdateEl = root.querySelector('[data-converter-last-update]');
		this.currentRateEl = root.querySelector('[data-converter-rate]');
		this.currentRateInfoEl = root.querySelector('[data-converter-rate-info]');
		this.rates = {};
		this.currencies = [];
		this.from = readStorage(STORAGE_KEYS.from) || DEFAULT_FROM;
		this.to = readStorage(STORAGE_KEYS.to) || DEFAULT_TO;
		this.amount = 1000;
		this.amountSide = 'from';

		this.#init();

		this.#getPrevRates();
	}

	async #init() {
		try {
			this.root.classList.add('skeleton');
			const [rates, currencies] = await Promise.all([getLatestRates(), getCurrencies()]);
			this.rates = rates;
			this.fetchedAt = new Date();
			this.currencies = currencies;
		} catch (error) {
			console.error(error);
			showBlockError(this.root);
			return;
		} finally {
			this.root.classList.remove('skeleton');
		}
		this.#renderConverter();
		this.#bindEvents();
		this.#setLastUpdateRate();
	}

	async #getPrevRates() {
		try {
			this.currentRateInfoEl.classList.add('skeleton');
			this.prevRates = await getPrevRates();
			this.#updateRateChange();
		} catch (error) {
			console.error('History load failed', error);
		} finally {
			this.currentRateInfoEl.classList.remove('skeleton');
		}
	}

	#updateRateChange() {
		const prevRate = this.prevRates?.[this.to] / this.prevRates?.[this.from];
		const change = (getRate(this.rates, this.from, this.to) / prevRate - 1) * 100;
		if (!Number.isFinite(change)) {
			this.currentRateInfoEl.textContent = '';
			this.currentRateInfoEl.classList.remove('_status-up', '_status-down');
			return;
		}
		this.currentRateInfoEl.classList.toggle('_status-up', change >= 0);
		this.currentRateInfoEl.classList.toggle('_status-down', change < 0);
		const sign = change > 0 ? '+' : '';
		this.currentRateInfoEl.textContent = `${sign}${format(change, 3)}%`;
	}

	#renderConverter() {
		const options = this.currencies.filter(({ iso_code }) => iso_code in this.rates)
			.map(({ iso_code, symbol, name }) => ({
				text: iso_code,
				value: iso_code,
				icon: symbol || iso_code,
				name,
			}));
		const popular = POPULAR
			.map((code) => options.find((option) => option.value === code))
			.filter(Boolean);
		const others = options.filter((option) => !POPULAR.includes(option.value));

		this.selectFromEl.addOptions(popular, 'Popular');
		this.selectFromEl.addOptions(others, 'All currencies');
		this.selectToEl.addOptions(popular, 'Popular');
		this.selectToEl.addOptions(others, 'All currencies');

		if (!(this.from in this.rates)) this.from = DEFAULT_FROM;
		if (!(this.to in this.rates)) this.to = DEFAULT_TO;

		this.selectFromEl.value = this.from;
		this.selectToEl.value = this.to;
		this.inputFromEl.value = format(this.amount);
		this.#calculate();
	}

	#bindEvents() {
		this.selectFromEl.addEventListener('change', (e) => this.#onSelectChange(e, 'from'));
		this.selectToEl.addEventListener('change', (e) => this.#onSelectChange(e, 'to'));
		this.swapBtnEl.addEventListener('click', () => this.#swap());
		this.inputFromEl.addEventListener('input', (e) => this.#onAmountInput(e, 'from'));
		this.inputToEl.addEventListener('input', (e) => this.#onAmountInput(e, 'to'));
		this.inputFromEl.addEventListener('change', (e) => this.#onAmountChange(e));
		this.inputToEl.addEventListener('change', (e) => this.#onAmountChange(e));
		this.chipsContainerEl.addEventListener('click', (e) => this.#onChipClick(e));
	}

	#onSelectChange(e, side) {
		this[side] = e.currentTarget.value;
		this.#saveCurrencies();
		this.#calculate();
	}

	#saveCurrencies() {
		writeStorage(STORAGE_KEYS.from, this.from);
		writeStorage(STORAGE_KEYS.to, this.to);
	}

	#onAmountChange(e) {
		if (!e.target.value.length) return;
		e.target.value = format(Number(e.target.value));
	}

	#onAmountInput(e, side) {
		const input = e.target;
		const rawValue = input.value;
		const cleanValue = validateAmount(rawValue);

		if (cleanValue !== rawValue) {
			const caret = Math.max(0, input.selectionStart - (rawValue.length - cleanValue.length));
			input.value = cleanValue;
			input.setSelectionRange(caret, caret);
		}

		this.amount = cleanValue === '' ? null : Number(cleanValue);
		this.amountSide = side;
		this.#setActiveChip(null);
		this.#calculate();
	}

	#onChipClick(e) {
		const chip = e.target.closest('[data-converter-chip]');
		if (!chip) return;

		this.amount = Number(chip.dataset.converterChip) || 0;
		this.amountSide = 'from';
		this.inputFromEl.value = format(this.amount);
		this.#setActiveChip(chip);
		this.#calculate();
	}

	#setActiveChip(chip) {
		this.#activeChip?.classList.remove('_active');
		this.#activeChip = chip;
		chip?.classList.add('_active');
	}

	#swap() {
		[this.from, this.to] = [this.to, this.from];

		this.selectFromEl.value = this.from;
		this.selectToEl.value = this.to;
		this.#saveCurrencies();

		this.#calculate();
	}

	#calculate() {
		if (this.amount === null) {
			const otherInput = this.amountSide === 'from' ? this.inputToEl : this.inputFromEl;
			otherInput.value = '';
			this.#updateCurrentRate();
			this.#updateRateChange();
			return;
		}

		const rate = getRate(this.rates, this.from, this.to);

		if (this.amountSide === 'from') {
			this.inputToEl.value = format(this.amount * rate);
		} else {
			this.inputFromEl.value = format(this.amount / rate);
		}

		this.#updateCurrentRate();
		this.#updateRateChange();
	}

	#updateCurrentRate() {
		this.currentRateEl.textContent = `1 ${this.from} = ${format(getRate(this.rates, this.from, this.to), 4)} ${this.to}`;
	}

	#setLastUpdateRate() {
		if (!this.fetchedAt) return;

		this.lastUpdateEl.setAttribute('datetime', this.fetchedAt.toISOString());
		this.lastUpdateEl.textContent = this.fetchedAt.toLocaleTimeString('uk-UA', {
			hour: '2-digit',
			minute: '2-digit',
		});
	}
}

const converters = document.querySelectorAll('[data-converter]');

converters.forEach((root) => new CurrencyConverter(root));
