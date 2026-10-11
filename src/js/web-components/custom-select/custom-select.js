import templateHtml from './custom-select.html?raw';
import {
	getSelectSettings,
	appendInitialOptions,
	createOption,
	getSelectedOption,
	markSelected,
	updateLabel,
	clearLabelData,
	unmarkSelected,
	getOptionValue,
	getOptionByValue,
	getOptionSearchText,
	getSelectSelectors,
	getOptions,
	ensureOptionId,
	scrollToOption,
} from './options.js';
import { handleTriggerKeyDown } from './keyboard.js';

export default class CustomSelect extends HTMLElement {
	static formAssociated = true;

	#value = '';
	#idPrefix;
	#selectSettings;
	#selectSelectors = getSelectSelectors(this);
	#defaultOption = null;
	#placeholderText = '';

	constructor() {
		super();

		this.internals = this.attachInternals();
	}

	connectedCallback() {
		if (!this.initialized) this.#initSelect();
	}

	disconnectedCallback() {
		this.close();
	}

	formResetCallback() {
		if (!this.initialized) return;

		const selectedOption = getSelectedOption(this.optionsContainer);
		if (selectedOption) unmarkSelected(selectedOption);

		if (this.#defaultOption) {
			this.#selectOption(this.#defaultOption);
		} else {
			this.#clearSelection();
		}
	}

	get value() {
		return this.#value;
	}

	set value(newValue) {
		if (!this.initialized) {
			this.#value = newValue;
			this.internals.setFormValue(newValue);
			return;
		}

		const targetOption = getOptionByValue(this.optionsContainer, newValue);
		const selectedOption = getSelectedOption(this.optionsContainer);

		if (selectedOption && selectedOption !== targetOption) {
			unmarkSelected(selectedOption);
		}

		if (targetOption) {
			this.#selectOption(targetOption);
			return;
		}

		this.#clearSelection();
	}

	open() {
		this.#updateDropdownDirection();
		this.classList.add('_show');
		this.trigger.setAttribute('aria-expanded', 'true');
		this.#focus();
		document.addEventListener('click', this.#onDocumentClick);
	}

	#updateDropdownDirection() {
		this.classList.remove('_direction-up');
		const triggerRect = this.trigger.getBoundingClientRect();
		const dropdownStyles = getComputedStyle(this.dropdown);
		const dropdownHeight = this.dropdown.offsetHeight;
		const dropdownSpace = dropdownHeight + parseFloat(dropdownStyles.marginTop);
		const spaceBelow = document.documentElement.clientHeight - triggerRect.bottom;
		const spaceAbove = triggerRect.top;

		if (spaceBelow < dropdownSpace && spaceAbove > spaceBelow && spaceAbove > dropdownHeight) {
			this.classList.add('_direction-up');
		}
	}

	#focus() {
		const firstOption = getOptions(this.optionsContainer)
			.find((option) => !option.hidden);
		const selectedOption = getSelectedOption(this.optionsContainer) ?? firstOption;

		if (!selectedOption) return;

		if (this.#selectSettings.hasSearch) {
			this.searchInput.focus();
			this.searchInput.setAttribute('aria-activedescendant', selectedOption.id);
		} else {
			this.trigger.focus();
			this.trigger.setAttribute('aria-activedescendant', selectedOption.id);
		}
		selectedOption.classList.add(this.#selectSelectors.focusedClass);
		scrollToOption(this.optionsContainer, selectedOption, false, 'top');
	}

