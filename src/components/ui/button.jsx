import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
/** @typedef {import('react').ComponentPropsWithoutRef<'button'> & {asChild?: boolean, variant?: string, size?: string}} ButtonProps */
export const Button = forwardRef(function Button(/** @type {ButtonProps} */ { asChild, variant = 'default', size, className = '', ...props }, /** @type {import('react').ForwardedRef<HTMLButtonElement>} */ ref) {
    const Component = asChild ? Slot : 'button';
    return <Component ref={ref} type={asChild ? undefined : 'button'} className={`${variant === 'default' ? 'btn-skew' : 'inline-flex items-center justify-center border border-border rounded-lg px-3 py-2 hover:bg-muted'} ${variant === 'ghost' ? 'border-transparent' : ''} ${size === 'sm' ? 'text-xs' : 'text-sm'} disabled:opacity-50 disabled:cursor-not-allowed ${className}`} {...props} />;
});
