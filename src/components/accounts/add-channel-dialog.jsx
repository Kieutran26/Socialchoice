import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import {
    ArrowLeft, ArrowUpRight, FacebookLogo, InstagramLogo, LinkedinLogo, RedditLogo,
    ThreadsLogo, TiktokLogo, XLogo, YoutubeLogo, Buildings, PinterestLogo,
    DiscordLogo, SlackLogo, TwitchLogo, MastodonLogo, Butterfly, TelegramLogo,
    MediumLogo, TumblrLogo, Storefront, Globe, Code, Compass, EnvelopeSimple,
    BookOpen, ShoppingBag, GraduationCap, Users, Sparkle, Asterisk, Broadcast, DribbbleLogo
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MetaConnectionCard from './MetaConnectionCard';
import LinkedinConnectionCard from './LinkedinConnectionCard';
import TiktokConnectionCard from './TiktokConnectionCard';
import XConnectionCard from './XConnectionCard';
import DesktopConnectionCard from './desktop-connection-card';
import { isDesktop } from '@/api/desktop/runtime';

const channels = [
    // Row 1
    { id: 'x', label: 'X', icon: XLogo, color: '#000000', service: 'x', formats: ['Text', 'Photos', 'Video'] },
    { id: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, color: '#0a66c2', service: 'linkedin', formats: ['Text', 'Photos', 'Video'] },
    { id: 'linkedin-page', label: 'LinkedIn Page', icon: Buildings, color: '#0a66c2', service: 'linkedin', formats: ['Text', 'Photos', 'Video'] },
    { id: 'reddit', label: 'Reddit', icon: RedditLogo, color: '#ff4500', formats: ['Text', 'Link'] },
    { id: 'instagram', label: 'Instagram (Facebook Business)', icon: InstagramLogo, color: '#d62976', service: 'meta', formats: ['Photo', 'Reels'] },

    // Row 2
    { id: 'instagram-standalone', label: 'Instagram (Standalone)', icon: InstagramLogo, color: '#d62976', formats: ['Photo', 'Reels'] },
    { id: 'facebook', label: 'Facebook Page', icon: FacebookLogo, color: '#1877f2', service: 'meta', formats: ['Text', 'Photos', 'Video'] },
    { id: 'threads', label: 'Threads', icon: ThreadsLogo, color: '#000000', service: 'threads', formats: ['Text', 'Photo', 'Video'] },
    { id: 'youtube', label: 'YouTube', icon: YoutubeLogo, color: '#ff0033', formats: ['Video'] },
    { id: 'google-business', label: 'Google My Business', icon: Storefront, color: '#4285f4', formats: ['Updates', 'Photos'] },

    // Row 3
    { id: 'tiktok', label: 'TikTok', icon: TiktokLogo, color: '#000000', service: 'tiktok', formats: ['Private video'] },
    { id: 'tiktok-business', label: 'TikTok (Business / Creator)', icon: TiktokLogo, color: '#000000', formats: ['Video'] },
    { id: 'pinterest', label: 'Pinterest', icon: PinterestLogo, color: '#e60023', formats: ['Pins', 'Photos'] },
    { id: 'dribbble', label: 'Dribbble', icon: DribbbleLogo, color: '#ea4c89', formats: ['Shots'] },
    { id: 'discord', label: 'Discord', icon: DiscordLogo, color: '#5865f2', formats: ['Messages'] },

    // Row 4
    { id: 'slack', label: 'Slack', icon: SlackLogo, color: '#4a154b', formats: ['Messages'] },
    { id: 'kick', label: 'Kick', icon: Broadcast, color: '#53fc18', formats: ['Live'] },
    { id: 'twitch', label: 'Twitch', icon: TwitchLogo, color: '#9146ff', formats: ['Stream'] },
    { id: 'mastodon', label: 'Mastodon', icon: MastodonLogo, color: '#6364ff', formats: ['Posts'] },
    { id: 'bluesky', label: 'Bluesky', icon: Butterfly, color: '#0285ff', formats: ['Posts', 'Photos'] },

    // Row 5
    { id: 'lemmy', label: 'Lemmy', icon: Users, color: '#24292e', formats: ['Posts'] },
    { id: 'farcaster', label: 'Farcaster', icon: Asterisk, color: '#8a63d2', formats: ['Casts'] },
    { id: 'telegram', label: 'Telegram', icon: TelegramLogo, color: '#229ed9', formats: ['Channel'] },
    { id: 'nostr', label: 'Nostr', icon: Sparkle, color: '#9933ff', formats: ['Notes'] },
    { id: 'vk', label: 'VK', icon: Globe, color: '#0077ff', formats: ['Posts'] },

    // Row 6
    { id: 'medium', label: 'Medium', icon: MediumLogo, color: '#000000', formats: ['Articles'] },
    { id: 'devto', label: 'Dev.to', icon: Code, color: '#0a0a0a', formats: ['Articles'] },
    { id: 'hashnode', label: 'Hashnode', icon: Compass, color: '#2962ff', formats: ['Articles'] },
    { id: 'wordpress', label: 'WordPress', icon: Globe, color: '#21759b', formats: ['Posts', 'Pages'] },
    { id: 'listmonk', label: 'ListMonk', icon: EnvelopeSimple, color: '#0070f3', formats: ['Newsletters'] },

    // Row 7
    { id: 'moltbook', label: 'Moltbook', icon: BookOpen, color: '#ff4444', formats: ['Posts'] },
    { id: 'whop', label: 'Whop', icon: ShoppingBag, color: '#ff6243', formats: ['Community'] },
    { id: 'skool', label: 'Skool', icon: GraduationCap, color: '#f59e0b', formats: ['Community'] },
    { id: 'mewe', label: 'MeWe', icon: Users, color: '#0074e4', formats: ['Posts'] },
    { id: 'tumblr', label: 'Tumblr', icon: TumblrLogo, color: '#34526f', formats: ['Posts'] },
];

export function connectionReturnPlatform() {
    const query = new URLSearchParams(window.location.search);
    return ['linkedin', 'tiktok', 'threads', 'x'].find(key => query.has(key)) || (query.get('meta') === 'select' ? 'facebook' : '');
}

export function hasConnectionReturn() {
    return ['meta', 'threads', 'linkedin', 'tiktok', 'x'].some(key => new URLSearchParams(window.location.search).has(key));
}

export default function AddChannelDialog({ open, onOpenChange, brands, defaultBrandId, demoMode, onChanged, onAddManually, initialPlatform = '' }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(connectionReturnPlatform);
    const [health, setHealth] = useState(null);
    const [busy, setBusy] = useState(false);
    const [reload, setReload] = useState(0);

    useEffect(() => { if (open && initialPlatform) setSelected(initialPlatform); }, [open, initialPlatform]);

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
    const channel = channels.find(item => item.id === selected);
    const props = { brands, defaultBrandId, demoMode, embedded: true, onBusyChange: setBusy, onChanged: () => { onChanged(); clearReturn(); setBusy(false); setSelected(''); onOpenChange(false); } };

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent className="!w-[calc(100vw_-_2rem)] !max-w-[1180px] p-5 sm:p-6" aria-describedby="add-channel-description">
                <DialogHeader>
                    {selected && (
                        <Button variant="ghost" type="button" disabled={busy} onClick={() => { setSelected(''); clearReturn(); }} className="h-auto p-0 mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                            <ArrowLeft size={14} />{t('All platforms')}
                        </Button>
                    )}
                    <DialogTitle className="text-xl sm:text-2xl font-heading">
                        {selected ? t('Connect {platform}', { platform: channel?.label }) : t('Add channel')}
                    </DialogTitle>
                    <DialogDescription id="add-channel-description" className="text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-[800px]">
                        {t('Choose a platform. Sign in on its official website, then select the account to connect. Socialchoice never asks for your social account password.')}
                    </DialogDescription>
                </DialogHeader>

                {!selected ? (
                    <>
                        {['failed', 'cancelled'].includes(metaOutcome) && (
                            <p role="status" className="mb-3 rounded-lg bg-warnBg p-2.5 text-sm text-warnFg">
                                {t(metaOutcome === 'cancelled' ? 'Connection cancelled. Choose a platform to try again.' : 'Connection failed. Choose the platform you want to reconnect.')}
                            </p>
                        )}
                        {['failed', 'cancelled'].includes(xOutcome) && (
                            <p role="status" className="mb-3 rounded-lg bg-warnBg p-2.5 text-sm text-warnFg">
                                {t(xOutcome === 'cancelled' ? 'Kết nối X đã bị hủy. Hãy thử lại.' : 'Kết nối X thất bại. Vui lòng kiểm tra quyền hạn và thử lại.')}
                            </p>
                        )}
                        {demoMode && <p className="mb-3 rounded-lg bg-warnBg p-2.5 text-sm text-warnFg">{t('Switch to your real workspace to connect a channel.')}</p>}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[65vh] overflow-y-auto pr-1">
                            {channels.map(({ id, label, icon: Icon, color, service, formats }) => {
                                const status = service && health?.[service];
                                const available = status?.platforms ? status.platforms[id] : status?.ready;
                                const state = !service
                                    ? 'Coming soon'
                                    : !status || status.loading
                                        ? 'Checking…'
                                        : status?.error
                                            ? 'Status unavailable'
                                            : available
                                                ? id === 'tiktok' ? 'Sandbox' : 'Available to connect'
                                                : 'Setup required';

                                return (
                                    <Button
                                        variant="ghost"
                                        key={id}
                                        type="button"
                                        disabled={!service || !status || status.loading}
                                        onClick={() => setSelected(id)}
                                        aria-label={t('Connect {platform}', { platform: label })}
                                        className={`h-auto group relative flex min-h-[142px] flex-col items-center justify-center rounded-xl border p-3 pt-8 pb-3 text-center transition-colors focus-visible:outline-offset-2 ${!service ? 'bg-surface text-muted-foreground cursor-not-allowed opacity-60' : 'bg-white hover:border-brand-dark hover:bg-successBg/30'}`}
                                    >
                                        <span className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9.5px] font-medium ${available ? 'bg-successBg text-successFg' : 'bg-muted text-muted-foreground'}`}>
                                            {t(state)}
                                        </span>
                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-2xs" style={{ color }}>
                                            <Icon size={24} weight={['instagram', 'instagram-standalone', 'threads', 'x', 'bluesky'].includes(id) ? 'regular' : 'fill'} />
                                        </span>
                                        <span className="mt-2 text-[12.5px] font-medium text-foreground line-clamp-1">{label}</span>
                                        <span className="mt-1.5 flex flex-wrap justify-center gap-1">
                                            {formats.map(format => (
                                                <span key={format} className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                                                    {t(format)}
                                                </span>
                                            ))}
                                        </span>
                                        {!!service && <ArrowUpRight size={13} className="absolute bottom-2 right-2 text-muted-foreground group-hover:text-successFg" />}
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                            <Button variant="ghost" type="button" onClick={() => { clearReturn(); onAddManually(); }} className="h-auto p-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                                {t('Add a planning reference instead')}
                            </Button>
                            {health && Object.values(health).some(value => value.error) && (
                                <Button variant="ghost" type="button" onClick={() => setReload(value => value + 1)} className="h-auto p-0 text-xs underline">
                                    {t('Retry connection status')}
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <div>
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
