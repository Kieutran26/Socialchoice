function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatAmount(amount, market, gateway) {
    const num = Number(amount || 0);
    if (market === 'intl' || market === 'whop' || gateway === 'whop') {
        return `$${num}`;
    }
    return `${Math.round(num).toLocaleString('vi-VN')}₫`;
}

function buildKeysBlock(keys, isEn) {
    if (!Array.isArray(keys) || keys.length === 0) return '';
    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;background:#18181b;border-radius:10px;border:1px solid #27272a;">
        <tr>
          <td style="padding:16px 18px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;margin-bottom:8px;">
              ${isEn ? 'SC2 Desktop License Keys' : 'Mã Bản Quyền Desktop (SC2)'}
            </div>
            ${keys
                .map(
                    (k) =>
                        `<div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:14px;font-weight:700;color:#facc15;padding:7px 12px;background:#09090b;border-radius:8px;margin-top:6px;letter-spacing:0.04em;">${escapeHtml(k)}</div>`
                )
                .join('')}
          </td>
        </tr>
      </table>
    `;
}

export async function sendActivationReceiptEmail(order, env = {}) {
    const apiKey = String(env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
        return { sent: false, configured: false, reason: 'missing_resend_api_key' };
    }

    const to = String(order?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return { sent: false, configured: true, reason: 'invalid_email' };
    }

    const from = String(env.RESEND_FROM_EMAIL || 'SocialChoice <noreply@socialchoice.site>').trim();
    const rawGateway = String(order?.gateway || order?.provider || '').trim().toLowerCase();
    const isWhop = order?.market === 'whop' || rawGateway === 'whop';
    const isUsd = isWhop || order?.market === 'intl' || String(order?.currency || '').toUpperCase() === 'USD';
    const isEn = order?.lang === 'en' || isUsd;
    const isDesktop = order?.kind === 'desktop';
    const orderCode = escapeHtml(order?.orderCode || '');
    const planName = escapeHtml(order?.planName || 'SocialChoice');
    const customerName = escapeHtml(order?.customerName || to.split('@')[0]);
    const amountText = escapeHtml(formatAmount(order?.amount, order?.market, rawGateway));
    const gatewayLabel = isWhop
        ? 'Whop Marketplace (USD)'
        : isUsd
          ? 'Polar.sh Global (USD)'
          : 'SePay VietQR (VNĐ)';
    const issuedDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
    const keys = Array.isArray(order?.keys) ? order.keys : [];
    const keysHtml = isDesktop ? buildKeysBlock(keys, isEn) : '';

    const subject = isEn
        ? `[SocialChoice] Receipt & Activation — ${order?.planName || 'Plan'} (#${order?.orderCode || ''})`
        : `[SocialChoice] Biên lai & Kích hoạt ${order?.planName || 'Gói dịch vụ'} (#${order?.orderCode || ''})`;

    /* Option 1 (Ledger Statement) — SocialChoice Brand Yellow (#facc15) + Official Logo */
    const html = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'vi'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 14px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <!-- Top Brand Yellow Accent Bar -->
          <tr>
            <td style="height:4px;background-color:#facc15;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header with Official SocialChoice Logo & Status Badge -->
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #e4e4e7;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://socialchoice.site/socialchoice-logo.png" alt="SocialChoice" height="28" style="display:block;height:28px;width:auto;border:0;" />
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:4px 11px;border:1px solid #fde047;border-radius:999px;font-size:11px;font-weight:700;color:#713f12;background:#fef9c3;">
                      &#10003; ${isEn ? 'PAID' : 'ĐÃ THANH TOÁN'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Amount & Activation Summary -->
          <tr>
            <td style="padding:26px 28px 18px;">
              <div style="font-size:12px;color:#71717a;font-weight:600;letter-spacing:0.02em;">
                ${isEn ? 'Receipt' : 'Biên lai'} #${orderCode} &middot; ${escapeHtml(issuedDate)}
              </div>
              <div style="margin-top:6px;font-size:34px;font-weight:800;letter-spacing:-0.03em;color:#18181b;font-variant-numeric:tabular-nums;font-family:'SFMono-Regular',Consolas,monospace;">
                ${amountText}
              </div>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#52525b;">
                ${isDesktop
                    ? (isEn
                        ? `Hi ${customerName}, your <strong style="color:#18181b;">${planName}</strong> license is ready for <strong style="color:#18181b;">${escapeHtml(to)}</strong>.`
                        : `Xin chào ${customerName}, bản quyền <strong style="color:#18181b;">${planName}</strong> đã được cấp cho <strong style="color:#18181b;">${escapeHtml(to)}</strong>.`)
                    : (isEn
                        ? `Hi ${customerName}, <strong style="color:#18181b;">${planName}</strong> is now active for <strong style="color:#18181b;">${escapeHtml(to)}</strong>.`
                        : `Xin chào ${customerName}, gói <strong style="color:#18181b;">${planName}</strong> đã được kích hoạt tự động cho <strong style="color:#18181b;">${escapeHtml(to)}</strong>.`)}
              </p>
            </td>
          </tr>

          <!-- Ledger Details Table & Brand Yellow CTA -->
          <tr>
            <td style="padding:0 28px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;">
                <tr>
                  <td style="padding:11px 0;font-size:13px;color:#71717a;border-bottom:1px solid #f4f4f5;">${isEn ? 'Plan' : 'Gói dịch vụ'}</td>
                  <td align="right" style="padding:11px 0;font-size:13px;font-weight:700;color:#18181b;border-bottom:1px solid #f4f4f5;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:11px 0;font-size:13px;color:#71717a;border-bottom:1px solid #f4f4f5;">${isEn ? 'Account Email' : 'Email tài khoản'}</td>
                  <td align="right" style="padding:11px 0;font-size:13px;font-weight:600;color:#18181b;border-bottom:1px solid #f4f4f5;">${escapeHtml(to)}</td>
                </tr>
                <tr>
                  <td style="padding:11px 0;font-size:13px;color:#71717a;">${isEn ? 'Payment Method' : 'Cổng thanh toán'}</td>
                  <td align="right" style="padding:11px 0;font-size:13px;color:#18181b;">${escapeHtml(gatewayLabel)}</td>
                </tr>
              </table>

              ${keysHtml}

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr>
                  <td>
                    <a href="https://socialchoice.site/overview" style="display:block;text-align:center;padding:13px 20px;background-color:#facc15;color:#09090b;text-decoration:none;font-size:14px;font-weight:800;border-radius:8px;letter-spacing:-0.01em;">
                      ${isEn ? 'Open Workspace →' : 'Mở Workspace ngay →'}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;text-align:center;">
              SocialChoice &middot; <a href="https://socialchoice.site" style="color:#18181b;font-weight:600;text-decoration:none;">socialchoice.site</a> &middot; ${isEn ? 'Reply to this email for support' : 'Phản hồi trực tiếp email này nếu cần hỗ trợ'}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from, to: [to], subject, html }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { sent: false, configured: true, reason: data?.message || `http_${res.status}` };
        }
        return { sent: true, configured: true, template: 'option1-yellow', id: data?.id || null };
    } catch {
        return { sent: false, configured: true, reason: 'network_error' };
    }
}
