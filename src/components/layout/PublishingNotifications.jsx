import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { Bell, X } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';

export default function PublishingNotifications() {
    const root = useRef(null);
    const bell = useRef(null);
    const version = useRef(0);
    const lastUnreadRef = useRef(0);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [data, setData] = useState({ items: [], unread: 0 });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let active = true;
        async function refresh() {
            if (document.hidden) return;
            const generation = version.current;
            try {
                const result = await appClient.notifications.list();
                if (active && generation === version.current) {
                    // Only re-enable badge if new unread notification count increased and > 0
                    if (result.unread > lastUnreadRef.current && result.unread > 0) {
                        setDismissed(false);
                    }
                    lastUnreadRef.current = result.unread || 0;
                    setData(result);
                    setError('');
                    setLoading(false);
                }
            } catch (e) {
                if (active && generation === version.current) {
                    setError(e.message);
                    setLoading(false);
                }
            }
        }
        refresh();
        const timer = setInterval(refresh, 30000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            active = false;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        const escape = (e) => {
            if (e.key === 'Escape') {
                setOpen(false);
                bell.current?.focus();
            }
        };
        const outside = (e) => {
            if (!root.current?.contains(e.target)) setOpen(false);
        };
        window.addEventListener('keydown', escape);
        document.addEventListener('pointerdown', outside);
        return () => {
            window.removeEventListener('keydown', escape);
            document.removeEventListener('pointerdown', outside);
        };
    }, [open]);

    async function mark(ids) {
        const generation = ++version.current;
        setBusy(true);
        setError('');
        try {
            const result = ids
                ? await appClient.notifications.read(ids)
                : await appClient.notifications.readAll();
            if (generation === version.current) {
                lastUnreadRef.current = result.unread || 0;
                setData(result);
            }
        } catch (e) {
            if (generation === version.current) setError(e.message);
        } finally {
            if (generation === version.current) setBusy(false);
        }
    }

    // Only show yellow dot badge when there is actually unread notification and not dismissed
    const hasNewNotification = (data.unread || 0) > 0 && !dismissed;

    return (
        <div ref={root} className="relative">
            <Button
                variant="ghost"
                ref={bell}
                type="button"
                aria-label={t('Publishing notifications: {count} unread', { count: data.unread })}
                aria-expanded={open}
                aria-controls="publishing-notifications"
                onClick={() => {
                    const nextOpen = !open;
                    setOpen(nextOpen);
                    if (nextOpen && data.unread > 0) {
                        setDismissed(true);
                    }
                }}
                className="relative flex h-11 w-11 sm:h-9 sm:w-9 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl p-0 text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
                <Bell size={18} weight="regular" />
                {hasNewNotification && (
                    <span className="absolute top-2 right-2 sm:top-1.5 sm:right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive ring-2 ring-card"></span>
                    </span>
                )}
            </Button>
            {open && (
                <>
                    {/* Backdrop for mobile drawer dismissal */}
                    <div
                        className="fixed inset-0 z-40 bg-black/20 sm:hidden"
                        onClick={() => {
                            setOpen(false);
                            bell.current?.focus();
                        }}
                        aria-hidden="true"
                    />
                    <section
                        id="publishing-notifications"
                        role="region"
                        aria-label={t('Publishing notifications')}
                        className="fixed inset-x-3 top-16 z-50 sm:absolute sm:inset-x-auto sm:left-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl p-4 max-h-[75vh] sm:max-h-[32rem] overflow-y-auto overscroll-contain animate-in fade-in-0 zoom-in-95 duration-100"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-medium">{t('Publishing notifications')}</h2>
                            <Button
                                size="icon"
                                variant="ghost"
                                type="button"
                                className="h-auto min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
                                aria-label={t('Close')}
                                onClick={() => {
                                    setOpen(false);
                                    bell.current?.focus();
                                }}
                            >
                                <X size={18} />
                            </Button>
                        </div>
                        <p className="label-xs mb-3">
                            {t('Real publishing failures and unconfirmed deliveries. No automatic resend.')}
                        </p>
                        {!!data.unread && (
                            <Button
                                variant="ghost"
                                type="button"
                                disabled={busy}
                                className="h-auto p-1.5 -ml-1.5 min-h-[32px] text-xs underline mb-3 text-foreground/80 hover:text-foreground cursor-pointer"
                                onClick={() => mark(null)}
                            >
                                {t('Mark all as read')}
                            </Button>
                        )}
                        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
                        {loading && <p role="status" className="label-xs">{t('Loading…')}</p>}
                        {!loading && !data.items.length && !error && (
                            <p className="label-xs py-3">{t('No publishing problems recorded.')}</p>
                        )}
                        {data.items.map((item) => (
                            <article
                                key={item.id}
                                className={'border-t border-border/70 py-3 ' + (!item.read ? 'bg-warnBg/50 -mx-3 px-3 rounded-xl' : '')}
                            >
                                <p className="text-xs font-medium">
                                    {t(item.status === 'unknown' ? 'Delivery unconfirmed' : 'Publishing failed')} · {item.pageName}
                                </p>
                                <Link
                                    to={'/posts?post=' + item.postId}
                                    className="text-sm underline break-words"
                                    onClick={() => {
                                        setOpen(false);
                                        void mark([item.id]);
                                    }}
                                >
                                    {item.title}
                                </Link>
                                <p className="text-xs my-2">{t(item.message)}</p>
                                <p className="label-xs">{formatDateTime(item.occurredAt)}</p>
                                {!item.read && (
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        disabled={busy}
                                        onClick={() => mark([item.id])}
                                        className="h-auto p-1.5 -ml-1.5 min-h-[32px] text-xs underline mt-2 text-foreground/80 hover:text-foreground cursor-pointer"
                                    >
                                        {t('Mark as read')}
                                    </Button>
                                )}
                            </article>
                        ))}
                    </section>
                </>
            )}
        </div>
    );
}
