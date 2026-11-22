import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowsClockwise,
    Check,
    DownloadSimple,
    Eye,
    FloppyDisk,
    ImageSquare,
    NotePencil,
    ShieldCheck,
    TextT,
    UploadSimple,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { appClient } from '@/api/app-client';

const POSITIONS = [
    { id: 'top-left', label: 'Trên - Trái', x: 0.05, y: 0.05, align: 'left', baseline: 'top' },
    { id: 'top-center', label: 'Trên - Giữa', x: 0.5, y: 0.05, align: 'center', baseline: 'top' },
    { id: 'top-right', label: 'Trên - Phải', x: 0.95, y: 0.05, align: 'right', baseline: 'top' },
    { id: 'middle-left', label: 'Giữa - Trái', x: 0.05, y: 0.5, align: 'left', baseline: 'middle' },
    { id: 'center', label: 'Chính tâm', x: 0.5, y: 0.5, align: 'center', baseline: 'middle' },
    { id: 'middle-right', label: 'Giữa - Phải', x: 0.95, y: 0.5, align: 'right', baseline: 'middle' },
    { id: 'bottom-left', label: 'Dưới - Trái', x: 0.05, y: 0.95, align: 'left', baseline: 'bottom' },
    { id: 'bottom-center', label: 'Dưới - Giữa', x: 0.5, y: 0.95, align: 'center', baseline: 'bottom' },
    { id: 'bottom-right', label: 'Dưới - Phải', x: 0.95, y: 0.95, align: 'right', baseline: 'bottom' },
];

const TEXT_SWATCHES = [
    { code: '#ffffff', label: 'Trắng', ink: '#18181b' },
    { code: '#18181b', label: 'Đen', ink: '#ffffff' },
    { code: '#ffd631', label: 'Vàng', ink: '#2b2100' },
    { code: '#1877f2', label: 'Xanh dương', ink: '#ffffff' },
    { code: '#e11d48', label: 'Đỏ', ink: '#ffffff' },
];

