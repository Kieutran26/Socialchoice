import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChatCircleDots, Clock, ShieldCheck } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import WatermarkTool from '@/components/tools/WatermarkTool';
import GoldenHoursTool from '@/components/tools/GoldenHoursTool';
import AutoDmTool from '@/components/tools/AutoDmTool';

export const TOOL_CATALOG = [
    {
        slug: 'watermark',
        legacyTab: 'watermark',
        title: 'Đóng dấu bản quyền ảnh',
        shortTitle: 'Đóng dấu ảnh',
        compactViewport: true,
        icon: ShieldCheck,
        iconBg: 'bg-sky-50 border-sky-200/70 text-sky-700',
        description:
            'Chèn chữ hoặc logo thương hiệu lên hình ảnh, tùy chỉnh vị trí và xuất file trực tiếp trên trình duyệt.',
        component: WatermarkTool,
    },
    {
        slug: 'golden-hours',
        legacyTab: 'golden_hours',
        title: 'Gợi ý khung giờ vàng',
        shortTitle: 'Khung giờ vàng',
        icon: Clock,
        iconBg: 'bg-amber-50 border-amber-200/80 text-amber-700',
        description:
            'Phân tích khung giờ đăng bài đạt reach cao nhất theo từng nền tảng (Facebook, Threads, TikTok, LinkedIn, Instagram) và ngành hàng.',
        component: GoldenHoursTool,
    },
    {
        slug: 'auto-dm',
        legacyTab: 'auto_dm',
        title: 'Comment-to-Inbox (Auto-DM)',
        shortTitle: 'Auto-DM Chốt đơn',
        isHot: true,
        icon: ChatCircleDots,
        iconBg: 'bg-emerald-50 border-emerald-200/70 text-emerald-700',
        description:
            'Tự động thích, phản hồi bình luận công khai và gửi tin nhắn kèm link/voucher ngay khi khách comment từ khóa mục tiêu.',
        component: AutoDmTool,
    },
];

/**
 * Redirect /tools (and legacy /tools?tab=...) directly to the dedicated tool page.
 */
export function ToolsIndexRedirect() {
    const [searchParams] = useSearchParams();
    const legacy = searchParams.get('tab');
    const match = legacy
        ? TOOL_CATALOG.find((item) => item.legacyTab === legacy || item.slug === legacy)
        : null;
    return <Navigate to={`/tools/${match?.slug || 'watermark'}`} replace />;
}

/**
 * Dedicated standalone page for each individual tool (/tools/:toolSlug)
 */
export function ToolWorkspacePage() {
    const { t } = useTranslation();
    const { toolSlug } = useParams();
    const tool = TOOL_CATALOG.find((item) => item.slug === toolSlug);

    if (!tool) {
        return <Navigate to="/tools/watermark" replace />;
    }

    const ToolComponent = tool.component;
    const Icon = tool.icon;

    return (
        <div
            className={`max-w-[1440px] mx-auto ${
                tool.compactViewport ? 'space-y-4' : 'space-y-6 pb-14'
            }`}
        >
            {/* Clean Dedicated Tool Header (No redundant sibling switcher bar) */}
            <header
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 ${
                    tool.compactViewport ? 'pb-3.5' : 'pb-5'
                }`}
            >
                <div className="min-w-0 flex items-center gap-3">
                    <span
                        className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${tool.iconBg}`}
                    >
                        <Icon size={19} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h1 className="font-heading text-[22px] sm:text-[24px] font-medium tracking-tight text-zinc-900 truncate">
                                {t(tool.title)}
                            </h1>
                            {tool.isHot ? (
                                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#ffd631]/30 border border-[#d8b216] text-[#2b2100] shrink-0">
                                    HOT
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                            {t(tool.description)}
                        </p>
                    </div>
                </div>
            </header>

            <ToolComponent />
        </div>
    );
}

export default ToolsIndexRedirect;
