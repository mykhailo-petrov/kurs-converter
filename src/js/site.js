import { myModules } from '@js/modules/registry.js';

const yearElement = document.querySelector('[data-year]');
if (yearElement) {
	yearElement.textContent = new Date().getFullYear();
}
