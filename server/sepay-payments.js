export function extractOrderCode(text) {
    const match = String(text || '').toUpperCase().match(/\b(SC[C2]\d{6})\b/);
    return match ? match[1] : '';
}

export function createSepayPayments(db) {
    db.exec(
        'CREATE TABLE IF NOT EXISTS sepay_payments (id TEXT PRIMARY KEY, order_code TEXT NOT NULL, amount INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);' +
        'CREATE INDEX IF NOT EXISTS sepay_by_order ON sepay_payments(order_code);' +
        'CREATE TABLE IF NOT EXISTS receipt_orders (order_code TEXT PRIMARY KEY, email TEXT NOT NULL, customer_name TEXT, plan_name TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL, market TEXT NOT NULL, gateway TEXT NOT NULL, email_sent INTEGER NOT NULL DEFAULT 0, email_id TEXT, keys_json TEXT, created_at TEXT NOT NULL);'
    );

    const insertStmt = db.prepare(
        'INSERT OR IGNORE INTO sepay_payments (id, order_code, amount, data, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const selectByOrderStmt = db.prepare(
        'SELECT id, order_code, amount, data, created_at FROM sepay_payments WHERE order_code = ? ORDER BY created_at DESC'
    );
    const selectAllPaymentsStmt = db.prepare(
        'SELECT id, order_code, amount, data, created_at FROM sepay_payments ORDER BY created_at DESC LIMIT ?'
    );
    const upsertReceiptStmt = db.prepare(
        'INSERT INTO receipt_orders (order_code, email, customer_name, plan_name, kind, amount, market, gateway, email_sent, email_id, keys_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(order_code) DO UPDATE SET email_sent = MAX(email_sent, excluded.email_sent), email_id = COALESCE(excluded.email_id, email_id)'
    );
    const selectAllReceiptsStmt = db.prepare(
        'SELECT order_code, email, customer_name, plan_name, kind, amount, market, gateway, email_sent, email_id, keys_json, created_at FROM receipt_orders ORDER BY created_at DESC LIMIT ?'
    );

    return {
        recordWebhook(payload) {
            if (!payload || typeof payload !== 'object') {
                return { recorded: false, reason: 'invalid_payload' };
            }
            const transferType = String(payload.transferType || 'in').toLowerCase();
            const amount = Math.round(Number(payload.transferAmount ?? payload.amount ?? 0));
            if (transferType !== 'in' || !Number.isFinite(amount) || amount <= 0) {
                return { recorded: false, reason: 'ignored_non_incoming' };
            }

            const rawOrderText = [payload.code, payload.content, payload.description, payload.orderCode]
                .filter(Boolean)
                .join(' ');
            const orderCode = extractOrderCode(rawOrderText);
            if (!orderCode) {
                return { recorded: false, reason: 'no_order_code_matched' };
            }

            const txId = String(
                payload.id ||
                payload.referenceCode ||
                `${orderCode}-${payload.transactionDate || Date.now()}-${amount}`
            );
            const nowIso = new Date().toISOString();
            insertStmt.run(
                txId,
                orderCode,
                amount,
                JSON.stringify({
                    gateway: payload.gateway || '',
                    accountNumber: payload.accountNumber || '',
                    referenceCode: payload.referenceCode || '',
                    transactionDate: payload.transactionDate || nowIso,
                    content: payload.content || '',
                }),
                nowIso
            );

            return { recorded: true, transactionId: txId, orderCode, amount };
        },

        recordReceiptOrder(order, emailResult = {}) {
            const orderCode = String(order?.orderCode || '').trim().toUpperCase();
            if (!orderCode) return;
            const rawGateway = String(order?.gateway || order?.provider || '').trim().toLowerCase();
            const market = String(order?.market || (rawGateway === 'whop' ? 'whop' : 'vn')).trim().toLowerCase();
            const gateway = rawGateway === 'whop' || market === 'whop'
                ? 'Whop'
                : market === 'intl'
                  ? 'Polar.sh'
                  : 'SePay VietQR';
            upsertReceiptStmt.run(
                orderCode,
                String(order?.email || '').trim().toLowerCase(),
                String(order?.customerName || '').trim(),
                String(order?.planName || 'SocialChoice').trim(),
                String(order?.kind || 'cloud').trim(),
                Math.round(Number(order?.amount || 0)),
                market,
                gateway,
                emailResult?.sent ? 1 : 0,
                emailResult?.id ? String(emailResult.id) : null,
                JSON.stringify(Array.isArray(order?.keys) ? order.keys : []),
                new Date().toISOString()
            );
        },

        verifyOrder({ orderCode, minAmount = 0 }) {
            const cleanCode = extractOrderCode(orderCode) || String(orderCode || '').trim().toUpperCase();
            if (!cleanCode) {
                return { paid: false, orderCode: '', paidAmount: 0, reason: 'missing_order_code' };
            }
            const rows = selectByOrderStmt.all(cleanCode);
            if (!rows || rows.length === 0) {
                return { paid: false, orderCode: cleanCode, paidAmount: 0, reason: 'not_found_yet' };
            }
            const totalPaid = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
            const expected = Math.max(0, Math.round(Number(minAmount || 0)));
            const paid = expected > 0 ? totalPaid >= expected : totalPaid > 0;
            return {
                paid,
                orderCode: cleanCode,
                paidAmount: totalPaid,
                expectedAmount: expected,
                transactionId: rows[0].id,
                verifiedAt: rows[0].created_at,
                reason: paid ? 'verified' : 'insufficient_amount',
            };
        },

        listReconciliation({ query = '', limit = 150 } = {}) {
            const receipts = selectAllReceiptsStmt.all(limit) || [];
            const payments = selectAllPaymentsStmt.all(limit) || [];

            const paymentMap = new Map();
            for (const p of payments) {
                let meta = {};
                try { meta = JSON.parse(p.data || '{}'); } catch {}
                const list = paymentMap.get(p.order_code) || [];
                list.push({
                    id: p.id,
                    amount: Number(p.amount || 0),
                    gateway: meta.gateway || '',
                    referenceCode: meta.referenceCode || '',
                    transactionDate: meta.transactionDate || p.created_at,
                    content: meta.content || '',
                    createdAt: p.created_at,
                });
                paymentMap.set(p.order_code, list);
            }

            const seenCodes = new Set();
            const items = [];

            for (const r of receipts) {
                seenCodes.add(r.order_code);
                const txs = paymentMap.get(r.order_code) || [];
                const paidTotal = txs.reduce((s, t) => s + t.amount, 0);
                let keys = [];
                try { keys = JSON.parse(r.keys_json || '[]'); } catch {}
                items.push({
                    orderCode: r.order_code,
                    email: r.email,
                    customerName: r.customer_name || '',
                    planName: r.plan_name,
                    kind: r.kind,
                    amount: Number(r.amount || 0),
                    market: r.market,
                    gateway: r.gateway,
                    emailSent: Boolean(r.email_sent),
                    emailId: r.email_id || null,
                    keys,
                    sepayPaidAmount: paidTotal,
                    reconciled: r.gateway !== 'SePay VietQR' || paidTotal >= Number(r.amount || 0),
                    sepayReference: txs[0]?.referenceCode || txs[0]?.id || '',
                    createdAt: r.created_at,
                });
            }

            for (const [code, txs] of paymentMap.entries()) {
                if (seenCodes.has(code)) continue;
                const paidTotal = txs.reduce((s, t) => s + t.amount, 0);
                items.push({
                    orderCode: code,
                    email: '',
                    customerName: txs[0]?.content || '',
                    planName: code.startsWith('SC2') ? 'Desktop SC2' : 'Cloud Plan',
                    kind: code.startsWith('SC2') ? 'desktop' : 'cloud',
                    amount: paidTotal,
                    market: 'vn',
                    gateway: 'SePay VietQR',
                    emailSent: false,
                    emailId: null,
                    keys: [],
                    sepayPaidAmount: paidTotal,
                    reconciled: true,
                    sepayReference: txs[0]?.referenceCode || txs[0]?.id || '',
                    createdAt: txs[0]?.createdAt || '',
                });
            }

            items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            const q = String(query || '').trim().toLowerCase();
            const filtered = q
                ? items.filter((it) =>
                      [it.orderCode, it.email, it.customerName, it.planName, it.sepayReference, it.gateway]
                          .some((v) => String(v || '').toLowerCase().includes(q))
                  )
                : items;

            return { items: filtered };
        },
    };
}
