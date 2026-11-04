import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { PenNib, CaretDown, Check, Plus, Trash, ArrowSquareOut } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import PlatformBadge from '@/components/common/PlatformBadge';

export default function SignatureSelector({
    brandId,
    platform = 'all',
    accountId = '',
    currentCaption = '',
    onApply,
    disabled = false,
}) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [signatures, setSignatures] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch signatures for the brand
    useEffect(() => {
        if (!brandId) return;
        let active = true;
        setLoading(true);
        appClient.entities.PostSignature.filter(
            { brand_id: brandId, status: 'active' },
            { sort: 'name', limit: 100 }
        )
            .then((res) => {
                if (active) setSignatures(res.items || []);
            })
            .catch(() => {
                if (active) setSignatures([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [brandId]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Categorize signatures: matching current account/platform first
    const { matchingSignatures, otherSignatures } = useMemo(() => {
        const matching = [];
        const other = [];

        signatures.forEach((sig) => {
            const matchesAccount = accountId && sig.account_id === accountId;
            const matchesPlatform = platform && platform !== 'all' && sig.platform === platform;
            const isUniversal = sig.platform === 'all' && !sig.account_id;

            if (matchesAccount || matchesPlatform || isUniversal) {
                matching.push(sig);
            } else {
                other.push(sig);
            }
        });

        return { matchingSignatures: matching, otherSignatures: other };
    }, [signatures, platform, accountId]);

    // Check if current caption already has one of the signatures
    const activeSignature = useMemo(() => {
        if (!currentCaption) return null;
        return signatures.find((sig) => currentCaption.includes(sig.content.trim()));
    }, [currentCaption, signatures]);

    const handleSelectSignature = (sig) => {
        const sigContent = sig.content.trim();
        let newCaption = currentCaption || '';

        // If another signature is already attached, replace it
        if (activeSignature && activeSignature.id !== sig.id) {
            newCaption = newCaption.replace(activeSignature.content.trim(), sigContent);
        } else if (!newCaption.includes(sigContent)) {
            const sep = newCaption && !/\n\n$/.test(newCaption) ? (/\n$/.test(newCaption) ? '\n' : '\n\n') : '';
            newCaption = `${newCaption}${sep}${sigContent}`;
        }

        onApply(newCaption, sig);
        toast({
            title: t('Đã áp dụng chữ ký!'),
            description: t('Đã chèn chữ ký "{name}" vào bài đăng.', { name: sig.name }),
        });
        setIsOpen(false);
    };

    const handleRemoveSignature = () => {
        if (!activeSignature) return;
        const sigContent = activeSignature.content.trim();
        let newCaption = currentCaption.replace(new RegExp(`(?:\\n\\n|\\n)?${escapeRegex(sigContent)}`, 'g'), '').trimEnd();
        onApply(newCaption, null);
        toast({ title: t('Đã gỡ chữ ký khỏi nội dung') });
        setIsOpen(false);
    };

    function escapeRegex(string) {
        return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                    activeSignature
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={t('Chọn chữ ký cho kênh này')}
            >
                <PenNib size={14} weight={activeSignature ? 'bold' : 'regular'} className={activeSignature ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'} />
                <span>{activeSignature ? activeSignature.name : t('Chữ ký')}</span>
                <CaretDown size={12} className="opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 sm:left-0 sm:right-auto z-40 mt-1.5 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t('Chọn chữ ký')}
                        </span>
                        <Link
                            to="/settings?tab=signatures"
                            className="inline-flex items-center gap-1 text-[11px] text-foreground hover:underline font-medium"
                            onClick={() => setIsOpen(false)}
                        >
                            <span>{t('Quản lý')}</span>
                            <ArrowSquareOut size={12} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                            {t('Đang tải…')}
                        </div>
                    ) : signatures.length === 0 ? (
                        <div className="p-3 text-center space-y-2">
                            <p className="text-xs text-muted-foreground">{t('Chưa có chữ ký nào.')}</p>
                            <Link
                                to="/settings?tab=signatures"
                                className="btn-skew text-[11px] py-1 px-3 inline-flex items-center gap-1 cursor-pointer"
                                onClick={() => setIsOpen(false)}
                            >
                                <Plus size={12} weight="bold" />
                                <span>{t('Tạo trong Cài đặt')}</span>
                            </Link>
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                            {/* Matching Signatures */}
                            {matchingSignatures.length > 0 && (
                                <div className="space-y-1">
                                    <span className="block px-2 pt-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                        {t('Phù hợp với kênh này')}
                                    </span>
                                    {matchingSignatures.map((sig) => {
                                        const isSelected = activeSignature?.id === sig.id;
                                        return (
                                            <button
                                                key={sig.id}
                                                type="button"
                                                onClick={() => handleSelectSignature(sig)}
                                                className={`w-full text-left rounded-xl p-2 text-xs transition-colors cursor-pointer flex flex-col gap-1 ${
                                                    isSelected
                                                        ? 'bg-amber-500/15 border border-amber-500/30 text-foreground font-medium'
                                                        : 'hover:bg-muted/80 text-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-semibold text-xs truncate max-w-[170px]">
                                                        {sig.name}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {sig.platform !== 'all' && (
                                                            <PlatformBadge platform={sig.platform} size="sm" />
                                                        )}
                                                        {isSelected && <Check size={14} className="text-amber-600 font-bold" />}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                                    {sig.content}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Other Signatures */}
                            {otherSignatures.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-border/50">
                                    <span className="block px-2 pt-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                        {t('Chữ ký khác')}
                                    </span>
                                    {otherSignatures.map((sig) => {
                                        const isSelected = activeSignature?.id === sig.id;
                                        return (
                                            <button
                                                key={sig.id}
                                                type="button"
                                                onClick={() => handleSelectSignature(sig)}
                                                className={`w-full text-left rounded-xl p-2 text-xs transition-colors cursor-pointer flex flex-col gap-1 ${
                                                    isSelected
                                                        ? 'bg-amber-500/15 border border-amber-500/30 text-foreground font-medium'
                                                        : 'hover:bg-muted/80 text-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-semibold text-xs truncate max-w-[170px]">
                                                        {sig.name}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {sig.platform !== 'all' && (
                                                            <PlatformBadge platform={sig.platform} size="sm" />
                                                        )}
                                                        {isSelected && <Check size={14} className="text-amber-600 font-bold" />}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                                    {sig.content}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Remove signature action */}
                            {activeSignature && (
                                <div className="pt-1 border-t border-border/50">
                                    <button
                                        type="button"
                                        onClick={handleRemoveSignature}
                                        className="w-full text-left rounded-xl p-2 text-xs text-dangerFg hover:bg-dangerBg/20 transition-colors cursor-pointer flex items-center gap-2"
                                    >
                                        <Trash size={14} />
                                        <span>{t('Gỡ chữ ký khỏi nội dung')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
