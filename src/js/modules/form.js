function isFormContent(target) {
	if (!target.closest('form') || target.closest('button')) return false;
	return true;
}

function formFocusInHandler(e) {
	const target = e.target;

	if (!isFormContent(target)) return;

	target.classList.add('_form-focus');
	target.classList.remove('_form-error');
}

function formFocusOutHandler(e) {
	const target = e.target;

	if (!isFormContent(target)) return;

	target.classList.remove('_form-focus');

	if (target.willValidate) {
		target.checkValidity();
	}
}

function validField(field) {
	const valid = !field.validity.valid;

	let message = field.parentElement.querySelector('.form-error-text');

	if (!field.validity.valid) {
		if (!message) {
			message = document.createElement('span');
			message.className = 'form-error-text';
			field.parentElement.append(message);
		}
		message.textContent = field.validationMessage;
	} else {
		message?.remove();
	}

	field.setAttribute('aria-invalid', String(!valid));
}

function invalidFieldHandler(e) {
	e.preventDefault();
	validField(e.target);
}

export function initForms() {
	document.addEventListener('focusin', formFocusInHandler);
	document.addEventListener('focusout', formFocusOutHandler);
	document.addEventListener('invalid', invalidFieldHandler, { capture: true });

	document.addEventListener('submit', (e) => {
		e.preventDefault();

		const form = e.target;
		const formData = Object.fromEntries(new FormData(form));

		form.dispatchEvent(
			new CustomEvent('form:submit', {
				detail: formData,
			})
		);
	});
}
