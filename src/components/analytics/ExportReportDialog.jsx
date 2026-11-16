import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { formatNumber, percent, formatCalendarDate } from '@/lib/format';
import { appClient } from '@/api/app-client';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    FilePdf,
    FileCsv,
    Printer,
    DownloadSimple,
    Eye,
    CheckCircle,
    Article,
    Stack,
    TrendUp,
    ShieldCheck,
    ShareNetwork,
    LinkSimple,
    BuildingOffice,
    CalendarBlank,
    Info,
    Sparkle,
} from '@phosphor-icons/react';

export default function ExportReportDialog({
    open,
    onClose,
    analyticsData,
    scope,
    timezone = 'Asia/Ho_Chi_Minh',
}) {
    const { t } = useTranslation();
    const { brands, selectedBrandId } = useWorkspace();
    const { user } = useAuth();
    const { toast } = useToast();

    const [brandId, setBrandId] = useState(selectedBrandId || 'all');
    const [timeframe, setTimeframe] = useState('month');
    const [reportTitle, setReportTitle] = useState('Báo cáo Hiệu quả Truyền thông & Nội dung Đa kênh');
    const [preparedBy, setPreparedBy] = useState(user?.full_name || 'SocialChoice Team');
    const [executiveNotes, setExecutiveNotes] = useState(
        'Tỷ lệ đăng bài ổn định, tương tác duy trì tốt qua các kênh trọng điểm. Chiến dịch tiếp theo khuyến nghị đẩy mạnh định dạng video ngắn trên TikTok & Threads.'
    );
    const [recentPosts, setRecentPosts] = useState([]);
    const [shortlinksCount, setShortlinksCount] = useState(0);
    const [shortlinksClicks, setShortlinksClicks] = useState(0);
    const [previewMode, setPreviewMode] = useState(false);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const reportRef = useRef(null);

    // Selected brand details
    const selectedBrand = useMemo(() => {
        if (!brandId || brandId === 'all') return null;
        return brands.find((b) => b.id === brandId) || null;
    }, [brandId, brands]);

    const brandName = selectedBrand ? selectedBrand.name : 'Tất cả thương hiệu (Workspace)';

    // Timeframe text
    const timeframeLabel = useMemo(() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        if (timeframe === 'month') return `Tháng ${month}/${year}`;
        if (timeframe === '30days') return `30 ngày qua (Đến ${now.toLocaleDateString('vi-VN')})`;
        if (timeframe === 'quarter') return `Quý ${Math.ceil(month / 3)}/${year}`;
        return 'Toàn bộ thời gian';
    }, [timeframe]);

    // Fetch recent posts & shortlinks for the report
    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoadingPosts(true);

        const query = { ...scope };
        if (brandId && brandId !== 'all') {
            query.brand_id = brandId;
        }

        Promise.all([
            appClient.entities.Post.filter(query, { sort: '-created_at', limit: 12 }).catch(() => ({ items: [] })),
            appClient.links?.list
                ? appClient.links.list(brandId && brandId !== 'all' ? { brand_id: brandId } : {}).catch(() => ({ links: [] }))
                : Promise.resolve({ links: [] }),
        ])
            .then(([postsRes, linksRes]) => {
                if (!active) return;
                setRecentPosts(postsRes.items || []);
                const links = linksRes?.links || [];
                setShortlinksCount(links.length);
                const totalClicks = links.reduce((sum, l) => sum + (Number(l.clicks) || Number(l.total_clicks) || 0), 0);
                setShortlinksClicks(totalClicks);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoadingPosts(false);
            });

        return () => {
            active = false;
        };
    }, [open, brandId, scope]);

    // Metrics calculations
    const totalPosts = Object.values(analyticsData?.postStatus || {}).reduce((sum, v) => sum + v, 0);
    const publishedPosts = analyticsData?.postStatus?.published || 0;
    const scheduledPosts = analyticsData?.postStatus?.scheduled || 0;
    const totalJobs = Object.values(analyticsData?.jobStatus || {}).reduce((sum, v) => sum + v, 0);
    const attempted = publishedPosts + (analyticsData?.jobStatus?.failed || 0) + (analyticsData?.jobStatus?.blocked || 0);
    const successRate = attempted ? percent(publishedPosts, attempted) : 100;

    const channelData = useMemo(() => {
        if (!analyticsData?.accounts) return [];
        return analyticsData.accounts.map((acc) => ({
            name: acc.name,
            platform: acc.platform,
            jobs: analyticsData.perAccount?.[acc.id] || 0,
            followers: acc.followers || 0,
            status: acc.connection_status || 'connected',
        }));
    }, [analyticsData]);

    const pillarTotals = (analyticsData?.pillarRows || []).reduce((sum, r) => sum + r.count, 0);
    const pillarData = useMemo(() => {
        if (!analyticsData?.pillarRows) return [];
        return analyticsData.pillarRows.map((row) => {
            const meta = analyticsData.pillarMetaMap?.[row.pillar_id];
            const name = analyticsData.pillarMap?.[row.pillar_id] || meta?.name || 'Chưa phân loại';
            const share = pillarTotals > 0 ? percent(row.count, pillarTotals) : 0;
            return {
                id: row.pillar_id,
                name,
                count: row.count,
                share,
                target: meta?.target_percentage || 0,
                color: meta?.color || '#ffd631',
            };
        });
    }, [analyticsData, pillarTotals]);

    // CSV Generator
    const handleDownloadCsv = () => {
        const BOM = '\uFEFF';
        let csv = BOM;

        csv += `BÁO CÁO HIỆU QUẢ TRUYỀN THÔNG & NỘI DUNG ĐA KÊNH\n`;
        csv += `Tiêu đề,"${reportTitle.replace(/"/g, '""')}"\n`;
        csv += `Thương hiệu,"${brandName.replace(/"/g, '""')}"\n`;
        csv += `Kỳ báo cáo,"${timeframeLabel}"\n`;
        csv += `Thời gian xuất,"${new Date().toLocaleString('vi-VN')}"\n`;
        csv += `Người lập báo cáo,"${preparedBy.replace(/"/g, '""')}"\n\n`;

        csv += `I. CHỈ SỐ TỔNG HỢP (KPIS)\n`;
        csv += `Chỉ số,Giá trị,Ghi chú\n`;
        csv += `Tổng bài viết nội dung,${totalPosts},Bài viết được lập trong không gian làm việc\n`;
        csv += `Bài đã xuất bản,${publishedPosts},Đã xác nhận xuất bản trên các mạng xã hội\n`;
        csv += `Bài chờ đăng,${scheduledPosts},Đang trong lịch phát sóng tự động\n`;
        csv += `Tổng tác vụ xuất bản kênh,${totalJobs},Tổng số lượt phát hành trên các kênh đích\n`;
        csv += `Tỷ lệ phân phối thành công,${successRate}%,Tỷ lệ gửi bài thành công không bị gián đoạn\n`;
        csv += `Lượt nhấp liên kết (UTM Clicks),${shortlinksClicks},Tổng lượt truy cập đo lường qua hệ thống shortlink\n\n`;

        csv += `II. CHI TIẾT KÊNH PHÂN PHỐI MẠNG XÃ HỘI\n`;
        csv += `Tên tài khoản / Trang,Mạng xã hội,Người theo dõi,Số bài xuất bản,Trạng thái\n`;
        channelData.forEach((acc) => {
            csv += `"${acc.name}","${acc.platform}",${acc.followers},${acc.jobs},"${acc.status}"\n`;
        });
        csv += `\n`;

        csv += `III. PHÂN BỔ TRỤ CỘT NỘI DUNG\n`;
        csv += `Trụ cột nội dung,Số bài viết,Tỷ trọng thực tế (%),Mục tiêu đề ra (%)\n`;
        pillarData.forEach((p) => {
            csv += `"${p.name}",${p.count},${p.share}%,${p.target}%\n`;
        });
        csv += `\n`;

        if (recentPosts.length) {
            csv += `IV. DANH SÁCH BÀI VIẾT NỔI BẬT\n`;
            csv += `Tiêu đề / Nội dung,Trạng thái,Thời gian lên lịch,Kênh phân phối\n`;
            recentPosts.forEach((post) => {
                const cleanContent = (post.title || post.caption || '').replace(/\r?\n/g, ' ').slice(0, 100);
                csv += `"${cleanContent.replace(/"/g, '""')}","${post.status}","${post.scheduled_at || post.created_at || ''}","${(post.account_ids || []).length} kênh"\n`;
            });
            csv += `\n`;
        }

        csv += `V. GHI CHÚ ĐIỀU HÀNH & ĐỀ XUẤT\n`;
        csv += `"${executiveNotes.replace(/"/g, '""')}"\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SocialChoice_Report_${brandName.replace(/\s+/g, '_')}_${timeframe}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Direct PDF Generation & Download
    const handleDownloadPdf = async () => {
        const element = reportRef.current || document.getElementById('printable-report');
        if (!element) {
            toast({
                variant: 'destructive',
                title: t('Không tìm thấy nội dung báo cáo'),
                description: t('Vui lòng thử mở lại hộp thoại xuất báo cáo.'),
            });
            return;
        }

        setIsExportingPdf(true);
        try {
            const dataUrl = await toPng(element, {
                quality: 0.98,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: true,
            });

            const img = new Image();
            img.src = dataUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);
            const contentHeight = (img.height * contentWidth) / img.width;

            let heightLeft = contentHeight;
            let position = margin;

            pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
            heightLeft -= (pageHeight - (margin * 2));

            while (heightLeft > 0) {
                position = heightLeft - contentHeight + margin;
                pdf.addPage();
                pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
                heightLeft -= (pageHeight - (margin * 2));
            }

            const cleanBrandName = brandName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'Workspace';
            const cleanFileName = `BaoCao_${cleanBrandName}_${timeframe}_${Date.now()}.pdf`;
            pdf.save(cleanFileName);

            toast({
                title: t('Đã tải xuống file PDF!'),
                description: t(`File ${cleanFileName} đã được lưu về máy của bạn.`),
            });
        } catch (err) {
            console.error('PDF export error:', err);
            toast({
                variant: 'destructive',
                title: t('Không thể lưu file PDF'),
                description: t(err?.message || 'Vui lòng thử lại.'),
            });
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden flex flex-col rounded-3xl bg-card border border-border shadow-2xl">
                {/* Dialog Header */}
                <DialogHeader className="p-5 px-6 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-ink font-bold shadow-xs">
                            <FilePdf size={22} weight="bold" />
                        </span>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                {t('Xuất Báo Cáo Hiệu Quả Đa Kênh')}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {t('Tạo file PDF chuẩn in ấn và bảng tính CSV dành cho khách hàng hoặc báo cáo nội bộ.')}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={previewMode ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 text-xs gap-1.5 cursor-pointer ${
                                previewMode ? 'bg-brand text-brand-ink font-semibold border-brand-dark' : ''
                            }`}
                            onClick={() => setPreviewMode(!previewMode)}
                        >
                            <Eye size={14} weight="bold" />
                            <span>{previewMode ? t('Chỉnh sửa cấu hình') : t('Xem trước trang in')}</span>
                        </Button>
                    </div>
                </DialogHeader>

                {/* Dialog Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {!previewMode ? (
                        /* CONFIGURATION FORM */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs font-semibold text-foreground">
                                        {t('Tiêu đề báo cáo')}
                                    </Label>
                                    <Input
                                        value={reportTitle}
                                        onChange={(e) => setReportTitle(e.target.value)}
                                        placeholder="Ví dụ: Báo cáo Hiệu quả Marketing Tháng 11"
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-foreground">
                                            {t('Thương hiệu')}
                                        </Label>
                                        <select
                                            value={brandId}
                                            onChange={(e) => setBrandId(e.target.value)}
                                            className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="all">{t('Tất cả thương hiệu')}</option>
                                            {brands.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs font-semibold text-foreground">
                                            {t('Kỳ báo cáo')}
                                        </Label>
                                        <select
                                            value={timeframe}
                                            onChange={(e) => setTimeframe(e.target.value)}
                                            className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="month">{t('Tháng này')}</option>
                                            <option value="30days">{t('30 ngày gần nhất')}</option>
                                            <option value="quarter">{t('Quý này')}</option>
                                            <option value="all">{t('Toàn bộ thời gian')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold text-foreground">
                                        {t('Đơn vị / Người lập báo cáo')}
                                    </Label>
                                    <Input
                                        value={preparedBy}
                                        onChange={(e) => setPreparedBy(e.target.value)}
                                        placeholder="Tên cá nhân hoặc Agency thực hiện"
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs font-semibold text-foreground">
                                        {t('Ghi chú điều hành & Đánh giá chiến lược')}
                                    </Label>
                                    <textarea
                                        value={executiveNotes}
                                        onChange={(e) => setExecutiveNotes(e.target.value)}
                                        rows={5}
                                        placeholder="Nhận xét tóm tắt tình hình phân phối nội dung và khuyến nghị cho khách hàng..."
                                        className="mt-1 w-full rounded-lg border border-input bg-card p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                                    />
                                </div>

                                <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                                        <Sparkle size={14} weight="fill" />
                                        <span>{t('Mẹo xuất báo cáo cho Khách hàng & Sếp')}</span>
                                    </div>
                                    <p className="text-[11.5px] text-amber-800 leading-relaxed">
                                        File PDF sẽ tự động tổng hợp đầy đủ số lượng bài viết, tỷ lệ đăng thành công, hiệu quả từng fanpage/kênh và phân bổ trụ cột nội dung theo format chuẩn in ấn A4.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* PRINTABLE / PREVIEW DOCUMENT */}
                    <div className="block">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>{t('Bản xem trước trang in (A4 Preview)')}</span>
                            <span className="text-[11px] font-mono lowercase">{timeframeLabel}</span>
                        </div>

                        <div
                            id="printable-report"
                            ref={reportRef}
                            className="bg-white text-zinc-900 p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6 font-sans text-xs"
                        >
                            {/* Report Header */}
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black font-heading text-lg tracking-tight text-zinc-950">
                                            Social<span className="text-amber-500">Choice</span>
                                        </span>
                                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 uppercase">
                                            Performance Report
                                        </span>
                                    </div>
                                    <h1 className="text-xl font-bold font-heading text-zinc-900 mt-2">
                                        {reportTitle}
                                    </h1>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Thương hiệu: <strong className="text-zinc-800">{brandName}</strong> · Kỳ: <strong className="text-zinc-800">{timeframeLabel}</strong>
                                    </p>
                                </div>

                                <div className="text-right text-[11px] text-zinc-500 space-y-0.5">
                                    <p>Ngày tạo: <span className="font-semibold text-zinc-800">{new Date().toLocaleDateString('vi-VN')}</span></p>
                                    <p>Người lập: <span className="font-semibold text-zinc-800">{preparedBy}</span></p>
                                    <p>Múi giờ: <span className="font-mono text-zinc-600">{timezone}</span></p>
                                </div>
                            </div>

                            {/* Executive Summary */}
                            {executiveNotes && (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                        Tóm tắt điều hành & Nhận xét
                                    </div>
                                    <p className="text-xs text-zinc-800 leading-relaxed italic">
                                        "{executiveNotes}"
                                    </p>
                                </div>
                            )}

                            {/* KPI Bento Grid */}
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                                    I. Chỉ số thực thi & Hiệu quả chính (KPIs)
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-zinc-200 p-3 bg-white">
                                        <div className="text-[10px] text-zinc-500 font-medium">Tổng bài viết tạo</div>
                                        <div className="text-xl font-bold text-zinc-900 mt-1">{totalPosts}</div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">{totalJobs} tác vụ phân phối</div>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 p-3 bg-white">
                                        <div className="text-[10px] text-zinc-500 font-medium">Đã xuất bản thành công</div>
                                        <div className="text-xl font-bold text-emerald-600 mt-1">{publishedPosts}</div>
                                        <div className="text-[10px] text-emerald-700 mt-0.5">Xác nhận trên kênh</div>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 p-3 bg-white">
                                        <div className="text-[10px] text-zinc-500 font-medium">Tỷ lệ thành công</div>
                                        <div className="text-xl font-bold text-zinc-900 mt-1">{successRate}%</div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">{scheduledPosts} bài chờ đăng</div>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 p-3 bg-white">
                                        <div className="text-[10px] text-zinc-500 font-medium">Lượt click link UTM</div>
                                        <div className="text-xl font-bold text-amber-600 mt-1">{shortlinksClicks}</div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">{shortlinksCount} link theo dõi</div>
                                    </div>
                                </div>
                            </div>

                            {/* Channel Performance Table */}
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                                    II. Bảng kênh phân phối mạng xã hội
                                </div>
                                <div className="overflow-hidden rounded-xl border border-zinc-200">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500">
                                                <th className="py-2 px-3">Tài khoản / Trang</th>
                                                <th className="py-2 px-3">Mạng xã hội</th>
                                                <th className="py-2 px-3 text-right">Người theo dõi</th>
                                                <th className="py-2 px-3 text-right">Bài xuất bản</th>
                                                <th className="py-2 px-3 text-right">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {channelData.length > 0 ? (
                                                channelData.map((c, i) => (
                                                    <tr key={i} className="hover:bg-zinc-50/50">
                                                        <td className="py-2 px-3 font-semibold text-zinc-900">{c.name}</td>
                                                        <td className="py-2 px-3 capitalize text-zinc-600">{c.platform}</td>
                                                        <td className="py-2 px-3 text-right text-zinc-700">
                                                            {c.followers > 0 ? formatNumber(c.followers) : '—'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-bold text-zinc-900">{c.jobs}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold">
                                                                Hoạt động
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="py-3 text-center text-zinc-400">
                                                        Chưa có kênh phân phối nào được kết nối
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pillar Concentration */}
                            {pillarData.length > 0 && (
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                                        III. Tỷ trọng phân bổ Trụ cột nội dung
                                    </div>
                                    <div className="space-y-2">
                                        {pillarData.map((p) => (
                                            <div key={p.id} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="size-2 rounded-full"
                                                            style={{ backgroundColor: p.color }}
                                                        />
                                                        <span className="font-semibold text-zinc-800">{p.name}</span>
                                                        {p.target > 0 && (
                                                            <span className="text-[10px] text-zinc-400">
                                                                (Mục tiêu: {p.target}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-zinc-700">
                                                        {p.count} bài ({p.share}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.max(4, p.share)}%`,
                                                            backgroundColor: p.color,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Posts Highlight */}
                            {recentPosts.length > 0 && (
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                                        IV. Danh sách bài viết tiêu biểu
                                    </div>
                                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 overflow-hidden">
                                        {recentPosts.slice(0, 6).map((post) => (
                                            <div key={post.id} className="p-2.5 flex items-center justify-between gap-3 bg-white">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-zinc-900 truncate">
                                                        {post.title || post.caption || 'Bài viết không tên'}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                                        {post.scheduled_at ? formatCalendarDate(post.scheduled_at) : 'Bản nháp'} · {(post.account_ids || []).length} kênh phân phối
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                    post.status === 'published'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : post.status === 'scheduled'
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        : 'bg-zinc-100 text-zinc-600'
                                                }`}>
                                                    {post.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400">
                                <span>Tạo tự động bởi SocialChoice Studio · Nền tảng phân phối & tối ưu nội dung đa kênh</span>
                                <span>Trang 1 / 1</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dialog Footer Actions */}
                <div className="p-4 px-6 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3">
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                        {t('Đóng')}
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCsv}
                            className="text-xs gap-1.5 cursor-pointer hover:bg-muted"
                        >
                            <FileCsv size={15} weight="bold" className="text-emerald-600" />
                            <span>{t('Tải file Excel / CSV')}</span>
                        </Button>

                        <button
                            type="button"
                            disabled={isExportingPdf}
                            onClick={handleDownloadPdf}
                            className="btn-skew flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-60"
                        >
                            {isExportingPdf ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>{t('Đang lưu PDF...')}</span>
                                </>
                            ) : (
                                <>
                                    <DownloadSimple size={15} weight="bold" />
                                    <span>{t('Lưu file PDF')}</span>
                                </>
                            )}
                        </button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.print()}
                            title={t('In trực tiếp ra máy in')}
                            className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <Printer size={15} />
                        </Button>
                    </div>
                </div>

                {/* Print Styling - Injects cleanly when window.print() is called */}
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #printable-report, #printable-report * {
                            visibility: visible !important;
                        }
                        #printable-report {
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100vw !important;
                            min-height: 100vh !important;
                            margin: 0 !important;
                            padding: 12mm 16mm !important;
                            background: #ffffff !important;
                            color: #18181b !important;
                            box-shadow: none !important;
                            border: none !important;
                            z-index: 999999 !important;
                        }
                        @page {
                            size: A4 portrait;
                            margin: 8mm;
                        }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}
