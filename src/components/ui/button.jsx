import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 rounded-md px-3 text-xs',
                lg: 'h-10 rounded-md px-8',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    },
);
/** @typedef {import('react').ComponentPropsWithoutRef<'button'> & {asChild?: boolean, variant?: 'default'|'destructive'|'outline'|'secondary'|'ghost'|'link', size?: 'default'|'sm'|'lg'|'icon'}} ButtonProps */
export const Button = forwardRef(function Button(/** @type {ButtonProps} */ { asChild = false, variant = 'default', size = 'default', className, ...props }, /** @type {import('react').ForwardedRef<HTMLButtonElement>} */ ref) {
    const Component = asChild ? Slot : 'button';
    return <Component ref={ref} type={asChild ? undefined : 'button'} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
