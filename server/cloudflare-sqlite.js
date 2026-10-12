export function cloudflareSqlite(storage) {
    return {
        close() {},
        exec: sql => storage.sql.exec(sql),
        prepare: sql => ({
            all: (...args) => [...storage.sql.exec(sql, ...args)],
            get: (...args) => [...storage.sql.exec(sql, ...args)][0],
            run: (...args) => { storage.sql.exec(sql, ...args); },
        }),
    };
}
