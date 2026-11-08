import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CaretRight, Check } from '@phosphor-icons/react';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuSubTrigger({ className = '', inset = false, children, ...props }) {
    return (
        <DropdownMenuPrimitive.SubTrigger
            className={`flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[state=open]:bg-muted ${inset ? 'pl-8' : ''} ${className}`}
            {...props}
        >
            {children}
            <CaretRight size={12} className="ml-auto text-muted-foreground" />
        </DropdownMenuPrimitive.SubTrigger>
    );
}

export function DropdownMenuSubContent({ className = '', ...props }) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.SubContent
                className={`z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card p-1 text-foreground shadow-lg animate-in fade-in-80 text-xs ${className}`}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

export function DropdownMenuContent({ className = '', sideOffset = 4, ...props }) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                sideOffset={sideOffset}
                className={`z-50 min-w-[170px] overflow-hidden rounded-xl border border-border bg-card p-1 text-foreground shadow-md animate-in fade-in-80 text-xs ${className}`}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

export function DropdownMenuItem({ className = '', inset = false, ...props }) {
    return (
        <DropdownMenuPrimitive.Item
            className={`relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${inset ? 'pl-8' : ''} ${className}`}
            {...props}
        />
    );
}

export function DropdownMenuSeparator({ className = '', ...props }) {
    return (
        <DropdownMenuPrimitive.Separator
            className={`-mx-1 my-1 h-px bg-border/60 ${className}`}
            {...props}
        />
    );
}
