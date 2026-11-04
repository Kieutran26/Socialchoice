import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LinkSimple, CaretDown, Check } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/use-toast';

export const SHORTLINK_STORAGE_KEY = 'socialchoice.shortlink_preference';

export function getShortlinkPreference() {
    try {
        return window.localStorage.getItem(SHORTLINK_STORAGE_KEY) || 'ask';
    } catch {
        return 'ask';
    }
}

export function setShortlinkPreference(value) {
    try {
        window.localStorage.setItem(SHORTLINK_STORAGE_KEY, value);
        window.dispatchEvent(new Event('storage'));
    } catch {
        // preference persisted for session
    }
}

export default function ShortlinkSettingsCard() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [preference, setPreference] = useState(getShortlinkPreference);

    useEffect(() => {
        const handleSync = () => setPreference(getShortlinkPreference());
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
    }, []);

    const handleChange = (newVal) => {
        setPreference(newVal);
        setShortlinkPreference(newVal);
        toast({
            title: t('Cài đặt Shortlink đã được lưu'),
            description: t(
                newVal === 'always'
                    ? 'Tự động rút gọn các liên kết trong bài viết để đo lường click.'
                    : newVal === 'never'
                    ? 'Giữ nguyên liên kết gốc khi đăng bài.'
                    : 'Hệ thống sẽ hỏi bạn mỗi khi phát hiện liên kết trong bài viết.'
            ),
        });
    };

    return (
        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffd631]/20 text-[#2b2100]">
                    <LinkSimple size={18} weight="bold" />
                </span>
                <div>
                    <h2 className="text-[15px] font-semibold text-foreground">
                        {t('Shortlink Settings')}
                    </h2>
                    <p className="label-xs text-muted-foreground mt-0.5">
                        {t('Cấu hình tính năng rút gọn liên kết và theo dõi lượt truy cập (clicks).')}
                    </p>
                </div>
            </div>

            {/* Preference Row matching exact screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface/60 border border-border/60">
                <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                        {t('Shortlink Preference')}
                    </p>
                    <p className="label-xs text-muted-foreground">
                        {t('Control how URLs in your posts are handled. Shortlinks provide click statistics.')}
                    </p>
                </div>

                <div className="relative shrink-0 min-w-[190px]">
                    <select
                        value={preference}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-full h-9 rounded-xl border border-border bg-background px-3 pr-8 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffd631] cursor-pointer appearance-none shadow-2xs"
                    >
                        <option value="ask">{t('Ask every time')}</option>
                        <option value="always">{t('Always shorten')}</option>
                        <option value="never">{t('Never shorten')}</option>
                    </select>
                    <CaretDown
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
                    />
                </div>
            </div>
        </section>
    );
}
