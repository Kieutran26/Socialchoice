import { getLanguage, translate } from '../../lib/i18n-core.js';

/** @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} control */
export function localizeValidation(control) {
    control.setCustomValidity('');
    if (getLanguage() !== 'vi') return;
    const validity = control.validity;
    if (validity.valueMissing) control.setCustomValidity(translate('Please complete this field.'));
    else if (validity.rangeUnderflow) control.setCustomValidity(translate('Enter a value of at least {min}.', { min: /** @type {HTMLInputElement} */ (control).min }));
    else if (validity.rangeOverflow) control.setCustomValidity(translate('Enter a value no greater than {max}.', { max: /** @type {HTMLInputElement} */ (control).max }));
    else if (!validity.valid) control.setCustomValidity(translate('Enter a valid value.'));
}
