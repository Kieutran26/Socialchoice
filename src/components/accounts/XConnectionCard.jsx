import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function XConnectionCard({ brands, demoMode, onChanged, defaultBrandId = '', embedded = false, onBusyChange = (_value) => { } }) {
    const { t } = useTranslation();
    const [ready, setReady] = useState(false);
    const [brandId, setBrandId] = useState(defaultBrandId);
    const [profile, setProfile] = useState(null);
    const [selected, setSelected] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => { if (defaultBrandId && !brandId) setBrandId(defaultBrandId); }, [defaultBrandId, brandId]);

    useEffect(() => {
        let active = true;
        Promise.all([appClient.x.status(), appClient.x.profile()]).then(([status, pending]) => {
            if (!active) return;
            setReady(status.ready);
            if (pending.brandId) setBrandId(pending.brandId);
            if (pending.pending) {
                setProfile(pending);
                setSelected(true);
            }
            if (pending.failure || new URLSearchParams(location.search).get('x') === 'failed') {
                setError('Kết nối X thất bại. Kiểm tra cấu hình ứng dụng X (Twitter) và thử lại.');
            }
        }).catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, []);

    async function connect() {
        setBusy(true);
        setError('');
        try {
            const result = await appClient.x.start(brandId);
            window.location.assign(result.url);
        } catch (e) {
            setError(e.message);
            setBusy(false);
        }
    }

    async function choose() {
        setBusy(true);
        try {
            await appClient.x.importProfile(profile.profile.id);
            setProfile(null);
            setSelected(false);
            onChanged();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className={embedded ? 'space-y-5' : 'panel p-5 mb-5 space-y-3'}>
            {!embedded && <h2>{t('Connect X (Twitter) account')}</h2>}
            <p className="label-xs">
                {t('Connect your X (Twitter) profile to publish short posts and updates (up to 280 characters).')}
            </p>
            {!ready && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    <p className="font-semibold">{t('Chưa cấu hình X Developer API:')}</p>
                    <p>{t('Vui lòng thêm X_CLIENT_ID và X_CLIENT_SECRET vào file cấu hình server (.env hoặc Cloudflare secrets) trước khi kết nối.')}</p>
                </div>
            )}
            {error && <p role="alert" className="text-dangerFg text-sm">{t(error)}</p>}
            <label className="block text-sm">
                {t('Brand')}
                <select
                    className="border rounded-lg p-2 ml-3"
                    aria-label={t('X brand')}
                    value={brandId}
                    onChange={e => setBrandId(e.target.value)}
                    disabled={busy || demoMode}
                >
                    <option value="">{t('Choose brand')}</option>
                    {brands.filter(b => !b.is_demo && b.status === 'active').map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            </label>
            {profile ? (
                <Button variant="outline" type="button" disabled={!ready || !brandId || busy || demoMode} onClick={connect}>
                    {t('Connect / reconnect X')}
                </Button>
            ) : (
                <button className="btn-skew" type="button" disabled={!ready || !brandId || busy || demoMode} onClick={connect}>
                    {t('Connect / reconnect X')}
                </button>
            )}
            {profile && (
                <div className="border-t pt-3 space-y-3">
                    <label className="flex items-center gap-3 text-sm">
                        <input type="checkbox" checked={selected} onChange={e => setSelected(e.target.checked)} disabled={busy || demoMode} />
                        <span className="font-medium">{profile.profile.name || profile.profile.username}</span>
                        <span className="text-muted-foreground text-xs">@{profile.profile.username}</span>
                    </label>
                    <button className="btn-skew" type="button" disabled={!selected || busy || demoMode} onClick={choose}>
                        {t('Connect selected X account')}
                    </button>
                </div>
            )}
        </section>
    );
}

