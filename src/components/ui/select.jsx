import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ children, className = '', ...props }) {
    return (
        <SelectPrimitive.Trigger
            className={`flex w-full items-center justify-between gap-2 border border-input rounded-lg bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${className}`}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon>
                <CaretDown size={14} className="text-muted-foreground shrink-0" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
}

export function SelectContent({ children, className = '', ...props }) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                position="popper"
                className={`z-50 max-h-72 overflow-auto rounded-xl border border-border bg-white p-1 min-w-[var(--radix-select-trigger-width)] shadow-lg animate-in fade-in-80 ${className}`}
                {...props}
            >
                <SelectPrimitive.Viewport className="p-0.5">
                    {children}
                </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
}

export function SelectItem(/** @type {import("@radix-ui/react-select").SelectItemProps} */ { children, className = '', ...props }) {
    return (
        <SelectPrimitive.Item
            className={`relative flex items-center cursor-pointer rounded-lg py-2 pl-8 pr-3 text-sm outline-none select-none data-[highlighted]:bg-muted/70 data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors ${className}`}
            {...props}
        >
            <SelectPrimitive.ItemIndicator className="absolute left-2.5 flex h-4 w-4 items-center justify-center text-foreground">
                <Check size={13} weight="bold" />
            </SelectPrimitive.ItemIndicator>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}

