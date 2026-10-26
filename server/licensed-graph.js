// Recheck central entitlement before each provider call, including calls within an already running delivery loop.
export const LICENSE_CHECK_DENIED = Symbol('license-check-denied-before-provider-call');
export function licensedGraph(graph, authorize) {
    if (!graph || !authorize) return graph;
    return new Proxy(graph, { get(target, name) {
        const value = Reflect.get(target, name);
        return typeof value === 'function' ? async (...args) => {
            try { await authorize(); } catch (error) { error[LICENSE_CHECK_DENIED] = true; throw error; }
            return value.apply(target, args);
        } : value;
    } });
}
