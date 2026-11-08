import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { appClient } from '@/api/app-client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { seedBrandSampleAssets } from '@/lib/ai-content-strategist';
import {
    IdentificationCard,
    FloppyDisk,
    Images,
    Package,
    Users,
    ChatTeardropText,
    Target,
    CalendarCheck,
    Plus,
    UserFocus,
    ShieldCheck,
} from '@phosphor-icons/react';

const TONE_PRESETS = [
    'Chân thực, ấm áp, đam mê hương vị, truyền cảm hứng',
    'Năng động, động viên, kỷ luật, chuyên nghiệp',
    'Khoa học, minh bạch, ân cần, dễ hiểu',
    'Hóm hỉnh, bắt trend, gần gũi, sáng tạo',
    'Sang trọng, tinh tế, đẳng cấp, uy tín',
];

const GOAL_PRESETS = [
    'Tăng đơn hàng trực tiếp & chuyển đổi doanh số',
    'Xây dựng nhận thức thương hiệu & uy tín chuyên môn',
    'Tăng tương tác, bình luận và chia sẻ tự nhiên',
    'Thu hút khách hàng tiềm năng đến trải nghiệm trực tiếp',
    'Giáo dục thị trường về cách sử dụng sản phẩm hiệu quả',
];

export default function BrandKnowledgeBase({ brand, onUpdated, assetsCount = 0, assets = [] }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [seedingAssets, setSeedingAssets] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        products: '',
        target_audience: '',
        tone_of_voice: '',
        goals: '',
        posting_frequency: '1 bài/ngày',
    });

    useEffect(() => {
        if (brand) {
            setForm({
                name: brand.name || '',
                description: brand.description || '',
                products: brand.products || '',
                target_audience: brand.target_audience || '',
                tone_of_voice: brand.tone_of_voice || '',
                goals: brand.goals || '',
                posting_frequency: brand.posting_frequency || '1 bài/ngày',
            });
        }
    }, [brand]);

    if (!brand) return null;

    const fieldsCount = [
        form.description,
        form.products,
        form.target_audience,
        form.tone_of_voice,
        form.goals,
    ].filter(Boolean).length;

    const hasEnoughAssets = assetsCount >= 20;

    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            await appClient.entities.Brand.update(brand.id, {
                ...form,
                status: brand.status || 'active',
                color: brand.color || '#79D94B',
                timezone: brand.timezone || 'Asia/Ho_Chi_Minh',
                is_demo: !!brand.is_demo,
            });
            toast({
                title: t('Brand Knowledge Base updated'),
                description: t('Brand context, products and marketing goals have been saved successfully.'),
            });
            onUpdated?.();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Update failed'),
                description: error.message,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSeedAssets = async () => {
        setSeedingAssets(true);
        try {
            const added = await seedBrandSampleAssets({
                brandId: brand.id,
                isDemo: !!brand.is_demo,
                appClient,
            });
            toast({
                title: t('Sample assets added'),
                description: t('Added {count} curated assets to your Asset Library.', { count: added.length }),
            });
            onUpdated?.();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Failed to seed assets'),
                description: error.message,
            });
        } finally {
            setSeedingAssets(false);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Structured Form (7 cols / 58%) - Monochrome Style */}
            <form
                onSubmit={handleSave}
                className="xl:col-span-7 min-w-0 p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-6"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200">
                            <IdentificationCard size={19} weight="bold" />
                        </span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-neutral-900">
                                {t('Biểu mẫu thiết lập Tri thức Thương hiệu')}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                {t('Chỉnh sửa thông tin bên trái và xem thẻ Brand Guideline cập nhật trực tiếp bên phải.')}
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-60 shrink-0"
                    >
                        <FloppyDisk size={15} weight="bold" />
                        <span>{saving ? t('Đang lưu…') : t('Lưu tri thức thương hiệu')}</span>
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Products / Services */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                                <Package size={15} weight="bold" className="text-neutral-700" />
                                <span>{t('Sản phẩm & Dịch vụ chủ lực')}</span>
                            </label>
                            <Textarea
                                rows={3}
                                value={form.products}
                                onChange={(e) => setForm({ ...form, products: e.target.value })}
                                placeholder={t('VD: Cà phê hạt Single Origin Ethiopia & Cầu Đất, Cold Brew đóng chai, Phin Pour-over thủ công…')}
                                className="text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                            <p className="text-[11px] text-neutral-500">
                                {t('Liệt kê các dòng sản phẩm hoặc dịch vụ mà bạn muốn nội dung tập trung quảng bá.')}
                            </p>
                        </div>

                        {/* Target Audience */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                                <Users size={15} weight="bold" className="text-neutral-700" />
                                <span>{t('Khách hàng & Đối tượng mục tiêu')}</span>
                            </label>
                            <Textarea
                                rows={3}
                                value={form.target_audience}
                                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                                placeholder={t('VD: Người yêu cà phê đặc sản 22-38 tuổi tại TP.HCM, dân văn phòng sáng tạo, người thích tự pha tại nhà…')}
                                className="text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                            <p className="text-[11px] text-neutral-500">
                                {t('Độ tuổi, phong cách sống, sở thích và nỗi đau (pain points) của khách hàng.')}
                            </p>
                        </div>
                    </div>

                    {/* Tone of Voice */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                            <ChatTeardropText size={15} weight="bold" className="text-neutral-700" />
                            <span>{t('Giọng điệu thương hiệu (Tone of Voice)')}</span>
                        </label>
                        <Input
                            type="text"
                            value={form.tone_of_voice}
                            onChange={(e) => setForm({ ...form, tone_of_voice: e.target.value })}
                            placeholder={t('VD: Chân thực, ấm áp, đam mê hương vị, truyền cảm hứng…')}
                            className="h-10 text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {TONE_PRESETS.map((preset) => {
                                const isActive = form.tone_of_voice === preset;
                                return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setForm({ ...form, tone_of_voice: preset })}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${isActive
                                            ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium border border-neutral-200/60'
                                            }`}
                                    >
                                        {isActive ? '✓ ' : '+ '}
                                        {preset.split(',')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Marketing Goals & KPIs */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                            <Target size={15} weight="bold" className="text-neutral-700" />
                            <span>{t('Mục tiêu Marketing & KPI')}</span>
                        </label>
                        <Input
                            type="text"
                            value={form.goals}
                            onChange={(e) => setForm({ ...form, goals: e.target.value })}
                            placeholder={t('VD: Tăng đơn hàng túi cà phê pha tại nhà, xây dựng thói quen uống specialty coffee…')}
                            className="h-10 text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {GOAL_PRESETS.map((goal) => {
                                const isActive = form.goals === goal;
                                return (
                                    <button
                                        key={goal}
                                        type="button"
                                        onClick={() => setForm({ ...form, goals: goal })}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${isActive
                                            ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium border border-neutral-200/60'
                                            }`}
                                    >
                                        {isActive ? '✓ ' : '+ '}
                                        {goal.split('&')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {/* Preferred Frequency */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                                <CalendarCheck size={15} weight="bold" className="text-neutral-700" />
                                <span>{t('Tần suất đăng mong muốn')}</span>
                            </label>
                            <select
                                value={form.posting_frequency}
                                onChange={(e) => setForm({ ...form, posting_frequency: e.target.value })}
                                className="w-full h-10 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
                            >
                                <option value="1 bài/ngày">{t('1 bài / ngày (Khuyên dùng cho lịch 30 ngày)')}</option>
                                <option value="2 bài/ngày">{t('2 bài / ngày (Sáng và Tối)')}</option>
                                <option value="3 bài/tuần">{t('3 bài / tuần (Thứ 2, Thứ 4, Thứ 6)')}</option>
                                <option value="5 bài/tuần">{t('5 bài / tuần (Từ Thứ 2 đến Thứ 6)')}</option>
                            </select>
                            <p className="text-[11px] text-neutral-500">
                                {t('Tần suất đăng này sẽ được AI Content Strategist áp dụng mặc định khi lên lịch.')}
                            </p>
                        </div>

                        {/* General Brand Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-800 block">
                                {t('Mô tả chung thương hiệu')}
                            </label>
                            <Textarea
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder={t('Giới thiệu tổng quan về thương hiệu, quy mô, địa chỉ chi nhánh…')}
                                className="text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                        </div>
                    </div>
                </div>
            </form>

            {/* Right Column: Live Enterprise Brand Guidelines Sheet (5 cols / 42% - Sticky) */}
            <div className="xl:col-span-5 min-w-0 space-y-5 sticky top-20">
                <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs overflow-hidden">
                    {/* Top Header: Brand Identity Bar */}
                    <div className="p-4 border-b border-neutral-100 bg-neutral-50/60 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-xl bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shadow-2xs shrink-0 tracking-wider">
                                {brand.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-neutral-900 truncate">
                                        {brand.name} · {t('Brand Guidelines Spec')}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-semibold shrink-0">
                                        ACTIVE SPEC
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                    {t('Định vị thương hiệu chính thức đang hướng dẫn cho AI')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-lg border border-neutral-200">
                                {brand.timezone || 'Asia/Ho_Chi_Minh'}
                            </span>
                            <span className="text-[11px] font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-lg border border-neutral-200">
                                {fieldsCount}/5 {t('Tiêu chí')}
                            </span>
                        </div>
                    </div>

                    {/* Structured Metadata Matrix (Monochrome) */}
                    <div className="divide-y divide-neutral-100 text-xs">
                        {/* Row 1: Định vị & Sản phẩm */}
                        <div className="p-4 space-y-1.5 hover:bg-neutral-50/40 transition">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-neutral-500 font-medium">
                                    <Package size={15} weight="bold" className="text-neutral-700 shrink-0" />
                                    <span className="font-semibold uppercase tracking-wider text-[10.5px] text-neutral-600">
                                        {t('Định vị & Sản phẩm')}
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-medium border border-neutral-200 shrink-0">
                                    {t('Chủ lực')}
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="font-semibold text-neutral-900 text-xs sm:text-[13px] block">
                                    {form.products || t('Chưa cập nhật sản phẩm')}
                                </span>
                                <p className="text-neutral-500 text-[11px] leading-relaxed">
                                    {t('Định vị cốt lõi')}:{' '}
                                    <strong className="text-neutral-800 font-medium">
                                        {form.description || t('Phong cách nhẹ nhàng, tinh gọn')}
                                    </strong>
                                </p>
                            </div>
                        </div>

                        {/* Row 2: Khách hàng mục tiêu */}
                        <div className="p-4 space-y-1.5 hover:bg-neutral-50/40 transition">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-neutral-500 font-medium">
                                    <UserFocus size={15} weight="bold" className="text-neutral-700 shrink-0" />
                                    <span className="font-semibold uppercase tracking-wider text-[10.5px] text-neutral-600">
                                        {t('Độc giả mục tiêu')}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-900 text-[11px] font-semibold">
                                        {form.target_audience || t('Khách hàng trẻ & năng động')}
                                    </span>
                                </div>
                                <p className="text-neutral-500 text-[11px] leading-relaxed">
                                    {t('AI tối ưu ngôn từ phù hợp thói quen và phong cách sống của tệp độc giả này.')}
                                </p>
                            </div>
                        </div>

                        {/* Row 3: Giọng văn & Bản sắc ngôn từ */}
                        <div className="p-4 space-y-1.5 hover:bg-neutral-50/40 transition">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-neutral-500 font-medium">
                                    <ChatTeardropText size={15} weight="bold" className="text-neutral-700 shrink-0" />
                                    <span className="font-semibold uppercase tracking-wider text-[10.5px] text-neutral-600">
                                        {t('Giọng điệu (Tone of Voice)')}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                    {(form.tone_of_voice || 'Chân thực, Ấm áp, Đam mê hương vị, Truyền cảm hứng')
                                        .split(/[,·+]/)
                                        .map((kw) => kw.trim())
                                        .filter(Boolean)
                                        .map((kw, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 rounded-md bg-neutral-900 text-white font-medium text-[10.5px] shadow-2xs"
                                            >
                                                {kw}
                                            </span>
                                        ))}
                                </div>
                                <p className="text-neutral-500 text-[11px] italic">
                                    “{t('Giọng văn chuẩn mực, chân thực và khơi gợi cảm xúc tự nhiên')}”
                                </p>
                            </div>
                        </div>

                        {/* Row 4: Mục tiêu KPI & Tần suất */}
                        <div className="p-4 space-y-1.5 hover:bg-neutral-50/40 transition">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-neutral-500 font-medium">
                                    <Target size={15} weight="bold" className="text-neutral-700 shrink-0" />
                                    <span className="font-semibold uppercase tracking-wider text-[10.5px] text-neutral-600">
                                        {t('Mục tiêu & Tần suất')}
                                    </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-800 font-mono font-semibold text-[11px] border border-neutral-200 shrink-0">
                                    {(() => {
                                        const freq = form.posting_frequency;
                                        if (freq === '1_per_day' || freq === '1 bài/ngày') return t('1 bài / ngày');
                                        if (freq === '2_per_day' || freq === '2 bài/ngày') return t('2 bài / ngày');
                                        if (freq === '3_per_week' || freq === '3 bài/tuần') return t('3 bài / tuần');
                                        if (freq === '5_per_week' || freq === '5 bài/tuần') return t('5 bài / tuần');
                                        return freq || t('1 bài / ngày');
                                    })()}
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="font-semibold text-neutral-900 text-xs sm:text-[12.5px] block">
                                    {form.goals || t('Tăng đơn hàng trực tiếp & chuyển đổi doanh số')}
                                </span>
                                <p className="text-neutral-500 text-[11px]">
                                    {t('Tối ưu CTA dẫn link và hành động chuyển đổi')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Asset Quota & Live Preview Section (Monochrome) */}
                    <div className="p-4 bg-neutral-50/50 border-t border-neutral-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <Images size={16} weight="bold" className="text-neutral-800 shrink-0" />
                                <span className="font-semibold text-neutral-900 truncate">
                                    {t('Thư viện tài nguyên đính kèm')}
                                </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md bg-neutral-900 text-white font-medium text-[10.5px] shrink-0">
                                {assetsCount}/20 Assets ({Math.round((assetsCount / 20) * 100)}% Quota)
                            </span>
                        </div>

                        {/* 6 Mini Image Thumbnails Grid */}
                        <div className="grid grid-cols-6 gap-2 min-w-0">
                            {assets.slice(0, 5).map((asset, idx) => (
                                <div
                                    key={asset.id || idx}
                                    className="aspect-square rounded-xl overflow-hidden border border-neutral-200 shadow-2xs bg-white min-w-0"
                                    title={asset.name}
                                >
                                    {asset.file_url ? (
                                        <img
                                            src={asset.file_url}
                                            alt={asset.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                                            <Images size={16} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Fallback mock tiles if fewer than 5 assets */}
                            {assets.length < 5 &&
                                [
                                    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&q=80',
                                    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80',
                                    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80',
                                    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&q=80',
                                    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&q=80',
                                ]
                                    .slice(assets.length, 5)
                                    .map((url, i) => (
                                        <div
                                            key={`fallback-${i}`}
                                            className="aspect-square rounded-xl overflow-hidden border border-neutral-200 shadow-2xs bg-white min-w-0"
                                        >
                                            <img src={url} alt="mock asset" className="w-full h-full object-cover" />
                                        </div>
                                    ))}

                            {/* 6th Tile: Counter */}
                            <div className="aspect-square rounded-xl border border-dashed border-neutral-300 bg-white flex flex-col items-center justify-center text-neutral-700 hover:bg-neutral-100 cursor-pointer transition min-w-0 p-0.5">
                                <span className="text-[11px] font-bold font-mono text-neutral-900">
                                    +{Math.max(0, assetsCount - 5)}
                                </span>
                                <span className="text-[8.5px] uppercase font-bold text-neutral-400 text-center leading-none mt-0.5">
                                    {t('Tất cả')}
                                </span>
                            </div>
                        </div>

                        {!hasEnoughAssets && (
                            <div className="pt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSeedAssets}
                                    disabled={seedingAssets}
                                    className="h-8 text-xs font-medium gap-1.5 rounded-xl border-dashed w-full border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                                >
                                    <Plus size={13} weight="bold" />
                                    <span>{seedingAssets ? t('Đang nạp…') : t('Nạp 20 assets mẫu ngay')}</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Footer: System Integrity Assurance */}
                    <div className="px-4 py-3 bg-white border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1.5 text-neutral-800 font-medium min-w-0">
                            <ShieldCheck size={14} weight="bold" className="text-neutral-900 shrink-0" />
                            <span className="truncate">{t('Dữ liệu đồng bộ trực tiếp với Lịch xuất bản 30 ngày')}</span>
                        </span>
                        <span className="font-mono text-neutral-400 text-[10px] shrink-0">Spec: 2026.11</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
