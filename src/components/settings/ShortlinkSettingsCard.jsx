import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LinkSimple, CaretDown } from '@phosphor-icons/react';
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
        <section className="p-4 sm:p-5 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-2xs">
                    <LinkSimple size={18} weight="bold" />
                </span>
                <div>
                    <h2 className="text-[14px] font-bold text-neutral-900">
                        {t('Shortlink Settings')}
                    </h2>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                        {t('Cấu hình tính năng rút gọn liên kết và theo dõi lượt truy cập (clicks).')}
                    </p>
                </div>
            </div>

            {/* Preference Row matching exact screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-neutral-50/80 border border-neutral-200/70">
                <div className="space-y-0.5">
                    <p className="text-xs font-bold text-neutral-900">
                        {t('Shortlink Preference')}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                        {t('Control how URLs in your posts are handled. Shortlinks provide click statistics.')}
                    </p>
                </div>

                <div className="relative shrink-0 min-w-[200px]">
                    <select
                        value={preference}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-3 pr-8 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 cursor-pointer appearance-none shadow-2xs"
                    >
                        <option value="ask">{t('Ask every time')}</option>
                        <option value="always">{t('Always shorten')}</option>
                        <option value="never">{t('Never shorten')}</option>
                    </select>
                    <CaretDown
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
                    />
                </div>
            </div>
        </section>
    );
}

