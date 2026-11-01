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
    CheckCircle,
    WarningCircle,
    FloppyDisk,
    Images,
    Package,
    Users,
    ChatTeardropText,
    Target,
    CalendarCheck,
    Plus,
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

export default function BrandKnowledgeBase({ brand, onUpdated, assetsCount = 0 }) {
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
        posting_frequency: '1_per_day',
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
                posting_frequency: ({'1 bài/ngày':'1_per_day','2 bài/ngày':'2_per_day','3 bài/tuần':'3_per_week','5 bài/tuần':'5_per_week'}[brand.posting_frequency] || brand.posting_frequency || '1_per_day'),
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

    const isComplete = fieldsCount >= 4;
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
        <div className="space-y-6">
            {/* Context Status Overview Header */}
            <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0"
                            style={{ backgroundColor: brand.color || '#79D94B' }}
                        >
                            {brand.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground">{brand.name}</h2>
                                <span className="label-xs rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                                    {brand.timezone || 'Asia/Ho_Chi_Minh'}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {brand.description || t('No description provided yet.')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                            isComplete
                                ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                                : 'bg-amber-50 border-amber-200/60 text-amber-700'
                        }`}>
                            {isComplete ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} weight="fill" />}
                            <span>{t('Brand Context: {count}/5 fields', { count: fieldsCount })}</span>
                        </div>

                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                            hasEnoughAssets
                                ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                                : 'bg-amber-50 border-amber-200/60 text-amber-700'
                        }`}>
                            <Images size={15} weight="bold" />
                            <span>{t('{count} assets in library', { count: assetsCount })}</span>
                        </div>

                        {!hasEnoughAssets && brand.is_demo && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSeedAssets}
                                disabled={seedingAssets}
                                className="h-8 text-xs font-medium gap-1.5 rounded-xl border-dashed"
                            >
                                <Plus size={13} weight="bold" />
                                <span>{seedingAssets ? t('Seeding…') : t('Nạp 20 assets mẫu')}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Knowledge Base Input Form */}
            <form onSubmit={handleSave} className="panel p-6 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <IdentificationCard size={17} weight="duotone" />
                            </span>
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('Cơ sở tri thức thương hiệu (Brand Knowledge Base)')}
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('Cung cấp chân dung đối tượng, sản phẩm, giọng điệu và KPI để AI Content Strategist đề xuất kế hoạch chuẩn xác nhất.')}
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-skew inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                    >
                        <FloppyDisk size={15} weight="bold" />
                        <span>{saving ? t('Saving…') : t('Lưu tri thức thương hiệu')}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Products / Services */}
                    <div className="space-y-2">
                        <label htmlFor="brand-products" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Package size={15} className="text-amber-500" />
                            <span>{t('Sản phẩm & Dịch vụ chủ lực')}</span>
                        </label>
                        <Textarea id="brand-products"
                            rows={3}
                            value={form.products}
                            onChange={(e) => setForm({ ...form, products: e.target.value })}
                            placeholder={t('VD: Cà phê hạt Single Origin Ethiopia & Cầu Đất, Cold Brew đóng chai, Phin Pour-over thủ công…')}
                            className="text-xs rounded-xl border-border bg-background"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {t('Liệt kê các dòng sản phẩm hoặc dịch vụ mà bạn muốn nội dung tập trung quảng bá.')}
                        </p>
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-2">
                        <label htmlFor="brand-target_audience" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Users size={15} className="text-blue-500" />
                            <span>{t('Khách hàng & Đối tượng mục tiêu')}</span>
                        </label>
                        <Textarea id="brand-target_audience"
                            rows={3}
                            value={form.target_audience}
                            onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                            placeholder={t('VD: Người yêu cà phê đặc sản 22-38 tuổi tại TP.HCM, dân văn phòng sáng tạo, người thích tự pha tại nhà…')}
                            className="text-xs rounded-xl border-border bg-background"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {t('Độ tuổi, phong cách sống, sở thích và nỗi đau (pain points) của khách hàng.')}
                        </p>
                    </div>

                    {/* Tone of Voice */}
                    <div className="space-y-2">
                        <label htmlFor="brand-tone_of_voice" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <ChatTeardropText size={15} className="text-purple-500" />
                            <span>{t('Giọng điệu thương hiệu (Tone of Voice)')}</span>
                        </label>
                        <Input id="brand-tone_of_voice"
                            type="text"
                            value={form.tone_of_voice}
                            onChange={(e) => setForm({ ...form, tone_of_voice: e.target.value })}
                            placeholder={t('VD: Chân thực, ấm áp, đam mê hương vị, truyền cảm hứng…')}
                            className="text-xs rounded-xl border-border bg-background"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {TONE_PRESETS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setForm({ ...form, tone_of_voice: preset })}
                                    className="rounded-lg bg-muted/60 hover:bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-all"
                                >
                                    + {preset.split(',')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Marketing Goals & KPIs */}
                    <div className="space-y-2">
                        <label htmlFor="brand-goals" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Target size={15} className="text-emerald-500" />
                            <span>{t('Mục tiêu marketing & KPI')}</span>
                        </label>
                        <Input id="brand-goals"
                            type="text"
                            value={form.goals}
                            onChange={(e) => setForm({ ...form, goals: e.target.value })}
                            placeholder={t('VD: Tăng đơn hàng túi cà phê pha tại nhà, xây dựng thói quen uống specialty coffee…')}
                            className="text-xs rounded-xl border-border bg-background"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {GOAL_PRESETS.map((goal) => (
                                <button
                                    key={goal}
                                    type="button"
                                    onClick={() => setForm({ ...form, goals: goal })}
                                    className="rounded-lg bg-muted/60 hover:bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-all"
                                >
                                    + {goal.split('&')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferred Frequency */}
                    <div className="space-y-2">
                        <label htmlFor="brand-posting_frequency" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <CalendarCheck size={15} className="text-rose-500" />
                            <span>{t('Tần suất đăng mong muốn')}</span>
                        </label>
                        <select id="brand-posting_frequency"
                            value={form.posting_frequency}
                            onChange={(e) => setForm({ ...form, posting_frequency: e.target.value })}
                            className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="1_per_day">{t('1 bài / ngày (Khuyên dùng cho lịch 30 ngày)')}</option>
                            <option value="2_per_day">{t('2 bài / ngày (Sáng và Tối)')}</option>
                            <option value="3_per_week">{t('3 bài / tuần (Thứ 2, Thứ 4, Thứ 6)')}</option>
                            <option value="5_per_week">{t('5 bài / tuần (Từ Thứ 2 đến Thứ 6)')}</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground">
                            {t('Tần suất đăng này sẽ được AI Content Strategist áp dụng mặc định khi lên lịch.')}
                        </p>
                    </div>

                    {/* General Brand Description */}
                    <div className="space-y-2">
                        <label htmlFor="brand-description" className="text-xs font-semibold text-foreground">
                            {t('Mô tả chung thương hiệu')}
                        </label>
                        <Textarea id="brand-description"
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder={t('Giới thiệu tổng quan về thương hiệu, quy mô, địa chỉ chi nhánh…')}
                            className="text-xs rounded-xl border-border bg-background"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}
