import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import {
    ArrowLeft, ArrowRight, FacebookLogo, InstagramLogo, LinkedinLogo, RedditLogo,
    ThreadsLogo, TiktokLogo, XLogo, YoutubeLogo, Buildings, PinterestLogo,
    DiscordLogo, SlackLogo, Butterfly, TelegramLogo, Storefront,
    CheckCircle
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MetaConnectionCard from './MetaConnectionCard';
import LinkedinConnectionCard from './LinkedinConnectionCard';
import TiktokConnectionCard from './TiktokConnectionCard';
import XConnectionCard from './XConnectionCard';
import DesktopConnectionCard from './desktop-connection-card';
import { isDesktop } from '@/api/desktop/runtime';

const channels = [
    // Primary active services
    { id: 'facebook', label: 'Facebook Page', icon: FacebookLogo, color: '#1877f2', service: 'meta', formats: ['Text', 'Photos', 'Video'], primary: true },
    { id: 'instagram', label: 'Instagram Business', icon: InstagramLogo, color: '#d62976', service: 'meta', formats: ['Photo', 'Reels'], primary: true },
    { id: 'threads', label: 'Threads', icon: ThreadsLogo, color: '#000000', service: 'threads', formats: ['Text', 'Photo', 'Video'], primary: true },
    { id: 'tiktok', label: 'TikTok', icon: TiktokLogo, color: '#000000', service: 'tiktok', formats: ['Private video'], primary: true },
    { id: 'linkedin', label: 'LinkedIn Profile', icon: LinkedinLogo, color: '#0a66c2', service: 'linkedin', formats: ['Text', 'Photos', 'Video'], primary: true },
    { id: 'linkedin-page', label: 'LinkedIn Page', icon: Buildings, color: '#0a66c2', service: 'linkedin', formats: ['Text', 'Photos', 'Video'], primary: true },
    { id: 'x', label: 'X (Twitter)', icon: XLogo, color: '#000000', service: 'x', formats: ['Text', 'Photos', 'Video'], primary: true },

    // Secondary / Coming soon
    { id: 'reddit', label: 'Reddit', icon: RedditLogo, color: '#ff4500', formats: ['Text', 'Link'] },
    { id: 'youtube', label: 'YouTube', icon: YoutubeLogo, color: '#ff0033', formats: ['Video'] },
    { id: 'google-business', label: 'Google My Business', icon: Storefront, color: '#4285f4', formats: ['Updates', 'Photos'] },
    { id: 'pinterest', label: 'Pinterest', icon: PinterestLogo, color: '#e60023', formats: ['Pins', 'Photos'] },
    { id: 'discord', label: 'Discord', icon: DiscordLogo, color: '#5865f2', formats: ['Messages'] },
    { id: 'slack', label: 'Slack', icon: SlackLogo, color: '#4a154b', formats: ['Messages'] },
    { id: 'bluesky', label: 'Bluesky', icon: Butterfly, color: '#0285ff', formats: ['Posts', 'Photos'] },
    { id: 'telegram', label: 'Telegram', icon: TelegramLogo, color: '#229ed9', formats: ['Channel'] },
];

export function connectionReturnPlatform() {
    const query = new URLSearchParams(window.location.search);
    return ['linkedin', 'tiktok', 'threads', 'x'].find(key => query.has(key)) || (query.get('meta') === 'select' ? 'facebook' : '');
}

export function hasConnectionReturn() {
    return ['meta', 'threads', 'linkedin', 'tiktok', 'x'].some(key => new URLSearchParams(window.location.search).has(key));
}

export default function AddChannelDialog({ open, onOpenChange, brands = [], defaultBrandId, demoMode, onChanged, onAddManually, initialPlatform = '' }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(connectionReturnPlatform);
    const [chosenPlatform, setChosenPlatform] = useState('facebook');
    const [targetBrandId, setTargetBrandId] = useState(defaultBrandId || brands[0]?.id || '');
    const [_health, setHealth] = useState(null);
    const [busy, setBusy] = useState(false);
    const [reload, _setReload] = useState(0);

    useEffect(() => {
        if (defaultBrandId) setTargetBrandId(defaultBrandId);
        else if (brands.length > 0 && !targetBrandId) setTargetBrandId(brands[0].id);
    }, [defaultBrandId, brands, targetBrandId]);

    useEffect(() => {
        if (open && initialPlatform) {
            setSelected(initialPlatform);
            setChosenPlatform(initialPlatform);
        }
    }, [open, initialPlatform]);

    useEffect(() => {
        if (!open) return;
        let active = true;
        const services = ['meta', 'threads', 'linkedin', 'tiktok', 'x'];
        setHealth(Object.fromEntries(services.map(key => [key, { loading: true }])));
        services.forEach(key => {
            if (appClient[key]) {
                appClient[key].status()
                    .then(value => { if (active) setHealth(current => ({ ...current, [key]: value })); })
                    .catch(() => { if (active) setHealth(current => ({ ...current, [key]: { error: true } })); });
            }
        });
        return () => { active = false; };
    }, [open, reload]);

    function clearReturn() {
        const url = new URL(window.location.href);
        ['meta', 'threads', 'linkedin', 'tiktok', 'x'].forEach(key => url.searchParams.delete(key));
        window.history.replaceState(window.history.state, '', url);
    }

    function changeOpen(value) {
        if (busy) return;
        if (!value) { setSelected(''); clearReturn(); }
        onOpenChange(value);
    }

    const metaOutcome = new URLSearchParams(window.location.search).get('meta');
    const xOutcome = new URLSearchParams(window.location.search).get('x');
    const currentChannel = channels.find(item => item.id === (selected || chosenPlatform));
    const props = {
        brands,
        defaultBrandId: targetBrandId || defaultBrandId,
        demoMode,
        embedded: true,
        onBusyChange: setBusy,
        onChanged: () => {
            onChanged();
            clearReturn();
            setBusy(false);
            setSelected('');
            onOpenChange(false);
        }
    };

    const handleContinueToOAuth = () => {
        if (!chosenPlatform) return;
        setSelected(chosenPlatform);
    };

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent className="!w-[calc(100vw_-_2rem)] !max-w-[840px] p-0 overflow-hidden rounded-2xl border border-border shadow-xl bg-card" aria-describedby="add-channel-description">
                
                {/* Stepper Header (Modal 3 style) */}
                <div className="px-6 py-5 border-b border-border bg-muted/30">
                    <DialogHeader>
                        {selected ? (
                            <Button
                                variant="ghost"
                                type="button"
                                disabled={busy}
                                onClick={() => { setSelected(''); clearReturn(); }}
                                className="h-auto p-0 mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start"
                            >
                                <ArrowLeft size={13} /> {t('Back to platform selection')}
                            </Button>
                        ) : null}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <DialogTitle className="text-lg sm:text-xl font-heading font-semibold text-foreground">
                                {selected ? t('Connect {platform}', { platform: currentChannel?.label }) : t('Add social channel')}
                            </DialogTitle>

                            {/* Stepper indicator pills */}
                            {!selected && (
                                <div className="flex items-center gap-2 text-[11.5px] font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1 text-foreground font-semibold">
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">1</span>
                                        {t('Platform')}
                                    </span>
                                    <span className="text-muted-foreground/40">→</span>
                                    <span className="flex items-center gap-1 text-foreground font-semibold">
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">2</span>
                                        {t('Brand')}
                                    </span>
                                    <span className="text-muted-foreground/40">→</span>
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-border text-[10px]">3</span>
                                        {t('OAuth')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <DialogDescription id="add-channel-description" className="text-xs text-muted-foreground mt-1">
                            {selected
                                ? t('Sign in on the official platform and confirm access permissions. Socialchoice never stores your passwords.')
                                : t('Select a social platform and pre-assign it to a brand before authorizing OAuth 2.0.')
                            }
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Content Area */}
                {!selected ? (
                    <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                        {['failed', 'cancelled'].includes(metaOutcome) && (
                            <p role="status" className="rounded-xl bg-warnBg p-3 text-xs text-warnFg border border-warnFg/20">
                                {t(metaOutcome === 'cancelled' ? 'Connection cancelled. Choose a platform to try again.' : 'Connection failed. Choose the platform you want to reconnect.')}
                            </p>
                        )}
                        {['failed', 'cancelled'].includes(xOutcome) && (
                            <p role="status" className="rounded-xl bg-warnBg p-3 text-xs text-warnFg border border-warnFg/20">
                                {t(xOutcome === 'cancelled' ? 'Kết nối X đã bị hủy. Hãy thử lại.' : 'Kết nối X thất bại. Vui lòng kiểm tra quyền hạn và thử lại.')}
                            </p>
                        )}
                        {demoMode && (
                            <p className="rounded-xl bg-warnBg p-3 text-xs text-warnFg border border-warnFg/20">
                                {t('Switch to your real workspace to connect a channel.')}
                            </p>
                        )}

                        {/* STEP 1: CHỌN NỀN TẢNG (PLATFORM SELECTION) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground font-heading">
                                    {t('Step 1: Choose social platform')}
                                </label>
                                <span className="text-[11px] text-muted-foreground">
                                    {t('Official OAuth 2.0')}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {channels.filter(c => c.primary).map(({ id, label, icon: Icon, color, formats }) => {
                                    const isChosen = chosenPlatform === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setChosenPlatform(id)}
                                            className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                isChosen
                                                    ? 'border-foreground bg-muted/30 shadow-xs ring-1 ring-foreground'
                                                    : 'border-border/80 bg-card hover:border-foreground/30 hover:bg-muted/15'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-2">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-card shadow-2xs">
                                                    <Icon size={20} weight={['instagram', 'threads', 'x'].includes(id) ? 'regular' : 'fill'} style={{ color }} />
                                                </div>
                                                {isChosen && (
                                                    <CheckCircle size={16} weight="fill" className="text-foreground shrink-0" />
                                                )}
                                            </div>

                                            <span className="text-[13px] font-medium text-foreground truncate w-full">
                                                {label}
                                            </span>

                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {formats.slice(0, 2).map(fmt => (
                                                    <span key={fmt} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                                                        {t(fmt)}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* STEP 2: GÁN THƯƠNG HIỆU (ASSIGN BRAND) */}
                        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-foreground font-heading">
                                    {t('Step 2: Assign destination to Brand')}
                                </label>
                                <span className="text-[11px] text-muted-foreground">
                                    {t('Can be modified anytime')}
                                </span>
                            </div>

                            <Select
                                value={targetBrandId}
                                onValueChange={setTargetBrandId}
                            >
                                <SelectTrigger className="h-9 w-full rounded-lg bg-card border-border text-xs font-medium">
                                    <SelectValue placeholder={t("Select a brand")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.map((brand) => (
                                        <SelectItem key={brand.id} value={brand.id}>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: brand.color || '#18181b' }}
                                                />
                                                <span className="font-medium">{brand.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {t('Once authenticated, this channel will automatically belong to the selected brand, ready for immediate scheduling.')}
                            </p>
                        </div>

                        {/* Secondary channels roadmap */}
                        <div className="pt-2 border-t border-border/60">
                            <span className="text-[11px] font-medium text-muted-foreground block mb-2">
                                {t('Coming soon on roadmap:')}
                            </span>
                            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                {channels.filter(c => !c.primary).map(c => {
                                    const Icon = c.icon;
                                    return (
                                        <span
                                            key={c.id}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-2xs hover:text-foreground hover:border-foreground/30 transition-colors"
                                        >
                                            {Icon && (
                                                <Icon
                                                    size={14}
                                                    weight={['reddit', 'youtube', 'pinterest', 'discord'].includes(c.id) ? 'fill' : 'regular'}
                                                    style={{ color: c.color }}
                                                    className="shrink-0"
                                                />
                                            )}
                                            <span>{c.label}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => { clearReturn(); onAddManually(); }}
                                className="h-auto p-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                            >
                                {t('Add a planning reference instead')}
                            </Button>

                            <Button
                                type="button"
                                onClick={handleContinueToOAuth}
                                disabled={!chosenPlatform}
                                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors shadow-xs"
                            >
                                <span>{t('Continue to {platform} to authorize', { platform: currentChannel?.label || '' })}</span>
                                <ArrowRight size={14} weight="bold" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Step 3: Embed OAuth Connect Card */
                    <div className="p-6">
                        {isDesktop() ? (
                            <DesktopConnectionCard {...props} platform={selected} />
                        ) : selected === 'linkedin' ? (
                            <LinkedinConnectionCard {...props} mode="profile" />
                        ) : selected === 'linkedin-page' ? (
                            <LinkedinConnectionCard {...props} mode="page" />
                        ) : selected === 'tiktok' ? (
                            <TiktokConnectionCard {...props} />
                        ) : selected === 'x' ? (
                            <XConnectionCard {...props} />
                        ) : (
                            <MetaConnectionCard {...props} initialPlatform={selected} onPlatformResolved={setSelected} lockPlatform />
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
