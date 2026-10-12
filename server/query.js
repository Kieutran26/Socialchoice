export function matches(row, query = {}) {
    return Object.entries(query).every(([key, expected]) => {
        if (key === '$or') return expected.some((clause) => matches(row, clause));
        if (key === '$and') return expected.every((clause) => matches(row, clause));
        const value = row[key];
        const values = Array.isArray(value) ? value : [value];
        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
            return Object.entries(expected).every(([op, bound]) => {
                if (op === '$options') return true;
                if (op === '$in') return values.some((v) => bound.includes(v));
                if (op === '$regex') return String(value ?? '').toLowerCase().includes(String(bound).toLowerCase());
                if (value == null) return false;
                if (op === '$gte') return value >= bound;
                if (op === '$gt') return value > bound;
                if (op === '$lte') return value <= bound;
                if (op === '$lt') return value < bound;
                if (op === '$ne') return value !== bound;
                throw Object.assign(new Error('Unsupported filter operator'), { status: 400 });
            });
        }
        return values.includes(expected);
    });
}

export function paginate(rows, options = {}) {
    const sort = options.sort || '-created_date';
    const field = sort.replace(/^-/, '');
    const direction = sort.startsWith('-') ? -1 : 1;
    rows.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * direction || a.id.localeCompare(b.id));
    const start = Number(options.cursor || 0);
    const limit = Math.min(Math.max(Number(options.limit || 100), 1), 1000);
    if (!Number.isInteger(start) || start < 0 || !Number.isInteger(limit)) throw Object.assign(new Error('Invalid pagination'), { status: 400 });
    const items = rows.slice(start, start + limit).map((row) => options.fields
        ? Object.fromEntries(['id', ...options.fields].map((key) => [key, row[key]])) : row);
    const hasMore = start + limit < rows.length;
    return { items, total: rows.length, has_more: hasMore, next_cursor: hasMore ? String(start + limit) : null };
}

export function aggregate(rows, options) {
    const groups = new Map();
    for (const row of rows) {
        let field = options.groupBy || 'bucket';
        let value = row[field] ?? '';
        if (options.dateBucket) {
            const date = new Date(row[options.dateBucket.field]);
            if (!Number.isFinite(date.getTime())) continue;
            date.setUTCHours(0, 0, 0, 0);
            if (options.dateBucket.unit === 'week') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
            if (options.dateBucket.unit === 'month') date.setUTCDate(1);
            value = date.toISOString().slice(0, 10);
            field = 'bucket';
        }
        const key = JSON.stringify(value);
        groups.set(key, { [field]: value, count: (groups.get(key)?.count || 0) + 1 });
    }
    return { rows: [...groups.values()].sort((a, b) => String(a.bucket || '').localeCompare(String(b.bucket || ''))) };
}
