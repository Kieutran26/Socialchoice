import { useTranslation } from '@/lib/i18n';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogHeader({ children }) { return <div className="mb-5 space-y-2 pr-8">{children}</div>; }
export function DialogContent({ children, className = '', ...props }) { const { t } = useTranslation(); return <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-40 bg-black/25" /><Primitive.Content aria-describedby={undefined} className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 max-h-[90vh] overflow-auto ${className}`} {...props}>{children}<Primitive.Close aria-label={t("Close")} className="absolute right-4 top-4 p-1"><X size={18} /></Primitive.Close></Primitive.Content></Primitive.Portal>; }
