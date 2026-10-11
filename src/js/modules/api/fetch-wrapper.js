export default class FetchWrapper {
	constructor(baseURL) {
		this.baseURL = baseURL;
	}

	async get(endpoint) {
		return this.#template({ endpoint });
	}

	async post(endpoint, body) {
		return this.#template({
			endpoint,
			method: 'POST',
			body,
		});
	}

	async put(endpoint, body) {
		return this.#template({
			endpoint,
			method: 'PUT',
			body,
		});
	}

	async delete(endpoint, body) {
		return this.#template({
			endpoint: endpoint,
			method: 'DELETE',
			body,
		});
	}

	async #template({ endpoint, method = 'GET', body, headers } = {}) {
		const options = { method, headers: { ...headers } };

		if (body !== undefined) {
			options.headers['Content-Type'] = 'application/json';
			options.body = JSON.stringify(body);
		}

		const response = await fetch(this.baseURL + endpoint, options);

		if (!response.ok) {
			throw new Error(`API Status failed: ${response.status} ${response.statusText}`);
		}
		const data = await response.json();
		return { response, data };
	}
}
