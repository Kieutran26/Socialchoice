import { useTranslation } from '@/lib/i18n';
import { forwardRef } from 'react';
import { localizeValidation } from './form-validation';
export const Input = forwardRef(function Input(/** @type {import('react').ComponentPropsWithoutRef<'input'>} */ { className = '', onInvalid, onInput, ...props }, /** @type {import('react').ForwardedRef<HTMLInputElement>} */ ref) {
    const { language } = useTranslation();
    return <input lang={language} ref={ref} className={`w-full rounded-lg border border-input bg-white px-3 py-2 text-sm disabled:opacity-50 ${className}`} {...props} onInvalid={event => { localizeValidation(event.currentTarget); onInvalid?.(event); }} onInput={event => { event.currentTarget.setCustomValidity(''); onInput?.(event); }} />;
});
