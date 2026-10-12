import { toast as notify } from 'sonner';
export function toast(/** @type {{title?: string, description?: string, variant?: string}} */ { title, description, variant } = {}) { return (variant === 'destructive' ? notify.error : notify)(title, { description }); }
export function useToast() { return { toast }; }
