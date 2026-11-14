import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import {
    ShieldCheck,
    SpinnerGap,
    CheckCircle,
    WarningCircle,
    Eye,
    CalendarPlus,
    Lightning,
} from '@phosphor-icons/react';

function ConsentShell({ title, subtitle, children }) {
    return (
        <main className="min-h-screen bg-surface flex flex-col items-center justify-center p-5">
            <div className="w-full max-w-lg space-y-5">
                <div className="flex items-center justify-between px-1">
                    <Link to="/" className="inline-flex items-center">
                        <img
                            src="/socialchoice-logo.png"
                            alt="SocialChoice"
                            className="h-7 w-auto object-contain"
                        />
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <ShieldCheck size={14} weight="duotone" className="text-foreground" />
                        <span>MCP OAuth 2.1</span>
                    </span>
                </div>

                <section className="panel p-6 bg-card border border-border rounded-2xl space-y-5">
                    <div className="flex items-start gap-3.5 border-b border-border pb-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/30">
                            <ShieldCheck size={20} weight="duotone" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-medium text-foreground">{title}</h1>
                            {subtitle && (
                                <p className="label-xs text-muted-foreground mt-1 break-words">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    {children}
                </section>
            </div>
        </main>
    );
}

export default function OAuthConsent() {
    const { t } = useTranslation();
    const ctx = new URLSearchParams(window.location.search).get('ctx');
    const [info, setInfo] = useState(null);
    const [checking, setChecking] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [decided, setDecided] = useState('');
    const [error, setError] = useState('');
    const [reconnect, setReconnect] = useState('');
    const [selectedScopes, setSelectedScopes] = useState(['posts:read', 'posts:write']);

    useEffect(() => {
        (async () => {
            let redirecting = false;
            try {
                if (!ctx) {
                    setError(t('Liên kết ủy quyền không hợp lệ hoặc đã hết hạn.'));
                    return;
                }
                const res = await fetch(
                    `/api/mcp/consent-info?handle=${encodeURIComponent(ctx)}`,
                    { credentials: 'include' }
                );
                if (!res.ok) {
                    setError(t('Liên kết ủy quyền không hợp lệ hoặc đã hết hạn.'));
                    return;
                }
                const data = await res.json();
                if (!data.authenticated) {
                    const returnTo =
                        window.location.pathname + '?ctx=' + encodeURIComponent(ctx);
                    const encoded = encodeURIComponent(returnTo);
                    redirecting = true;
                    window.location.href =
                        (data.login_path || '/login') +
                        '?returnTo=' +
                        encoded +
                        '&from_url=' +
                        encoded;
                    return;
                }
                setInfo(data);
                if (Array.isArray(data.requested_scopes) && data.requested_scopes.length) {
                    setSelectedScopes(
                        data.requested_scopes.includes('posts:read')
                            ? data.requested_scopes
                            : ['posts:read', ...data.requested_scopes]
                    );
                }
            } catch {
                setError(t('Không thể tải yêu cầu ủy quyền. Vui lòng thử lại.'));
            } finally {
                if (!redirecting) setChecking(false);
            }
        })();
    }, [ctx, t]);

    const toggleScope = (scope) => {
        if (scope === 'posts:read') return;
        setSelectedScopes((prev) =>
            prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
        );
    };

    const respond = async (action) => {
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/mcp/authorize-grant', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-socialchoice-client': 'local-ui',
                },
                body: JSON.stringify({
                    ctx,
                    action,
                    scopes: selectedScopes,
                }),
            });
            if (!res.ok) {
                if (res.status === 401) {
                    const returnTo =
                        window.location.pathname + '?ctx=' + encodeURIComponent(ctx);
                    const encoded = encodeURIComponent(returnTo);
                    window.location.href =
                        ((info && info.login_path) || '/login') +
                        '?returnTo=' +
                        encoded +
                        '&from_url=' +
                        encoded;
                    return;
                }
                if ([400, 403, 404, 409].includes(res.status)) {
                    let detail = '';
                    try {
                        const errJson = await res.json();
                        detail = errJson.detail || errJson.message || errJson.error || '';
                    } catch {
                        // ignore
                    }
                    setReconnect(
                        detail ||
                            t(
                                'Yêu cầu ủy quyền này không còn hiệu lực. Vui lòng kết nối lại từ ứng dụng AI của bạn.'
                            )
                    );
                    setSubmitting(false);
                    return;
                }
                throw new Error(t('Không thể hoàn tất ủy quyền. Vui lòng thử lại.'));
            }
            const data = await res.json();
            window.location.href = data.redirect_url;
            if (!/^https?:/i.test(data.redirect_url)) {
                setDecided(action);
                setSubmitting(false);
            }
        } catch (e) {
            setError(e.message);
            setSubmitting(false);
        }
    };

    if (checking) {
        return (
            <ConsentShell title={t('Ủy quyền truy cập AI')}>
                <div
                    role="status"
                    className="flex items-center justify-center py-6 text-sm text-muted-foreground"
                >
                    <SpinnerGap size={18} className="mr-2 animate-spin" aria-hidden="true" />
                    <span>{t('Đang kiểm tra yêu cầu kết nối…')}</span>
                </div>
            </ConsentShell>
        );
    }

    const client = (info && info.client_name) || 'AI Assistant';
    const appName = (info && info.app_name) || 'SocialChoice';

    if (decided) {
        return (
            <ConsentShell
                title={decided === 'approve' ? t('Đã cấp quyền truy cập') : t('Đã từ chối truy cập')}
                subtitle={t('Bạn có thể quay lại ứng dụng AI và đóng cửa sổ này.')}
            >
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-successBg text-successFg text-xs font-medium">
                    <CheckCircle size={16} weight="duotone" />
                    <span>
                        {decided === 'approve'
                            ? `${client} đã được kết nối với ${appName}.`
                            : `Đã hủy kết nối với ${client}.`}
                    </span>
                </div>
            </ConsentShell>
        );
    }

    if (reconnect) {
        return (
            <ConsentShell title={t('Cần kết nối lại')}>
                <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-dangerBg text-dangerFg text-xs flex items-start gap-2"
                >
                    <WarningCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{reconnect}</span>
                </div>
            </ConsentShell>
        );
    }

    if (error && !info) {
        return (
            <ConsentShell title={t('Ủy quyền truy cập AI')}>
                <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-dangerBg text-dangerFg text-xs flex items-start gap-2"
                >
                    <WarningCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            </ConsentShell>
        );
    }

    const scopeOptions = [
        {
            scope: 'posts:read',
            icon: Eye,
            title: t('Xem thương hiệu, kênh và lịch bài viết'),
            description: t(
                'Cho phép đọc danh sách thương hiệu, tài khoản mạng xã hội, trụ cột nội dung và lịch đăng bài.'
            ),
            required: true,
        },
        {
            scope: 'posts:write',
            icon: CalendarPlus,
            title: t('Tạo bản nháp và lên lịch đăng bài'),
            description: t(
                'Cho phép tạo bài nháp mới, đặt lịch đăng bài tự động trên lịch SocialChoice, chỉnh sửa hoặc hủy lịch.'
            ),
            required: false,
        },
        {
            scope: 'posts:publish',
            icon: Lightning,
            title: t('Đăng bài trực tiếp ngay lập tức (có bước xác nhận)'),
            description: t(
                'Cho phép xuất bản bài đăng ngay lập tức lên các kênh đã kết nối sau khi hiển thị bản xem trước và được bạn xác nhận.'
            ),
            required: false,
        },
    ];

    return (
        <ConsentShell
            title={t('Kết nối trợ lý AI với SocialChoice')}
            subtitle={`${client} muốn truy cập không gian làm việc ${appName} của bạn.`}
        >
            {error && (
                <div
                    role="alert"
                    className="p-3 rounded-xl bg-dangerBg text-dangerFg text-xs flex items-start gap-2"
                >
                    <WarningCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('Chọn quyền cấp cho')} {client}:
                </p>
                <div className="space-y-2">
                    {scopeOptions.map((item) => {
                        const Icon = item.icon;
                        const checked = selectedScopes.includes(item.scope);
                        return (
                            <label
                                key={item.scope}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                                    checked
                                        ? 'border-foreground/30 bg-surface'
                                        : 'border-border bg-card hover:bg-surface/60'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={item.required || submitting}
                                    onChange={() => toggleScope(item.scope)}
                                    className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Icon size={15} weight="duotone" className="text-foreground shrink-0" />
                                        <span className="text-sm font-medium text-foreground">
                                            {item.title}
                                        </span>
                                        {item.required && (
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                                {t('Bắt buộc')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="label-xs text-muted-foreground mt-1">
                                        {item.description}
                                    </p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl bg-surface border border-border p-3 text-xs text-muted-foreground">
                {t(
                    'Bạn có thể thu hồi quyền truy cập của trợ lý AI bất cứ lúc nào trong phần Cài đặt → AI & Trợ lý.'
                )}
            </div>

            <div className="flex gap-3 pt-1">
                <Button
                    variant="outline"
                    className="flex-1 h-10 text-xs font-medium rounded-xl"
                    disabled={submitting}
                    onClick={() => respond('deny')}
                >
                    {t('Từ chối')}
                </Button>
                <button
                    type="button"
                    className="btn-skew flex-1 justify-center"
                    disabled={submitting}
                    onClick={() => respond('approve')}
                >
                    {submitting ? (
                        <SpinnerGap size={16} weight="duotone" className="animate-spin" />
                    ) : (
                        <ShieldCheck size={16} weight="duotone" />
                    )}
                    <span>{t('Cho phép kết nối')}</span>
                </button>
            </div>
        </ConsentShell>
    );
}
