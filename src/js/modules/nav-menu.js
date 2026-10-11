import { setExclusiveActiveItem } from './utils.js';
import { menuClose } from './burger-menu.js';

function menuItemClickHandler(menuParam, target, itemsRef) {
	setExclusiveActiveItem(target, itemsRef, '_active');

	if (target.hasAttribute('data-dropdown-trigger')) return;

	if (document.documentElement.classList.contains('burger-open') && !menuParam) menuClose();
}

export function initNavMenuActivate() {
	const menu = document.querySelector('[data-menu]');
	const menuParam = menu.dataset.menu;

	if (!menu) return;

	const menuItems = document.querySelectorAll('[data-menu-item]');
	let items = [...menuItems];

	const menuDropdown = menu.querySelector('[data-dropdown]');

	if (menuDropdown !== null) {
		const menuDropdownItems = menuDropdown.querySelectorAll('[data-dropdown-item]');

		items = [...items, ...menuDropdownItems];
	}

	items.forEach((item, index, itemsRef) => {
		item.addEventListener('click', (e) =>
			menuItemClickHandler(menuParam, e.currentTarget, itemsRef)
		);
	});
}
