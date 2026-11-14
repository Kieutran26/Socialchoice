import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import {
    Copy,
    Check,
    Plus,
    Trash,
    ShieldCheck,
    ArrowsClockwise,
    Lightning,
    Info,
} from '@phosphor-icons/react';

export default function McpConnectorsSettingsCard() {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [copiedKey, setCopiedKey] = useState('');
    const [tokenName, setTokenName] = useState('ChatGPT & Claude');
    const [allowWrite, setAllowWrite] = useState(true);
    const [allowPublish, setAllowPublish] = useState(false);
    const [newlyIssued, setNewlyIssued] = useState(null);

    const loadConnections = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/mcp/connections', {
                credentials: 'include',
                headers: { 'x-socialchoice-client': 'local-ui' },
            });
            if (!res.ok) throw new Error('Không thể tải danh sách kết nối MCP.');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách kết nối MCP.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConnections();
    }, [loadConnections]);

    const copyText = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(''), 2000);
        } catch {
            // fallback
        }
    };

    const createConnectorToken = async () => {
        setBusy(true);
        setError('');
        try {
            const scopes = ['posts:read'];
            if (allowWrite) scopes.push('posts:write');
            if (allowPublish) scopes.push('posts:publish');
            const res = await fetch('/api/mcp/tokens', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-socialchoice-client': 'local-ui',
                },
                body: JSON.stringify({
                    name: tokenName.trim() || 'ChatGPT & Claude',
                    scopes,
                }),
            });
            if (!res.ok) throw new Error('Không thể tạo khóa kết nối MCP.');
            const created = await res.json();
            setNewlyIssued(created);
            await loadConnections();
        } catch (err) {
            setError(err.message || 'Không thể tạo khóa kết nối MCP.');
        } finally {
            setBusy(false);
        }
    };

    const revokeConnection = async (id) => {
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/mcp/revoke', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-socialchoice-client': 'local-ui',
                },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error('Không thể thu hồi kết nối.');
            if (newlyIssued?.grant?.id === id) setNewlyIssued(null);
            await loadConnections();
        } catch (err) {
            setError(err.message || 'Không thể thu hồi kết nối.');
        } finally {
            setBusy(false);
        }
    };

    const mcpUrl = data?.mcp_url || `${window.location.origin}/mcp`;
    const grants = data?.grants || [];

    return (
        <section className="panel p-5 bg-card border border-border/80 rounded-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/socialchoice-icon.png"
                        alt="SocialChoice MCP"
                        className="h-9 w-9 shrink-0 rounded-xl border border-brand-dark/30 object-cover"
                    />
                    <div>
                        <h2 className="text-[15px] font-semibold text-foreground">
                            {t('Kết nối ChatGPT & Claude (MCP Connector)')}
                        </h2>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t(
                                'Cho phép ChatGPT và Claude tự động tạo bản nháp, đặt lịch đăng bài và xuất bản bài viết trên SocialChoice khi bạn ra lệnh trong khung chat.'
                            )}
                        </p>
                    </div>
                </div>
                <StatusBadge tone="success">MCP OAuth 2.1</StatusBadge>
            </div>

            {error && (
                <div
                    role="alert"
                    className="p-3 rounded-xl bg-dangerBg text-dangerFg text-xs flex items-center gap-2"
                >
                    <Info size={15} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Step 1: Official MCP Endpoint URL */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold text-foreground">
                            {t('Địa chỉ máy chủ MCP (Dùng cho OAuth tự động trên Claude & ChatGPT)')}
                        </p>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t(
                                'Dán đường dẫn này vào phần Connectors của Claude hoặc ChatGPT. Hệ thống sẽ tự động mở màn hình cấp quyền đăng nhập SocialChoice.'
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <code className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-mono text-foreground select-all break-all">
                        {mcpUrl}
                    </code>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-3.5 rounded-xl text-xs font-medium gap-1.5 shrink-0"
                        onClick={() => copyText(mcpUrl, 'mcpUrl')}
                    >
                        {copiedKey === 'mcpUrl' ? (
                            <>
                                <Check size={14} weight="bold" className="text-successFg" />
                                <span>{t('Đã sao chép')}</span>
                            </>
                        ) : (
                            <>
                                <Copy size={14} />
                                <span>{t('Sao chép URL')}</span>
                            </>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                            1. {t('Cách kết nối trên Claude')}
                        </p>
                        <p className="label-xs text-muted-foreground">
                            {t(
                                'Vào Claude → Settings → Connectors → Add custom connector → Dán URL ở trên → Nhấn Connect và bấm Cho phép trên màn hình SocialChoice.'
                            )}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                            2. {t('Cách kết nối trên ChatGPT')}
                        </p>
                        <p className="label-xs text-muted-foreground">
                            {t(
                                'Vào ChatGPT → Settings → Connectors → Bật Developer Mode → Create connector → Dán URL ở trên → Chọn OAuth và xác nhận cấp quyền.'
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Step 2: Instant Personal Connector URL / Token Generator */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="text-xs font-semibold text-foreground">
                            {t('Tạo khóa kết nối nhanh (Dành cho Claude Desktop / Cursor / URL trực tiếp)')}
                        </h3>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t(
                                'Nếu ứng dụng AI của bạn không dùng cửa sổ đăng nhập OAuth, hãy tạo một đường dẫn MCP có sẵn khóa xác thực tại đây.'
                            )}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                        <Label
                            htmlFor="mcp-token-name"
                            className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                        >
                            {t('Tên kết nối')}
                        </Label>
                        <Input
                            id="mcp-token-name"
                            value={tokenName}
                            disabled={busy}
                            onChange={(e) => setTokenName(e.target.value)}
                            placeholder="VD: Claude của tôi, ChatGPT Assistant..."
                            className="h-9 text-xs rounded-xl"
                            maxLength={80}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pb-1">
                        <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allowWrite}
                                onChange={(e) => setAllowWrite(e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-foreground"
                            />
                            <span>{t('Cho phép đặt lịch & tạo nháp')}</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allowPublish}
                                onChange={(e) => setAllowPublish(e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-foreground"
                            />
                            <span className="inline-flex items-center gap-1">
                                <Lightning size={13} weight="duotone" />
                                {t('Cho phép đăng ngay (có xác nhận)')}
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        className="btn-skew inline-flex items-center gap-1.5 text-xs font-semibold"
                        disabled={busy}
                        onClick={createConnectorToken}
                    >
                        <Plus size={14} weight="bold" />
                        <span>{t('Tạo khóa kết nối MCP')}</span>
                    </button>
                </div>

                {newlyIssued && (
                    <div className="rounded-xl border border-brand-dark/40 bg-brand/10 p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            <ShieldCheck size={16} weight="duotone" />
                            <span>
                                {t(
                                    'Khóa kết nối mới đã được tạo! Hãy sao chép ngay vì khóa đầy đủ chỉ hiển thị một lần:'
                                )}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <p className="label-xs font-medium text-foreground">
                                {t('URL kết nối trực tiếp (dán thẳng vào MCP Server URL):')}
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-mono text-foreground break-all select-all">
                                    {newlyIssued.connector_url_with_token}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs rounded-lg gap-1 shrink-0"
                                    onClick={() =>
                                        copyText(newlyIssued.connector_url_with_token, 'newUrl')
                                    }
                                >
                                    {copiedKey === 'newUrl' ? <Check size={13} /> : <Copy size={13} />}
                                    <span>{copiedKey === 'newUrl' ? t('Đã chép') : t('Chép URL')}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="label-xs font-medium text-foreground">
                                {t('Hoặc dùng Bearer Token riêng:')}
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-mono text-foreground break-all select-all">
                                    {newlyIssued.access_token}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs rounded-lg gap-1 shrink-0"
                                    onClick={() => copyText(newlyIssued.access_token, 'newToken')}
                                >
                                    {copiedKey === 'newToken' ? (
                                        <Check size={13} />
                                    ) : (
                                        <Copy size={13} />
                                    )}
                                    <span>
                                        {copiedKey === 'newToken' ? t('Đã chép') : t('Chép Token')}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 3: Active Connections List */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('Các kết nối AI đang hoạt động')} ({grants.length})
                    </h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        disabled={loading || busy}
                        onClick={loadConnections}
                    >
                        <ArrowsClockwise size={13} className={loading ? 'animate-spin' : ''} />
                        <span>{t('Làm mới')}</span>
                    </Button>
                </div>

                {grants.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface p-4 text-center label-xs text-muted-foreground">
                        {t(
                            'Chưa có trợ lý AI nào được cấp quyền. Kết nối qua OAuth hoặc nhấn "Tạo khóa kết nối MCP" ở trên.'
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {grants.map((grant) => (
                            <div
                                key={grant.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">
                                            {grant.client_name}
                                        </span>
                                        <code className="rounded bg-card border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                            {grant.token_preview}
                                        </code>
                                        {(grant.scopes || []).map((scope) => (
                                            <StatusBadge
                                                key={scope}
                                                tone={
                                                    scope === 'posts:publish'
                                                        ? 'warn'
                                                        : scope === 'posts:write'
                                                        ? 'info'
                                                        : 'neutral'
                                                }
                                            >
                                                {scope}
                                            </StatusBadge>
                                        ))}
                                    </div>
                                    <p className="label-xs text-muted-foreground">
                                        {t('Tạo lúc')}: {formatDateTime(grant.created_at)}
                                        {grant.last_used_at
                                            ? ` · ${t('Hoạt động gần nhất')}: ${formatDateTime(grant.last_used_at)}`
                                            : ` · ${t('Chưa sử dụng')}`}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 rounded-lg text-xs text-dangerFg hover:text-dangerFg gap-1.5"
                                    disabled={busy}
                                    onClick={() => revokeConnection(grant.id)}
                                >
                                    <Trash size={13} />
                                    <span>{t('Thu hồi')}</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
