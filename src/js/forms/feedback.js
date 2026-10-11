import FetchWrapper from '@js/modules/api/index.js';
import { myModules } from '@js/modules/registry.js';

const API = new FetchWrapper(import.meta.env.VITE_API_URL);

const feedbackForm = document.querySelector('.feedback-form');
const feedbackStatus = feedbackForm?.querySelector('.feedback-form__status');

let feedbackCloseTimer;

function showFeedbackStatus(text, isError = false) {
	feedbackStatus.textContent = text;
	feedbackStatus.classList.toggle('_error', isError);
	feedbackStatus.hidden = false;
}

function resetForm(form) {
	form.reset();
	[...form.elements].forEach((el) => {
		delete el.dataset.touched;
		el.classList.remove('_form-error');
		el.removeAttribute('aria-invalid');
	});
}

async function submitFormHandler(e) {
	const form = e.currentTarget;
	const button = form.querySelector('[type="submit"]');
	const body = e.detail;

	try {
		button?.setAttribute('disabled', '');

		const { data } = await API.post('/posts', body);

		resetForm(form);
		form.dispatchEvent(new CustomEvent('form:sent', { detail: { data } }));
	} catch (error) {
		form.dispatchEvent(new CustomEvent('form:error', { detail: { error } }));
	} finally {
		button?.removeAttribute('disabled');
	}
}

function sentFormHandler() {
	showFeedbackStatus('Message sent. Thank you!');

	feedbackCloseTimer = setTimeout(() => {
		myModules.popup?.close();
	}, 2000);
}

function errorFormHandler(e) {
	console.error(e.detail.error);
	showFeedbackStatus('Could not send the message. Please try again.', true);
}

if (feedbackForm) {
	feedbackForm.addEventListener('form:submit', submitFormHandler);
	feedbackForm.addEventListener('form:sent', sentFormHandler);
	feedbackForm.addEventListener('form:error', errorFormHandler);

	document.addEventListener('afterPopupClose', () => {
		clearTimeout(feedbackCloseTimer);
		feedbackStatus.hidden = true;
	});
}
