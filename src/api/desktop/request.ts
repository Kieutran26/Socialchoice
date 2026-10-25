import { matches, paginate, aggregate } from '../../../server/query.js';
import { invokeNative, localMediaUrl, type Invoke } from './runtime.ts';

type Row = { id: string; [key: string]: unknown };
type Query = Record<string, unknown>;
type Options = { sort?: string; limit?: number; cursor?: string; fields?: string[] };

// Native commands own persistence and validation; retain the existing pure query contract.
export async function desktopRequest(path: string, args: unknown[] = [], invoke: Invoke = invokeNative): Promise<unknown> {
    try {
        if (/^(meta|threads|linkedin|tiktok|social)\/(status|start|pages|profile|import|check|disconnect|cancel)$/.test(path)) return await invoke('workspace_social', { path, args });
        const match = /^entities\/([A-Za-z]+)\/([A-Za-z]+)$/.exec(path);
        if (!match) return await invoke('workspace_request', { path, args });
        const [, entity, operation] = match;
        if (['filter', 'list', 'count', 'get', 'aggregate'].includes(operation)) {
            const rows = await invoke<Row[]>('workspace_request', { path: `entities/${entity}/all`, args: [] });
            if (entity === 'MediaAsset') for (const row of rows) row.file_url = localMediaUrl(String(row.file_url));
            if (operation === 'get') {
                const row = rows.find(value => value.id === args[0]);
                if (!row) throw new Error('Record not found');
                return row;
            }
            if (operation === 'aggregate') {
                const options = (args[0] || {}) as Query & { query?: Query };
                return aggregate(rows.filter(value => matches(value, options.query || {})), options);
            }
            if (operation === 'count') return rows.filter(value => matches(value, args[0] || {})).length;
            if (operation === 'filter') return paginate(rows.filter(value => matches(value, args[0] || {})), (args[1] || {}) as Options);
            return paginate(rows, (args[0] || {}) as Options);
        }
        return await invoke('workspace_request', { path, args });
    } catch (error) {
        // Tauri rejects Result errors as strings; forms expect Error.message.
        throw error instanceof Error ? error : new Error(String(error));
    }
}
