import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { appClient } from '@/api/app-client';
import { useNavigate } from 'react-router-dom';
import {
    UploadSimple,
    DownloadSimple,
    ImageSquare,
    Sparkle,
    TextT,
    ArrowUpRight,
    ArrowsClockwise,
    Trash,
    Check,
    FloppyDisk,
    PencilSimple,
    Crosshair,
    Eye,
    ShieldCheck,
} from '@phosphor-icons/react';

const POSITIONS = [
    { id: 'top-left', label: 'Trên - Trái', icon: '↖', x: 0.05, y: 0.05, align: 'left', baseline: 'top' },
    { id: 'top-center', label: 'Trên - Giữa', icon: '↑', x: 0.5, y: 0.05, align: 'center', baseline: 'top' },
    { id: 'top-right', label: 'Trên - Phải', icon: '↗', x: 0.95, y: 0.05, align: 'right', baseline: 'top' },
    { id: 'middle-left', label: 'Giữa - Trái', icon: '←', x: 0.05, y: 0.5, align: 'left', baseline: 'middle' },
    { id: 'center', label: 'Chính tâm', icon: '⏺', x: 0.5, y: 0.5, align: 'center', baseline: 'middle' },
    { id: 'middle-right', label: 'Giữa - Phải', icon: '→', x: 0.95, y: 0.5, align: 'right', baseline: 'middle' },
    { id: 'bottom-left', label: 'Dưới - Trái', icon: '↙', x: 0.05, y: 0.95, align: 'left', baseline: 'bottom' },
    { id: 'bottom-center', label: 'Dưới - Giữa', icon: '↓', x: 0.5, y: 0.95, align: 'center', baseline: 'bottom' },
    { id: 'bottom-right', label: 'Dưới - Phải', icon: '↘', x: 0.95, y: 0.95, align: 'right', baseline: 'bottom' },
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
    const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'logo'

    // Text watermark settings
    const currentBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
    const [watermarkText, setWatermarkText] = useState(() => currentBrand ? `© ${currentBrand.name} · socialchoice.site` : '© Socialchoice');
    const [textColor, setTextColor] = useState('#ffffff');
    const [fontSizePercent, setFontSizePercent] = useState(4); // 4% of image width
    const [withBackground, setWithBackground] = useState(true);

    // Logo watermark settings
    const [logoImage, setLogoImage] = useState(null);
    const [logoSizePercent, setLogoSizePercent] = useState(16); // 16% of image width

    // Position & Opacity settings
    const [position, setPosition] = useState('bottom-right');
    const [opacity, setOpacity] = useState(85); // 10% - 100%
    const [isTiled, setIsTiled] = useState(false); // Diagonal tiled watermark pattern
    const [busy, setBusy] = useState(false);

    // Load interactive sample image so canvas is never empty
    const loadSampleImage = useCallback(() => {
        const offscreen = document.createElement('canvas');
        offscreen.width = 1200;
        offscreen.height = 675; // 16:9 social landscape
        const ctx = offscreen.getContext('2d');

        // Dark gradient background
        const grad = ctx.createLinearGradient(0, 0, 1200, 675);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, 675);

        // Ambient glowing shapes
        ctx.save();
        ctx.fillStyle = '#ffd631';
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(1020, 160, 260, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.arc(180, 520, 200, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Subtle geometric grid
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 1200; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 675);
            ctx.stroke();
        }
        for (let y = 0; y < 675; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1200, y);
            ctx.stroke();
        }
        ctx.restore();

        // Badge pill
        ctx.save();
        ctx.fillStyle = '#ffd631';
        ctx.beginPath();
        ctx.roundRect(90, 180, 210, 36, 18);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('⚡ SOCIALCHOICE STUDIO', 110, 203);
        ctx.restore();

        // Title and description
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText('Bảo Vệ Bản Quyền Hình Ảnh', 90, 275);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'normal 21px sans-serif';
        ctx.fillText('Hệ thống tự động đóng dấu Watermark & Logo chuyên nghiệp đa kênh', 90, 325);

        // Convert to Image
        const img = new Image();
        img.onload = () => {
            setMainImage(img);
            setMainImageName('socialchoice_demo_banner.png');
            setIsSample(true);
        };
        img.src = offscreen.toDataURL('image/png');
    }, []);

    // Load sample image on initial mount
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

        // Draw background image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(mainImage, 0, 0);

        // Apply opacity
        ctx.globalAlpha = opacity / 100;

        if (isTiled) {
            // Tiled diagonal pattern
            ctx.save();
            ctx.rotate((-30 * Math.PI) / 180);
            ctx.fillStyle = textColor;
            const stepX = canvas.width * 0.35;
            const stepY = canvas.height * 0.25;
            const fontSize = Math.max(16, (canvas.width * (fontSizePercent / 100)));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const startX = -canvas.width;
            const endX = canvas.width * 2;
            const startY = -canvas.height;
            const endY = canvas.height * 2;

            for (let x = startX; x < endX; x += stepX) {
                for (let y = startY; y < endY; y += stepY) {
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
            // Single placed watermark
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
                    // Draw semi-transparent pill background for clarity
                    ctx.save();
                    ctx.globalAlpha = (opacity / 100) * 0.7;
                    ctx.fillStyle = '#000000';
                    const padX = fontSize * 0.6;
                    const padY = fontSize * 0.3;
                    let bgX = px;
                    if (pos.align === 'center') bgX = px - textWidth / 2 - padX;
                    else if (pos.align === 'right') bgX = px - textWidth - padX;
                    else bgX = px - padX;

                    let bgY = py;
                    if (pos.baseline === 'middle') bgY = py - textHeight / 2 - padY;
                    else if (pos.baseline === 'bottom') bgY = py - textHeight - padY;
                    else bgY = py - padY;

                    const bgW = textWidth + padX * 2;
                    const bgH = textHeight + padY * 2;
                    const r = 8;
                    ctx.beginPath();
                    ctx.roundRect(bgX, bgY, bgW, bgH, r);
                    ctx.fill();
                    ctx.restore();
                }

                // Shadow for contrast
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
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

                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 8;
                ctx.drawImage(logoImage, drawX, drawY, logoW, logoH);
            }
        }

        ctx.globalAlpha = 1.0;
    }, [
        mainImage,
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

    // Handle Upload Main Image
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
            img.onload = () => {
                setMainImage(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Handle Upload Watermark Logo
    const handleLogoFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn file logo (khuyên dùng PNG nền trong suốt)') });
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

    // Download Watermarked Image
    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `watermarked_${mainImageName}`;
        link.href = canvas.toDataURL('image/png', 0.95);
        link.click();
        toast({ title: t('Đã tải ảnh đóng dấu bản quyền thành công!') });
    };

    // Save to Media Library
    const handleSaveToMedia = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setBusy(true);
        try {
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Không thể xuất ảnh từ canvas.');
                const file = new File([blob], `wm_${mainImageName}`, { type: 'image/png' });
                const brandId = selectedBrandId === 'all' ? brands[0]?.id : selectedBrandId;
                await appClient.media.upload(file, { brand_id: brandId });
                toast({
                    title: t('Đã lưu vào Thư viện Media!'),
                    description: t('Ảnh đã sẵn sàng để chèn vào bài viết trong Studio.'),
                });
            }, 'image/png', 0.95);
        } catch (err) {
            toast({ variant: 'destructive', title: t('Lưu ảnh thất bại'), description: err.message });
        } finally {
            setBusy(false);
        }
    };

    // Create post with this image
    const handleCreatePostWithImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `wm_${mainImageName}`, { type: 'image/png' });
            const brandId = selectedBrandId === 'all' ? brands[0]?.id : selectedBrandId;
            try {
                await appClient.media.upload(file, { brand_id: brandId });
                toast({ title: t('Đang chuyển sang Studio soạn bài...') });
                navigate('/create');
            } catch (err) {
                navigate('/create');
            }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Controls Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
                {/* 1. Chọn ảnh gốc */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                            <ImageSquare size={16} weight="duotone" className="text-brand-dark" />
                            <span>{t('1. Chọn ảnh gốc cần đóng dấu')}</span>
                        </h3>
                        {isSample && (
                            <span className="rounded-md bg-brand/20 border border-brand-dark/30 px-2 py-0.5 text-[10px] font-bold text-brand-ink">
                                {t('Đang xem ảnh mẫu')}
                            </span>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMainFile(e.target.files[0])}
                        className="hidden"
                    />

                    {mainImage ? (
                        <div className="p-3 rounded-xl border border-border bg-surface/60 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 truncate">
                                    <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="font-semibold text-foreground truncate">{mainImageName}</span>
                                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                        ({mainImage.width}×{mainImage.height})
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-brand-dark bg-brand text-brand-ink text-xs font-bold hover:bg-[#ffe059] transition cursor-pointer"
                                >
                                    <UploadSimple size={14} weight="bold" />
                                    <span>{t('Tải ảnh của bạn lên')}</span>
                                </button>
                                {!isSample && (
                                    <button
                                        type="button"
                                        onClick={loadSampleImage}
                                        title={t('Tải lại ảnh mẫu')}
                                        className="py-1.5 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-medium transition cursor-pointer"
                                    >
                                        <ArrowsClockwise size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border hover:border-brand-dark hover:bg-brand/5 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
                        >
                            <div className="size-9 rounded-full bg-brand/20 text-brand-ink grid place-items-center">
                                <UploadSimple size={18} weight="bold" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                                {t('Tải ảnh từ máy tính')}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {t('Hỗ trợ JPG, PNG, WEBP lên đến 20MB')}
                            </span>
                        </div>
                    )}
                </div>

                {/* 2. Cấu hình nội dung & kiểu dáng */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Sparkle size={16} weight="duotone" className="text-brand-dark" />
                        <span>{t('2. Cấu hình nội dung & Kiểu dáng')}</span>
                    </h3>

                    {/* Mode Tabs: Text / Logo */}
                    <div className="grid grid-cols-2 p-1 rounded-xl bg-surface border border-border text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setWatermarkType('text')}
                            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                watermarkType === 'text'
                                    ? 'bg-card text-foreground shadow-2xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <TextT size={15} weight="bold" />
                            <span>{t('Văn bản')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setWatermarkType('logo')}
                            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                watermarkType === 'logo'
                                    ? 'bg-card text-foreground shadow-2xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ImageSquare size={15} weight="bold" />
                            <span>{t('Logo / Hình ảnh')}</span>
                        </button>
                    </div>

                    {watermarkType === 'text' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                                    {t('Nội dung bản quyền')}
                                </label>
                                <input
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    placeholder="© Tên Brand · Hotline..."
                                    className="w-full rounded-xl border border-border bg-surface/50 px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-brand-dark focus:bg-card transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 items-center">
                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">
                                        {t('Màu chữ')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {[
                                            { code: '#ffffff', label: 'Trắng' },
                                            { code: '#000000', label: 'Đen' },
                                            { code: '#ffd631', label: 'Vàng' },
                                            { code: '#1877f2', label: 'Xanh' },
                                        ].map((c) => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                title={c.label}
                                                onClick={() => setTextColor(c.code)}
                                                style={{ backgroundColor: c.code }}
                                                className={`size-6 rounded-full border cursor-pointer transition ${
                                                    textColor === c.code
                                                        ? 'ring-2 ring-brand-dark ring-offset-2 scale-110'
                                                        : 'border-border/80'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                                        <span>{t('Cỡ chữ')}</span>
                                        <span className="font-mono text-foreground">{fontSizePercent}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2"
                                        max="10"
                                        step="0.5"
                                        value={fontSizePercent}
                                        onChange={(e) => setFontSizePercent(Number(e.target.value))}
                                        className="w-full accent-brand cursor-pointer"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none pt-1">
                                <input
                                    type="checkbox"
                                    checked={withBackground}
                                    onChange={(e) => setWithBackground(e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-brand-dark focus:ring-brand-dark cursor-pointer"
                                />
                                <span>{t('Gắn khung nền bảo vệ chống chìm chữ')}</span>
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLogoFile(e.target.files[0])}
                                className="hidden"
                            />
                            {logoImage ? (
                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface/50 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-brand shrink-0" />
                                        <span className="font-semibold text-foreground">
                                            Logo ({logoImage.width}×{logoImage.height})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        className="text-[11px] font-bold text-brand-dark hover:underline cursor-pointer"
                                    >
                                        {t('Đổi logo khác')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="w-full border border-dashed border-border hover:border-brand-dark p-3 rounded-xl text-xs font-bold text-foreground text-center cursor-pointer transition flex items-center justify-center gap-2 hover:bg-surface/50"
                                >
                                    <UploadSimple size={15} />
                                    <span>{t('Tải logo thương hiệu (Khuyên dùng PNG trong suốt)')}</span>
                                </button>
                            )}

                            <div>
                                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                                    <span>{t('Kích thước logo')}</span>
                                    <span className="font-mono text-foreground">{logoSizePercent}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="40"
                                    step="1"
                                    value={logoSizePercent}
                                    onChange={(e) => setLogoSizePercent(Number(e.target.value))}
                                    className="w-full accent-brand cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Vị trí & Độ trong suốt */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                            <Crosshair size={16} weight="duotone" className="text-brand-dark" />
                            <span>{t('3. Vị trí & Độ trong suốt')}</span>
                        </h3>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isTiled}
                                onChange={(e) => setIsTiled(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-border text-brand-dark focus:ring-brand-dark cursor-pointer"
                            />
                            <span>{t('Phủ kín chéo (Tiled)')}</span>
                        </label>
                    </div>

                    {!isTiled ? (
                        <div className="space-y-1.5">
                            <div className="text-[11px] text-muted-foreground font-medium">
                                {t('Chọn 1 trong 9 vị trí trên khung ảnh:')}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 max-w-[210px] mx-auto p-1.5 rounded-xl bg-surface border border-border">
                                {POSITIONS.map((p) => {
                                    const isSelected = position === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPosition(p.id)}
                                            title={p.label}
                                            className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer grid place-items-center ${
                                                isSelected
                                                    ? 'bg-brand border border-brand-dark text-brand-ink shadow-2xs scale-105'
                                                    : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            <span className="leading-none">{p.icon}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-2.5 rounded-xl border border-brand-dark/30 bg-brand/10 text-[11px] text-brand-ink font-medium">
                            {t('Dấu ấn sẽ được phủ chéo toàn bộ bức ảnh giúp chống xóa hoặc cắt cúp hình ảnh bản quyền.')}
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                            <span>{t('Độ mờ đục (Opacity)')}</span>
                            <span className="font-mono text-foreground font-extrabold">{opacity}%</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="w-full accent-brand cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Right Canvas Preview & Export Column (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4.5 space-y-4 shadow-xs">
                    {/* Top Action Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-brand border border-brand-dark" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                {t('Xem trước ảnh đóng dấu thực tế')}
                            </h3>
                        </div>

                        {/* Export Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={busy || !mainImage}
                                onClick={handleSaveToMedia}
                                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-dark hover:bg-brand/10 transition cursor-pointer disabled:opacity-40"
                            >
                                <FloppyDisk size={14} weight="duotone" />
                                <span>{t('Lưu vào Media')}</span>
                            </button>
                            <button
                                type="button"
                                disabled={busy || !mainImage}
                                onClick={handleCreatePostWithImage}
                                className="flex items-center gap-1.5 rounded-xl border border-brand-dark bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand/35 transition cursor-pointer disabled:opacity-40"
                            >
                                <PencilSimple size={14} weight="bold" />
                                <span>{t('Soạn bài với ảnh này')}</span>
                            </button>
                            <button
                                type="button"
                                disabled={!mainImage}
                                onClick={handleDownload}
                                className="btn-skew flex items-center gap-1.5 !py-1.5 !px-3.5 text-xs font-bold cursor-pointer disabled:opacity-40"
                            >
                                <DownloadSimple size={14} weight="bold" />
                                <span>{t('Tải về máy')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Canvas Display Area */}
                    <div className="w-full min-h-[460px] rounded-xl border border-border bg-slate-950/90 flex items-center justify-center p-4 overflow-hidden relative">
                        <canvas
                            ref={canvasRef}
                            className="max-w-full max-h-[580px] object-contain rounded-lg shadow-md border border-slate-800"
                        />
                    </div>

                    {/* Bottom Status & Tips */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span>{t('Ảnh được xử lý trực tiếp an toàn ngay trên trình duyệt (HTML5 Canvas)')}</span>
                        </div>
                        <span className="font-mono text-[10px]">
                            {mainImage ? `${mainImage.width}×${mainImage.height}px · PNG` : ''}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
