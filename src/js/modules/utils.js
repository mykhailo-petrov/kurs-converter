export function setExclusiveActiveItem(curTarget, itemsRef, activeClass) {
	const activeItem = itemsRef.find((item) => item.classList.contains(activeClass));
	if (curTarget.classList.contains(activeClass)) return;
	if (!activeItem) curTarget.classList.add(activeClass);
	else {
		activeItem.classList.remove(activeClass);
		curTarget.classList.add(activeClass);
	}
}

export function isPrefersReduced() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMinBreakpoint(value) {
	return window.matchMedia(`(min-width: ${value}px)`).matches;
}

let lastScroll = window.scrollY;
let scrollDown = false;

window.addEventListener(
	'scroll',
	() => {
		const currentScroll = window.scrollY;

		if (currentScroll !== lastScroll) scrollDown = currentScroll > lastScroll;
		lastScroll = currentScroll;
	},
	{ passive: true }
);

export function isScrollDown() {
	return scrollDown;
}

export function showBlockError(root) {
	const errorMessage = root.querySelector('[data-block-error]');

	root.classList.add('_error');

	[...root.children].forEach((child) => {
		if (child !== errorMessage) child.inert = true;
	});
}

export function format(value, count = 2) {
	return Number.isFinite(value) ? value.toFixed(count) : '';
}

export function validateAmount(value, maxIntegerDigits = 12, maxFractionDigits = 2) {
	const [integer = '', ...fraction] = value
		.replaceAll(',', value.includes('.') ? '' : '.')
		.replace(/[^\d.]/g, '')
		.split('.');

	const validatedInteger = integer
		.replace(/^0+(?=\d)/, '')
		.slice(0, maxIntegerDigits);

	if (!fraction.length) return validatedInteger;

	const validatedFraction = fraction
		.join('')
		.slice(0, maxFractionDigits);

	return `${validatedInteger || '0'}.${validatedFraction}`;
}
