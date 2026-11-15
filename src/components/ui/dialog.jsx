import { Button } from './button';
import { useTranslation } from '@/lib/i18n';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogHeader({ children, className = '' }) {
    return <div className={`mb-5 space-y-2 pr-8 ${className}`}>{children}</div>;
}
export function DialogContent({ children, className = '', ...props }) {
    const { t } = useTranslation();
    const hasCustomMaxWidth = className.includes('max-w-');
    const hasCustomPadding = className.includes('p-') || className.includes('!p-');
    return (
        <Primitive.Portal>
            <Primitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" />
            <Primitive.Content
                aria-describedby={undefined}
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                className={`fixed z-50 w-[calc(100%-2rem)] ${
                    hasCustomMaxWidth ? '' : 'max-w-lg'
                } rounded-2xl border bg-white ${
                    hasCustomPadding ? '' : 'p-6'
                } max-h-[90vh] overflow-y-auto ${className}`}
                {...props}
            >
                {children}
                <Primitive.Close asChild>
                    <Button variant="ghost" size="icon" aria-label={t("Close")} className="absolute right-4 top-4">
                        <X size={16} weight="duotone" />
                    </Button>
                </Primitive.Close>
            </Primitive.Content>
        </Primitive.Portal>
    );
}
