export function getSelectSettings(select) {
	return {
		isLoadByAPI: select.hasAttribute('data-select-api'),
		hasDefaultValue: select.hasAttribute('data-select-selected'),
		hasSearch: select.hasAttribute('data-select-search'),
		hasIcon: select.hasAttribute('data-select-icon'),
	};
}

export function getSelectSelectors(select) {
	return {
		trigger: '[data-select-trigger]',
		label: '[data-select-label]',
		dropdown: '[data-select-dropdown]',
		options: '[data-select-options]',
		group: '[data-select-group]',
		groupClass: 'custom-select__group',
		groupLabelClass: 'custom-select__group-label',
		option: '[data-select-option]',
		optionClass: 'custom-select__option',
		optionContentClass: 'custom-select__option-content',
		optionTextClass: 'custom-select__option-text',
		optionNameClass: 'custom-select__option-name',
		searchContainer: '[data-select-search-container]',
		searchInput: '[data-select-search-input]',
		focusedClass: '_select-focus',
	};
}

export function getOptions(container) {
	return [...container.querySelectorAll('[data-select-option]')];
}

export function getSelectedOption(container) {
	return getOptions(container)
		.find((option) => option.hasAttribute('selected'));
}

export function getOptionByValue(container, value) {
	return getOptions(container)
		.find((option) => option.getAttribute('value') === value);
}

export function getOptionValue(option) {
	return option.getAttribute('value');
}

export function getOptionLabel(option) {
	return option.dataset.label ?? option.textContent.trim();
}

export function getOptionSearchText(option) {
	return [option.getAttribute('value'), getOptionLabel(option), option.dataset.name]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

export function markSelected(option) {
	option.setAttribute('selected', '');
}

export function unmarkSelected(option) {
	option.removeAttribute('selected');
}

const SERVICE_DATA_KEYS = ['selectOption', 'selectLabel'];

export function clearLabelData(label) {
	label.removeAttribute('value');
	label.classList.remove('_select-icon-sm');

	Object.keys(label.dataset)
		.forEach((key) => {
			if (!SERVICE_DATA_KEYS.includes(key)) delete label.dataset[key];
		});
}

export function updateLabel(label, option) {
	clearLabelData(label);

	label.setAttribute('value', option.getAttribute('value'));

	if (option.dataset.icon) label.dataset.icon = option.dataset.icon;
	if (option.classList.contains('_select-icon-sm')) label.classList.add('_select-icon-sm');

	label.textContent = getOptionLabel(option);
}

export function createOption({ text, value, icon = null, name = null, className, contentClasses }) {
	const option = document.createElement('span');
	option.setAttribute('value', value);
	option.setAttribute('role', 'option');
	option.dataset.selectOption = '';
	option.dataset.label = text;
	option.className = className;

	if (name) {
		option.append(createOptionContent(text, name, contentClasses));
	} else {
		option.textContent = text;
	}

	if (icon) {
		option.dataset.icon = icon;

		if (icon.length > 1) {
			option.classList.add(`_select-icon-sm`);
		}
	}

	return option;
}

function createOptionContent(text, name, classes) {
	const content = document.createElement('span');
	const textEl = document.createElement('span');
	const nameEl = document.createElement('span');

	content.className = classes.content;
	textEl.className = classes.text;
	nameEl.className = classes.name;

	textEl.textContent = text;
	nameEl.textContent = name;

	content.append(textEl, nameEl);
	return content;
}

export function appendInitialOptions(container, options, idPrefix) {
	options.forEach((option) => {
		ensureOptionId(option, idPrefix);
		container.appendChild(option);
	});
}

export function ensureOptionId(option, prefix) {
	if (option.id) return;

	const value = (option.getAttribute('value') ?? '').replace(/[^\w-]/g, '_');
	option.id = `${prefix}-option-${value}`;
}

export function scrollToOption(optionsContainer, option, behaviour = true, position = 'bottom') {
	if (!optionsContainer || !option) return;

	optionsContainer.style.scrollBehavior = behaviour ? 'smooth' : 'auto';

	const containerRect = optionsContainer.getBoundingClientRect();
	const optionRect = option.getBoundingClientRect();

	if (position !== 'bottom') {
		if (optionRect.top < containerRect.top) {
			optionsContainer.scrollTop -= containerRect.bottom - optionRect.bottom;
		} else if (optionRect.bottom > containerRect.bottom) {
			optionsContainer.scrollTop += optionRect.top - containerRect.top;
		}
	} else {
		if (optionRect.top < containerRect.top) {
			optionsContainer.scrollTop -= containerRect.top - optionRect.top;
		} else if (optionRect.bottom > containerRect.bottom) {
			optionsContainer.scrollTop += optionRect.bottom - containerRect.bottom;
		}
	}
}
