import FetchWrapper from '@js/modules/api/fetch-wrapper.js';

const API = new FetchWrapper(import.meta.env.VITE_Exchange_API_URL);
const BASE = 'USD';
const cache = new Map();

function cached(key, request) {
	if (!cache.has(key)) {
		const promise = request()
			.catch((err) => {
				cache.delete(key);
				throw err;
			});
		cache.set(key, promise);
	}
	return cache.get(key);
}

export function getLatestRates() {
	return cached('latest-rates', async () => {
		try {
			const { data } = await API.get(`/rates?base=${BASE.toLowerCase()}`);
			const rates = Object.fromEntries(data.map(({ quote, rate }) => [quote, rate]));
			rates[BASE] = 1;
			return rates;
		} catch (error) {
			throw new Error('Fetch Rate failed', { cause: error });
		}
	});
}

export function getCurrencies() {
	return cached('currencies', async () => {
		try {
			const { data } = await API.get(`/currencies`);
			return data;
		} catch (error) {
			throw new Error('Fetch Currencies failed', { cause: error });
		}
	});
}

export function getPrevRates() {
	return cached('prev-rates', async () => {
		try {
			const date = new Date();
			date.setDate(date.getDate() - 7);
			const lastWeekDate = dateToAPIFormat(date);
			const { data } = await API.get(`/rates?base=${BASE}&from=${lastWeekDate}`);
			const byQuote = {};
			data.forEach(({ quote, date, rate }) => {
				(byQuote[quote] ??= []).push({ date, rate });
			});
			const prevRates = {};
			Object.entries(byQuote)
				.forEach(([quote, info]) => {
					info.sort((a, b) => a.date.localeCompare(b.date));
					const prev = info.at(-2);
					if (prev) prevRates[quote] = prev.rate;
				});
			prevRates[BASE] = 1;
			return prevRates;
		} catch (error) {
			throw new Error('Fetch Prev Rates failed', { cause: error });
		}
	});
}

export function getHistory(from, to, period) {
	return cached(`history|${from}|${to}|${period}`, async () => {
		try {
			const date = new Date();

			switch (period) {
				case '1W':
					date.setDate(date.getDate() - 7);
					break;
				case '1M':
					date.setMonth(date.getMonth() - 1);
					break;
				case '3M':
					date.setMonth(date.getMonth() - 3);
					break;
				case '1Y':
					date.setFullYear(date.getFullYear() - 1);
					break;
				case '5Y':
					date.setFullYear(date.getFullYear() - 5);
					break;
				default:
					throw new Error(`Unknown period: ${period}`);
			}
			const dateByPeriod = dateToAPIFormat(date);

			const { data } = await API.get(`/rates?base=${from}&quotes=${to}&from=${dateByPeriod}`);

			const historyData = data
				.sort((a, b) => new Date(a.date) - new Date(b.date))
				.reduce((acc, item) => {
					acc[item.date] = item.rate;
					return acc;
				}, {});

			const historyDates = Object.keys(historyData);
			const historyRates = Object.values(historyData);

			return { historyDates, historyRates };
		} catch (error) {
			throw new Error('Fetch history failed', { cause: error });
		}
	});
}

export function getRate(rates, from, to) {
	return rates[to] / rates[from];
}

export function dateToAPIFormat(date) {
	return date.toLocaleString('sv-SE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
}

export function dateToChartFormat(date) {
	return date.toLocaleString('en-US', {
		month: 'short',
		day: '2-digit',
	});
}
