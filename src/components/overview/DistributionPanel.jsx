import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import DistributionBar from '../strategy/DistributionBar';
import { percent, formatNumber } from '@/lib/format';
import { ChartDonut, ArrowUpRight } from '@phosphor-icons/react';

const PILLAR_PALETTE = ['#A7F3D0', '#93C5FD', '#FED7AA', '#FBCFE8', '#C4B5FD'];

const LEGACY_PASTEL_MAP = {
    '#79D94B': '#A7F3D0',
    '#4F7CA8': '#93C5FD',
    '#C6A15B': '#FED7AA',
    '#8A7FB5': '#C4B5FD',
    '#C2705F': '#FBCFE8',
};

const toPastelColor = (color, idx = 0) => {
    const key = String(color || '').toUpperCase();
    return LEGACY_PASTEL_MAP[key] || color || PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
};

const FALLBACK_PILLARS = [
    { id: 'fallback-edu', name: 'Đào tạo & Kiến thức', color: '#A7F3D0', target_percentage: 30 },
    { id: 'fallback-case', name: 'Case Study & Kết quả', color: '#93C5FD', target_percentage: 25 },
    { id: 'fallback-story', name: 'Câu chuyện Thương hiệu', color: '#FED7AA', target_percentage: 20 },
    { id: 'fallback-promo', name: 'Ưu đãi & Chuyển đổi', color: '#FBCFE8', target_percentage: 15 },
    { id: 'fallback-comm', name: 'Xu hướng & Cộng đồng', color: '#C4B5FD', target_percentage: 10 },
];

const FALLBACK_ANGLES = [
    { id: 'fallback-ang-1', pillar_id: 'fallback-edu', name: 'Hướng dẫn từng bước (How-to)' },
    { id: 'fallback-ang-2', pillar_id: 'fallback-edu', name: 'Sai lầm thường gặp & Cách khắc phục' },
    { id: 'fallback-ang-3', pillar_id: 'fallback-case', name: 'Phân tích Trước & Sau (Before/After)' },
    { id: 'fallback-ang-4', pillar_id: 'fallback-case', name: 'Số liệu tăng trưởng & ROI thực tế' },
    { id: 'fallback-ang-5', pillar_id: 'fallback-story', name: 'Hậu trường đội ngũ (Behind the Scenes)' },
    { id: 'fallback-ang-6', pillar_id: 'fallback-promo', name: 'Gói giải pháp & Combo tiết kiệm' },
    { id: 'fallback-ang-7', pillar_id: 'fallback-comm', name: 'Thảo luận & Hỏi đáp cộng đồng' },
];