export default function WatermarkTool() {
    const { t } = useTranslation();
    const { brands, selectedBrandId } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);

    const [mainImage, setMainImage] = useState(null);
    const [mainImageName, setMainImageName] = useState('image.jpg');
    const [isSample, setIsSample] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'logo'

    // Text watermark settings
    const currentBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
    const [watermarkText, setWatermarkText] = useState(() =>
        currentBrand ? `© ${currentBrand.name} · socialchoice.site` : '© Socialchoice'
    );
    const [textColor, setTextColor] = useState('#ffffff');
    const [fontSizePercent, setFontSizePercent] = useState(4);
    const [withBackground, setWithBackground] = useState(true);

    // Logo watermark settings
    const [logoImage, setLogoImage] = useState(null);
    const [logoSizePercent, setLogoSizePercent] = useState(16);

    // Position & Opacity
    const [position, setPosition] = useState('bottom-right');
    const [opacity, setOpacity] = useState(85);
    const [isTiled, setIsTiled] = useState(false);
    const [busy, setBusy] = useState(false);

    // Interactive sample image
    const loadSampleImage = useCallback(() => {
        const offscreen = document.createElement('canvas');
        offscreen.width = 1200;
        offscreen.height = 675;
        const ctx = offscreen.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 1200, 675);
        grad.addColorStop(0, '#18181b');
        grad.addColorStop(0.55, '#27272a');
        grad.addColorStop(1, '#18181b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, 675);

        ctx.save();
        ctx.fillStyle = '#ffd631';
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        ctx.arc(1020, 160, 260, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 1200; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 675);
            ctx.stroke();
        }
        for (let y = 0; y < 675; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1200, y);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ffd631';
        ctx.beginPath();
        ctx.roundRect(90, 185, 210, 34, 10);
        ctx.fill();
        ctx.fillStyle = '#2b2100';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('SOCIALCHOICE STUDIO', 112, 207);
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 46px sans-serif';
        ctx.fillText('Bảo vệ bản quyền hình ảnh', 90, 280);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = 'normal 21px sans-serif';
        ctx.fillText('Đóng dấu chữ hoặc logo thương hiệu trước khi xuất bản đa kênh', 90, 326);

        const img = new Image();
        img.onload = () => {
            setMainImage(img);
            setMainImageName('socialchoice_demo_banner.png');
            setIsSample(true);
        };
        img.src = offscreen.toDataURL('image/png');
    }, []);

    useEffect(() => {
        loadSampleImage();
    }, [loadSampleImage]);

    // Render Canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !mainImage) return;

        const ctx = canvas.getContext('2d');
        canvas.width = mainImage.width;
        canvas.height = mainImage.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(mainImage, 0, 0);

        if (showOriginal) return;

        ctx.globalAlpha = opacity / 100;

        if (isTiled) {
            ctx.save();
            ctx.rotate((-30 * Math.PI) / 180);
            ctx.fillStyle = textColor;
            const stepX = canvas.width * 0.35;
            const stepY = canvas.height * 0.25;
            const fontSize = Math.max(16, canvas.width * (fontSizePercent / 100));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
                for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
                    if (watermarkType === 'logo' && logoImage) {
                        const lw = canvas.width * (logoSizePercent / 100);
                        const lh = (logoImage.height / logoImage.width) * lw;
                        ctx.drawImage(logoImage, x - lw / 2, y - lh / 2, lw, lh);
                    } else {
                        ctx.fillText(watermarkText, x, y);
                    }
                }
            }
            ctx.restore();
        } else {
            const pos = POSITIONS.find((p) => p.id === position) || POSITIONS[8];
            const px = pos.x * canvas.width;
            const py = pos.y * canvas.height;

            if (watermarkType === 'text') {
                const fontSize = Math.max(14, Math.round(canvas.width * (fontSizePercent / 100)));
                ctx.font = `bold ${fontSize}px Space Grotesk, sans-serif`;
                ctx.textAlign = pos.align;
                ctx.textBaseline = pos.baseline;

                const textWidth = ctx.measureText(watermarkText).width;
                const textHeight = fontSize * 1.2;

                if (withBackground) {
                    ctx.save();
                    ctx.globalAlpha = (opacity / 100) * 0.7;
                    ctx.fillStyle = '#000000';
                    const padX = fontSize * 0.6;
                    const padY = fontSize * 0.3;
                    let bgX = px - padX;
                    if (pos.align === 'center') bgX = px - textWidth / 2 - padX;
                    else if (pos.align === 'right') bgX = px - textWidth - padX;

                    let bgY = py - padY;
                    if (pos.baseline === 'middle') bgY = py - textHeight / 2 - padY;
                    else if (pos.baseline === 'bottom') bgY = py - textHeight - padY;

                    ctx.beginPath();
                    ctx.roundRect(bgX, bgY, textWidth + padX * 2, textHeight + padY * 2, 8);
                    ctx.fill();
                    ctx.restore();
                }

                ctx.shadowColor = 'rgba(0,0,0,0.65)';
                ctx.shadowBlur = 6;
                ctx.fillStyle = textColor;
                ctx.fillText(watermarkText, px, py);
            } else if (watermarkType === 'logo' && logoImage) {
                const logoW = Math.max(40, canvas.width * (logoSizePercent / 100));
                const logoH = (logoImage.height / logoImage.width) * logoW;

                let drawX = px;
                if (pos.align === 'center') drawX = px - logoW / 2;
                else if (pos.align === 'right') drawX = px - logoW;

                let drawY = py;
                if (pos.baseline === 'middle') drawY = py - logoH / 2;
                else if (pos.baseline === 'bottom') drawY = py - logoH;

                ctx.shadowColor = 'rgba(0,0,0,0.45)';
                ctx.shadowBlur = 8;
                ctx.drawImage(logoImage, drawX, drawY, logoW, logoH);
            }
        }

        ctx.globalAlpha = 1.0;
    }, [
        mainImage,
        showOriginal,
        watermarkType,
        watermarkText,
        textColor,
        fontSizePercent,
        withBackground,
        logoImage,
        logoSizePercent,
        position,
        opacity,
        isTiled,
    ]);

    useEffect(() => {
        renderCanvas();
    }, [renderCanvas]);

    const handleMainFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)') });
            return;
        }
        setMainImageName(file.name);
        setIsSample(false);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => setMainImage(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleLogoFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast({
                variant: 'destructive',
                title: t('Vui lòng chọn file logo (khuyên dùng PNG nền trong suốt)'),
            });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setLogoImage(img);
                setWatermarkType('logo');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleMainFile(file);
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `watermarked_${mainImageName}`;
        link.href = canvas.toDataURL('image/png', 0.95);
        link.click();
        toast({ title: t('Đã tải ảnh đóng dấu bản quyền thành công!') });
    };

    const handleSaveToMedia = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setBusy(true);
        try {
            await new Promise((resolve, reject) => {
                canvas.toBlob(
                    async (blob) => {
                        try {
                            if (!blob) throw new Error('Không thể xuất ảnh từ canvas.');
                            const file = new File([blob], `wm_${mainImageName}`, { type: 'image/png' });
                            const brandId = selectedBrandId === 'all' ? brands[0]?.id : selectedBrandId;
                            await appClient.media.upload(file, { brand_id: brandId });
                            toast({
                                title: t('Đã lưu vào Thư viện Media!'),
                                description: t('Ảnh đã sẵn sàng để chèn vào bài viết trong Studio.'),
                            });
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    },
                    'image/png',
                    0.95
                );
            });
        } catch (err) {
            toast({ variant: 'destructive', title: t('Lưu ảnh thất bại'), description: err.message });
        } finally {
            setBusy(false);
        }
    };

    const handleCreatePostWithImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setBusy(true);
        canvas.toBlob(async (blob) => {
            if (!blob) {
                setBusy(false);
                return;
            }
            const file = new File([blob], `wm_${mainImageName}`, { type: 'image/png' });
            const brandId = selectedBrandId === 'all' ? brands[0]?.id : selectedBrandId;
            try {
                await appClient.media.upload(file, { brand_id: brandId });
                toast({ title: t('Đang chuyển sang Studio soạn bài...') });
            } finally {
                setBusy(false);
                navigate('/create');
            }
        });
    };

    return (
        <section className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] lg:h-[calc(100vh-196px)] lg:min-h-[520px] lg:max-h-[680px]">
            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleMainFile(e.target.files?.[0])}
                className="hidden"
            />
            <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoFile(e.target.files?.[0])}
                className="hidden"
            />

            {/* LEFT PANE: Unified Clean Canvas Stage */}
            <div className="min-w-0 min-h-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200/80">
                {/* Canvas Top Bar */}
                <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[12.5px] font-medium text-zinc-900 truncate max-w-[200px]">
                            {mainImageName}
                        </span>
                        {mainImage ? (
                            <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                                {mainImage.width}×{mainImage.height}px
                            </span>
                        ) : null}
                        {isSample ? (
                            <span className="px-2 py-0.5 rounded bg-[#ffd631]/25 border border-[#d8b216]/60 text-[10.5px] font-medium text-[#2b2100] shrink-0">
                                {t('Ảnh mẫu')}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 text-[12px] font-medium text-zinc-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <UploadSimple size={14} />
                            <span>{t('Chọn ảnh khác')}</span>
                        </button>

                        {!isSample ? (
                            <button
                                type="button"
                                onClick={loadSampleImage}
                                title={t('Dùng lại ảnh mẫu')}
                                aria-label={t('Dùng lại ảnh mẫu')}
                                className="h-8 w-8 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 inline-flex items-center justify-center cursor-pointer"
                            >
                                <ArrowsClockwise size={14} />
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Interactive Drop & Preview Stage */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative flex-1 min-h-0 p-4 flex items-center justify-center overflow-hidden transition-colors ${
                        isDragging ? 'bg-[#ffd631]/10' : 'bg-zinc-50/80'
                    }`}
                >
                    {/* Subtle Light Checkerboard Dot Grid */}
                    <div
                        className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"
                        aria-hidden="true"
                    />

                    {isDragging ? (
                        <div className="absolute inset-4 rounded-xl border-2 border-dashed border-[#d8b216] bg-white/80 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none">
                            <UploadSimple size={28} weight="duotone" className="text-[#2b2100]" />
                            <span className="text-[13.5px] font-medium text-[#2b2100]">
                                {t('Thả ảnh vào đây để đóng dấu bản quyền')}
                            </span>
                        </div>
                    ) : null}

                    <canvas
                        ref={canvasRef}
                        className="relative z-10 max-w-full max-h-full object-contain rounded-xl border border-zinc-200/90 shadow-xs bg-white"
                    />
                </div>

                {/* Canvas Bottom Action Bar */}
                <div className="px-4 py-2.5 border-t border-zinc-100 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onMouseDown={() => setShowOriginal(true)}
                            onMouseUp={() => setShowOriginal(false)}
                            onMouseLeave={() => setShowOriginal(false)}
                            onTouchStart={() => setShowOriginal(true)}
                            onTouchEnd={() => setShowOriginal(false)}
                            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-medium text-zinc-600 inline-flex items-center gap-1.5 select-none cursor-pointer"
                        >
                            <Eye size={14} />
                            <span>{showOriginal ? t('Đang xem ảnh gốc') : t('Giữ để so sánh gốc')}</span>
                        </button>

                        <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <ShieldCheck size={13} className="text-emerald-600" />
                            <span>{t('Xử lý cục bộ trên trình duyệt')}</span>
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            disabled={busy || !mainImage}
                            onClick={handleSaveToMedia}
                            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[12px] font-medium text-zinc-700 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                            <FloppyDisk size={14} weight="duotone" />
                            <span>{t('Lưu vào Media')}</span>
                        </button>

                        <button
                            type="button"
                            disabled={busy || !mainImage}
                            onClick={handleCreatePostWithImage}
                            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/20 text-[12px] font-medium text-zinc-800 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                            <NotePencil size={14} weight="duotone" />
                            <span>{t('Soạn bài')}</span>
                        </button>

                        <button
                            type="button"
                            disabled={!mainImage}
                            onClick={handleDownload}
                            className="btn-skew !h-8 !py-0 !px-3.5"
                        >
                            <DownloadSimple size={14} weight="duotone" />
                            <span>{t('Tải về máy')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: Unified Compact Inspector Controls (Fits 100% without page scroll) */}
            <aside className="bg-zinc-50/35 divide-y divide-zinc-200/70 flex flex-col justify-between overflow-y-auto scrollbar-clean">
                {/* Section 1: Watermark Type & Content */}
                <div className="p-4 space-y-3">
                    <h2 className="font-heading text-[13px] font-medium text-zinc-900">
                        {t('Nội dung dấu bản quyền')}
                    </h2>

                    {/* Text / Logo Segmented Toggle */}
                    <div className="grid grid-cols-2 p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                        <button
                            type="button"
                            onClick={() => setWatermarkType('text')}
                            className={`h-7 rounded-md text-[12px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                watermarkType === 'text'
                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <TextT size={13} weight="bold" />
                            <span>{t('Văn bản')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setWatermarkType('logo')}
                            className={`h-7 rounded-md text-[12px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                watermarkType === 'logo'
                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <ImageSquare size={13} weight="bold" />
                            <span>{t('Logo PNG')}</span>
                        </button>
                    </div>

                    {watermarkType === 'text' ? (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label htmlFor="wm-text" className="label-xs block text-zinc-600 font-medium">
                                    {t('Chữ đóng dấu')}
                                </label>
                                <input
                                    id="wm-text"
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    placeholder="© Tên Brand · Hotline..."
                                    className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-[12.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                />
                            </div>

                            {/* Color Swatches */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="label-xs text-zinc-600 font-medium">{t('Màu chữ')}</span>
                                <div className="flex items-center gap-1.5">
                                    {TEXT_SWATCHES.map((c) => {
                                        const active = textColor === c.code;
                                        return (
                                            <button
                                                key={c.code}
                                                type="button"
                                                title={c.label}
                                                aria-label={c.label}
                                                onClick={() => setTextColor(c.code)}
                                                style={{ backgroundColor: c.code }}
                                                className={`h-6 w-6 rounded-md border flex items-center justify-center transition-transform cursor-pointer ${
                                                    active
                                                        ? 'scale-110 ring-2 ring-zinc-900/20 border-zinc-900/40'
                                                        : 'border-zinc-300 hover:scale-105'
                                                }`}
                                            >
                                                {active ? (
                                                    <Check size={12} weight="bold" style={{ color: c.ink }} />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Font Size */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-zinc-600 font-medium">{t('Cỡ chữ')}</span>
                                    <span className="font-mono text-zinc-900 tabular-nums">
                                        {fontSizePercent}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="10"
                                    step="0.5"
                                    value={fontSizePercent}
                                    onChange={(e) => setFontSizePercent(Number(e.target.value))}
                                    className="w-full accent-[#d8b216] cursor-pointer"
                                />
                            </div>

                            {/* Background Pill Toggle */}
                            <label className="flex items-center gap-2 text-[12px] text-zinc-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={withBackground}
                                    onChange={(e) => setWithBackground(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-zinc-300 accent-[#d8b216] cursor-pointer"
                                />
                                <span>{t('Khung nền mờ chống chìm chữ')}</span>
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logoImage ? (
                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white text-[12px]">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="font-medium text-zinc-800 truncate">
                                            Logo ({logoImage.width}×{logoImage.height})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        className="text-[11.5px] font-medium text-zinc-600 hover:text-zinc-900 underline cursor-pointer shrink-0"
                                    >
                                        {t('Đổi logo')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="w-full p-3.5 rounded-xl border border-dashed border-zinc-300 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/10 text-[12px] font-medium text-zinc-700 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                                >
                                    <UploadSimple size={16} className="text-zinc-400" />
                                    <span>{t('Tải logo PNG trong suốt')}</span>
                                </button>
                            )}

                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-zinc-600 font-medium">{t('Kích thước logo')}</span>
                                    <span className="font-mono text-zinc-900 tabular-nums">
                                        {logoSizePercent}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="40"
                                    step="1"
                                    value={logoSizePercent}
                                    onChange={(e) => setLogoSizePercent(Number(e.target.value))}
                                    className="w-full accent-[#d8b216] cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 2: Placement & Tiling */}
                <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-heading text-[13px] font-medium text-zinc-900">
                            {t('Vị trí đặt dấu')}
                        </h2>
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setIsTiled(false)}
                                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                    !isTiled ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
                                }`}
                            >
                                {t('1 góc')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsTiled(true)}
                                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                    isTiled ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
                                }`}
                            >
                                {t('Phủ chéo')}
                            </button>
                        </div>
                    </div>

                    {!isTiled ? (
                        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-white border border-zinc-200/80">
                            {POSITIONS.map((p) => {
                                const active = position === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        title={p.label}
                                        aria-label={p.label}
                                        onClick={() => setPosition(p.id)}
                                        className={`h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                            active
                                                ? 'bg-[#ffd631]/35 border-[#d8b216]'
                                                : 'bg-zinc-50/70 border-zinc-200/60 hover:bg-zinc-100'
                                        }`}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                active ? 'bg-[#2b2100]' : 'bg-zinc-400'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="p-2.5 rounded-xl bg-[#ffd631]/15 border border-[#d8b216]/50 text-[11.5px] text-[#2b2100] leading-relaxed">
                            {t('Dấu bản quyền được lặp chéo phủ toàn bộ khung hình để chống cắt cúp.')}
                        </p>
                    )}
                </div>

                {/* Section 3: Opacity */}
                <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                        <h2 className="font-heading text-[13px] font-medium text-zinc-900">
                            {t('Độ rõ nét (Opacity)')}
                        </h2>
                        <span className="font-mono text-[12px] font-medium text-zinc-900 tabular-nums">
                            {opacity}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full accent-[#d8b216] cursor-pointer"
                    />
                </div>
            </aside>
        </section>
    );
}
