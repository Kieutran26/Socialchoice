import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import WatermarkTool from '@/components/tools/WatermarkTool';
import GoldenHoursTool from '@/components/tools/GoldenHoursTool';
import AutoDmTool from '@/components/tools/AutoDmTool';
import {
    Wrench,
    Clock,
    ShieldCheck,
    ChatCircleDots,
    Sparkle,
    Storefront,
} from '@phosphor-icons/react';

export default function Tools() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Active Tab: 'watermark' | 'golden_hours' | 'auto_dm'
    const [activeTab, setActiveTabState] = useState(searchParams.get('tab') || 'watermark');

    const setTab = (tabId) => {
        setActiveTabState(tabId);
        setSearchParams({ tab: tabId });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Bộ Tiện Ích & Công Cụ (Marketing Toolkit)')}
                description={t('Bộ công cụ chuyên sâu: Đóng dấu bản quyền ảnh, phân tích khung giờ vàng thuật toán và tự động hóa Comment-to-Inbox chốt đơn.')}
            />

            {/* Main Tabs Switcher */}
            <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setTab('watermark')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                        activeTab === 'watermark'
                            ? 'bg-brand border-brand-dark text-brand-ink shadow-xs'
                            : 'bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                    <ShieldCheck size={16} weight={activeTab === 'watermark' ? 'fill' : 'bold'} />
                    <span>{t('Đóng Dấu Bản Quyền Ảnh (Watermark)')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setTab('golden_hours')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                        activeTab === 'golden_hours'
                            ? 'bg-brand border-brand-dark text-brand-ink shadow-xs'
                            : 'bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                    <Clock size={16} weight={activeTab === 'golden_hours' ? 'fill' : 'bold'} />
                    <span>{t('Gợi Ý Khung Giờ Vàng (Golden Hours)')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setTab('auto_dm')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                        activeTab === 'auto_dm'
                            ? 'bg-brand border-brand-dark text-brand-ink shadow-xs'
                            : 'bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                    <ChatCircleDots size={16} weight={activeTab === 'auto_dm' ? 'fill' : 'bold'} />
                    <span>{t('Comment-to-Inbox (Keyword Auto-DM)')}</span>
                    <span className="rounded bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 text-[9px] font-bold">HOT</span>
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/tiktok-shop')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                    <Storefront size={16} weight="bold" className="text-[#FE2C55]" />
                    <span>{t('TikTok Shop (Seller Center & Giỏ Hàng)')}</span>
                    <span className="rounded bg-red-100 text-red-900 border border-red-300 px-1 py-0.2 text-[9px] font-bold">HOT</span>
                </button>
            </div>

            {/* Content Tabs */}
            {activeTab === 'watermark' && <WatermarkTool />}
            {activeTab === 'golden_hours' && <GoldenHoursTool />}
            {activeTab === 'auto_dm' && <AutoDmTool />}
        </div>
    );
}
