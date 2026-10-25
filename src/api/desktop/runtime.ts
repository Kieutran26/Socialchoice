export type Invoke = <T>(command: string, args: Record<string, unknown>) => Promise<T>;
type DesktopWindow = Window & { __TAURI__?: { core: { invoke: Invoke; convertFileSrc: (path: string) => string } } };

export function localMediaUrl(path: string): string {
    const convert = (window as DesktopWindow).__TAURI__?.core.convertFileSrc;
    if (!convert) throw new Error('Desktop runtime is unavailable');
    return convert(path);
}

export function isDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as DesktopWindow).__TAURI__;
}

export const invokeNative: Invoke = (command, args) => {
    const invoke = (window as DesktopWindow).__TAURI__?.core.invoke;
    if (!invoke) return Promise.reject(new Error('Desktop runtime is unavailable'));
    return invoke(command, args);
};