	#resetFocus() {
		getOptions(this.optionsContainer)
			.find((option) => option.classList.contains(this.#selectSelectors.focusedClass))
			?.classList.remove(this.#selectSelectors.focusedClass);
	}

	close() {
		this.classList.remove('_show');
		this.trigger.setAttribute('aria-expanded', 'false');
		if (this.#selectSettings.hasSearch) this.#resetSearch();
		this.#resetFocus();
		this.trigger.removeAttribute('aria-activedescendant');
		document.removeEventListener('click', this.#onDocumentClick);
	}

	toggle = () => {
		if (!this.classList.contains('_show')) {
			this.open();
		} else {
			this.close();
		}
	};

	addOption = (item) => {
		const option = this.#buildOption(item);

		if (this.optionsContainer) {
			this.optionsContainer.append(option);
		} else {
			this.append(option);
		}
	};

	addOptions(list, groupLabel) {
		const target = groupLabel ? this.#createGroup(groupLabel) : this.optionsContainer;

		list.forEach((item) => {
			target.append(this.#buildOption(item));
		});

		if (!getSelectedOption(this.optionsContainer)) this.#applyDefaultOption();
	}

	#buildOption({ text, value, icon, name }) {
		const option = createOption({
			text,
			value,
			icon,
			name,
			className: this.#selectSelectors.optionClass,
			contentClasses: {
				content: this.#selectSelectors.optionContentClass,
				text: this.#selectSelectors.optionTextClass,
				name: this.#selectSelectors.optionNameClass,
			},
		});

		ensureOptionId(option, this.#idPrefix);
		return option;
	}

	#createGroup(label) {
		const group = document.createElement('div');
		const labelId = `${this.#idPrefix}-group-${label
			.toLowerCase()
			.replace(/\W+/g, '-')}`;

		group.className = this.#selectSelectors.groupClass;
		group.setAttribute('role', 'group');
		group.dataset.selectGroup = '';
		group.setAttribute('aria-labelledby', labelId);
		group.innerHTML = `<span class="${this.#selectSelectors.groupLabelClass}" id="${labelId}"></span>`;
		group.firstElementChild.textContent = label;

		this.optionsContainer.append(group);
		return group;
	}

	#initSelect() {
		this.#selectSettings = getSelectSettings(this);
		this.#idPrefix =
			this.id ||
			`select-${crypto
				.randomUUID()
				.slice(0, 8)}`;

		const initialOptions = this.#selectSettings.isLoadByAPI ? [] : Array.from(this.children);

		this.innerHTML = templateHtml;

		this.optionsContainer = this.querySelector(this.#selectSelectors.options);
		this.trigger = this.querySelector(this.#selectSelectors.trigger);
		this.label = this.querySelector(this.#selectSelectors.label);
		this.dropdown = this.querySelector(this.#selectSelectors.dropdown);
		this.searchContainer = this.querySelector(this.#selectSelectors.searchContainer);
		this.searchInput = this.querySelector(this.#selectSelectors.searchInput);
		this.#placeholderText = this.label.textContent;

		if (initialOptions.length > 0) {
			appendInitialOptions(this.optionsContainer, initialOptions, this.#idPrefix);
		}

		this.addEventListener('click', this.#onSelectClick);
		this.trigger.addEventListener('click', this.toggle);
		this.optionsContainer.addEventListener('mousedown', (e) => e.preventDefault());
		this.addEventListener('keydown', (e) => handleTriggerKeyDown(this, e));
		this.addEventListener('focusout', (e) => {
			if (!this.contains(e.relatedTarget)) this.close();
		});

		this.initialized = true;

		if (!this.#selectSettings.isLoadByAPI) this.#applyDefaultOption();

		if (this.#selectSettings.hasSearch) {
			this.#initSearch();
		}
	}

	#initSearch() {
		this.searchContainer.removeAttribute('hidden');
		this.searchContainer.setAttribute('aria-hidden', 'false');

		this.searchInput.addEventListener('input', this.#searchHandler);
		this.searchInput.addEventListener('change', (e) => e.stopPropagation());
	}

	#searchHandler = (e) => {
		const searchedValue = e.currentTarget.value.toLowerCase().trim();
		const options = getOptions(this.optionsContainer);
		this.searchInput.removeAttribute('aria-activedescendant');

		options.forEach((option) => {
			option.classList.remove(this.#selectSelectors.focusedClass);

			option.hidden =
				searchedValue.length &&
				!getOptionSearchText(option)
					.includes(searchedValue);
		});

		if (searchedValue.length) {
			const firstOption = options.find((option) => !option.hidden);
			if (firstOption) {
				firstOption.classList.add(this.#selectSelectors.focusedClass);
				this.searchInput.setAttribute('aria-activedescendant', firstOption.id);
			}
		}

		this.#getGroups()
			.forEach((group) => {
				group.hidden = !group.querySelector(`${this.#selectSelectors.option}:not([hidden])`);
			});
	};

	#getGroups() {
		return [...this.optionsContainer.querySelectorAll(this.#selectSelectors.group)];
	}

	#resetSearch() {
		if (!this.#selectSettings.hasSearch) return;

		const options = getOptions(this.optionsContainer);

		options.forEach((option) => {
			option.classList.remove(this.#selectSelectors.focusedClass);
			option.hidden = false;
		});
		this.#getGroups()
			.forEach((group) => {
				group.hidden = false;
			});
		this.searchInput.removeAttribute('aria-activedescendant');
		this.searchInput.value = '';
	}

	#applyDefaultOption() {
		const markedOption = getSelectedOption(this.optionsContainer);
		const firstOption = this.optionsContainer.querySelector(this.#selectSelectors.option);
		const presetOption = this.#value
			? getOptionByValue(this.optionsContainer, this.#value)
			: undefined;

		this.#defaultOption =
			markedOption ?? (this.#selectSettings.hasDefaultValue ? firstOption : null);

		const startOption = presetOption ?? this.#defaultOption;

		if (!startOption) return;

		if (markedOption && markedOption !== startOption) unmarkSelected(markedOption);

		this.#selectOption(startOption);
	}

	#select(option) {
		if (option.hasAttribute('selected')) return;

		const selectedOption = getSelectedOption(this.optionsContainer);

		if (selectedOption) {
			unmarkSelected(selectedOption);
		}

		this.#selectOption(option);

		this.close();
		this.trigger.focus();

		this.dispatchEvent(
			new CustomEvent('change', {
				bubbles: true,
				detail: {
					value: this.value,
				},
			})
		);
	}

	#selectOption(option) {
		markSelected(option);
		updateLabel(this.label, option);

		this.#value = getOptionValue(option);
		this.internals.setFormValue(this.#value);
	}

	#clearSelection() {
		this.#value = '';
		this.internals.setFormValue('');

		clearLabelData(this.label);
		this.label.textContent = this.#placeholderText;
	}

	#onSelectClick = (e) => {
		e.preventDefault();

		const option = e.target.closest(this.#selectSelectors.option);
		if (!option) return;

		this.#select(option);
	};

	#onDocumentClick = (e) => {
		if (this.contains(e.target)) return;
		this.close();
	};
}

customElements.define('custom-select', CustomSelect);
