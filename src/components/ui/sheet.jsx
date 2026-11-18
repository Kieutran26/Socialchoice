import * as Primitive from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import { Button } from './button';
import { useTranslation } from '@/lib/i18n';

export const Sheet = Primitive.Root;
export const SheetTrigger = Primitive.Trigger;
export const SheetTitle = Primitive.Title;
export const SheetDescription = Primitive.Description;

export function SheetContent({ children, className = '', ...props }) {
    const { t } = useTranslation();
    return (
        <Primitive.Portal>
            <Primitive.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]" />
            <Primitive.Content
                aria-describedby={undefined}
                className={`sheet-right fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl outline-none ${className}`}
                {...props}
            >
                {children}
                <Primitive.Close asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('Close')}
                        className="absolute right-4 top-3.5"
                    >
                        <X size={16} weight="duotone" />
                    </Button>
                </Primitive.Close>
            </Primitive.Content>
        </Primitive.Portal>
    );
}