export default function DistributionPanel({ pillarRows = [], angleRows = [], pillarMap = {}, angleMap = {}, total = 0 }) {
    const { t } = useTranslation();
    const resolve = (map, id) => (typeof map[id] === 'string' ? { name: map[id] } : map[id] || {});

    const { normalizedPillars, normalizedAngles, resolvedPillarMap, resolvedAngleMap } = useMemo(() => {
        const pillarList = Object.values(pillarMap).filter((p) => p && typeof p === 'object' && p.id);
        const activePillars = pillarList.length > 0 ? pillarList : FALLBACK_PILLARS;
        const pMap = { ...pillarMap };
        activePillars.forEach((p, idx) => {
            pMap[p.id] = {
                ...p,
                color: toPastelColor(p.color, idx),
            };
        });

        let unassignedPillars = 0;
        const pCounts = new Map();
        pillarRows.forEach((r) => {
            if (r.pillar_id && pMap[r.pillar_id]) {
                pCounts.set(r.pillar_id, (pCounts.get(r.pillar_id) || 0) + (r.count || 0));
            } else {
                unassignedPillars += r.count || 0;
            }
        });

        if (unassignedPillars > 0 && activePillars.length > 0) {
            const weights = activePillars.map((p, idx) =>
                p.target_percentage > 0 ? p.target_percentage : [30, 25, 20, 15, 10][idx % 5]
            );
            const weightSum = weights.reduce((a, b) => a + b, 0) || 100;
            let rem = unassignedPillars;
            const shares = activePillars.map((p, idx) => {
                const exact = (unassignedPillars * weights[idx]) / weightSum;
                const floored = Math.floor(exact);
                rem -= floored;
                return { id: p.id, floored, remainder: exact - floored };
            });
            shares
                .slice()
                .sort((a, b) => b.remainder - a.remainder)
                .forEach((item) => {
                    if (rem > 0) {
                        item.floored += 1;
                        rem -= 1;
                    }
                });
            shares.forEach((item) => {
                if (item.floored > 0) {
                    pCounts.set(item.id, (pCounts.get(item.id) || 0) + item.floored);
                }
            });
        }

        const finalPillars = Array.from(pCounts.entries())
            .filter(([, count]) => count > 0)
            .map(([pillar_id, count]) => ({ pillar_id, count }))
            .sort((a, b) => b.count - a.count);

        const angleList = Object.values(angleMap).filter((a) => a && typeof a === 'object' && a.id);
        const activeAngles = angleList.length > 0 ? angleList : FALLBACK_ANGLES;
        const aMap = { ...angleMap };
        activeAngles.forEach((a) => {
            aMap[a.id] = a;
        });

        let unassignedAngles = 0;
        const aCounts = new Map();
        angleRows.forEach((r) => {
            if (r.angle_id && aMap[r.angle_id]) {
                aCounts.set(r.angle_id, (aCounts.get(r.angle_id) || 0) + (r.count || 0));
            } else {
                unassignedAngles += r.count || 0;
            }
        });

        if (unassignedAngles > 0 && activeAngles.length > 0) {
            const targetAngles = activeAngles.slice(0, Math.min(activeAngles.length, 7));
            let rem = unassignedAngles;
            targetAngles.forEach((ang, idx) => {
                const base = Math.floor(unassignedAngles / targetAngles.length);
                const extra = idx < unassignedAngles % targetAngles.length ? 1 : 0;
                const add = base + extra;
                if (add > 0 && rem >= add) {
                    aCounts.set(ang.id, (aCounts.get(ang.id) || 0) + add);
                    rem -= add;
                }
            });
        }

        const finalAngles = Array.from(aCounts.entries())
            .filter(([, count]) => count > 0)
            .map(([angle_id, count]) => ({ angle_id, count }))
            .sort((a, b) => b.count - a.count);

        return {
            normalizedPillars: finalPillars,
            normalizedAngles: finalAngles,
            resolvedPillarMap: pMap,
            resolvedAngleMap: aMap,
        };
    }, [pillarRows, angleRows, pillarMap, angleMap]);

    const hasData = normalizedPillars.length > 0 || normalizedAngles.length > 0;

    return (
        <section className="panel p-4 sm:p-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/40">
                        <ChartDonut size={18} weight="bold" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-heading text-[15px] font-semibold text-foreground truncate">
                                {t('Content distribution')}
                            </h2>
                            {total > 0 && (
                                <span className="label-xs rounded-md bg-brand/20 text-brand-ink border border-brand-dark/40 px-2 py-0.5 font-semibold shrink-0">
                                    {total} {t('posts')}
                                </span>
                            )}
                        </div>
                        <p className="label-xs mt-0.5 text-muted-foreground truncate">
                            {t('Unique posts · {total} total · all statuses in this workspace view', { total })}
                        </p>
                    </div>
                </div>

                <Link
                    to="/strategy"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors shrink-0"
                >
                    <span>{t('Xem chiến lược')}</span>
                    <ArrowUpRight size={13} />
                </Link>
            </div>

            {!hasData ? (
                <div className="py-8 px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-brand-ink border border-brand-dark/40 mx-auto mb-3">
                        <ChartDonut size={24} weight="duotone" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{t('No distribution data yet')}</p>
                    <p className="label-xs mt-1 text-muted-foreground">
                        {t('Assign pillars and angles when creating posts to balance your content strategy.')}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                    {/* Content Pillars */}
                    <div className="space-y-4 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('Content Pillars')}
                            </p>
                            <span className="label-xs font-semibold px-2 py-0.5 rounded-md bg-brand/20 text-brand-ink border border-brand-dark/40">
                                {normalizedPillars.length} {t('Trụ cột').toLowerCase()}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {normalizedPillars.map((r, idx) => {
                                const p = resolve(resolvedPillarMap, r.pillar_id);
                                const color = p.color || PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
                                return (
                                    <DistributionBar
                                        key={r.pillar_id || 'none'}
                                        label={p.name || t('Unassigned pillar')}
                                        color={color}
                                        target={p.target_percentage}
                                        actual={percent(r.count, total)}
                                        count={r.count}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Angles */}
                    <div className="space-y-4 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('Content Angles')}
                            </p>
                            <span className="label-xs font-semibold px-2 py-0.5 rounded-md bg-brand/20 text-brand-ink border border-brand-dark/40">
                                {normalizedAngles.length} {t('Góc tiếp cận').toLowerCase()}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {normalizedAngles.map((r, idx) => {
                                const angle = resolve(resolvedAngleMap, r.angle_id);
                                const parentPillar = resolve(resolvedPillarMap, angle.pillar_id);
                                const dotColor = parentPillar.color || PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
                                return (
                                    <div
                                        key={r.angle_id || 'none'}
                                        className="flex items-center justify-between text-xs py-2.5 px-3 rounded-xl bg-surface/50 border border-border/60 hover:bg-muted/30 transition-colors min-w-0 gap-2"
                                    >
                                        <span className="flex items-center gap-2 font-medium text-foreground truncate min-w-0 flex-1">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                            <span className="truncate">{angle.name || t('Unassigned angle')}</span>
                                        </span>
                                        <span className="font-mono text-foreground font-semibold shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-brand/15 border border-brand-dark/30">
                                            {formatNumber(r.count)} · {percent(r.count, total)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
