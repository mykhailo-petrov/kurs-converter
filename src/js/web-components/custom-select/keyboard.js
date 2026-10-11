import {
	getOptions,
	getSelectSelectors,
	scrollToOption,
} from '@js/web-components/custom-select/options.js';

const HANDLED_KEYS_OPEN = ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '];
const HANDLED_KEYS_CLOSE = ['ArrowUp', 'ArrowDown', 'Enter', ' '];

export function handleTriggerKeyDown(select, e) {
	const isOpen = select.classList.contains('_show');
	if (!isOpen) {
		if (HANDLED_KEYS_CLOSE.includes(e.key)) {
			e.preventDefault();
			select.open();
		}
		return;
	}
	if (e.key === ' ' && e.target === select.searchInput) return;

	if (HANDLED_KEYS_OPEN.includes(e.key)) e.preventDefault();

	const options = getOptions(select.optionsContainer)
		.filter((option) => !option.hidden);
	const { focusedClass } = getSelectSelectors(select);
	switch (e.key) {
		case 'ArrowUp':
			prevOption(select, options, focusedClass);
			break;
		case 'ArrowDown':
			nextOption(select, options, focusedClass);
			break;
		case 'Home':
			moveFocusTo(select, options, options[0], focusedClass);
			break;
		case 'End':
			moveFocusTo(select, options, options.at(-1), focusedClass);
			break;
		case 'Escape':
			e.stopPropagation();
			select.close();
			select.trigger.focus();
			break;
		case 'Enter':
			selectFocusedOption(options, focusedClass);
			break;
	}
}

function moveFocusTo(select, options, moveToOption, focusedClass) {
	const { focusedOption } = getFocusedOption(options, focusedClass);
	if (focusedOption) {
		unFocusOption(focusedOption, focusedClass);
	}
	addFocusToOption(select, moveToOption, focusedClass);
}

function prevOption(select, options, focusedClass) {
	if (!options.length) return;
	const { focusedOption, focusedIndex } = getFocusedOption(options, focusedClass);

	if (focusedIndex === -1) return;

	if (focusedIndex < 1) {
		addFocusToOption(select, options[0], focusedClass);
		return;
	}

	unFocusOption(focusedOption, focusedClass);
	addFocusToOption(select, options[focusedIndex - 1], focusedClass);
}

function nextOption(select, options, focusedClass) {
	if (!options.length) return;

	const { focusedOption, focusedIndex } = getFocusedOption(options, focusedClass);

	if (focusedIndex === -1) {
		addFocusToOption(select, options[0], focusedClass);
		return;
	}

	if (focusedIndex >= options.length - 1) return;

	unFocusOption(focusedOption, focusedClass);
	addFocusToOption(select, options[focusedIndex + 1], focusedClass);
}

function selectFocusedOption(options, focusedClass) {
	options
		.find((option) => option.classList.contains(focusedClass))
		?.click();
}

function addFocusToOption(select, option, focusedClass) {
	option.classList.add(focusedClass);
	const focusHolder = select.contains(document.activeElement)
		? document.activeElement
		: select.trigger;
	focusHolder.setAttribute('aria-activedescendant', option.id);

	scrollToOption(select.optionsContainer, option);
}

function unFocusOption(option, focusedClass) {
	option.classList.remove(focusedClass);
}

function getFocusedOption(options, focusedClass) {
	const focusedOption = options.find((option) => option.classList.contains(focusedClass));
	const focusedIndex = options.indexOf(focusedOption);

	return { focusedOption, focusedIndex };
}
