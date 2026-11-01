import { isDesktop } from '@/api/desktop/runtime';
import { useTranslation } from '@/lib/i18n';
import { PLATFORMS, PLATFORM_LABEL } from '@/lib/constants';
import {
    CalendarBlank,
    Hash,
    Globe,
    Stack,
    TreeStructure,
    SlidersHorizontal,
    ArrowCounterClockwise,
    CaretDown,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function StrategyFilters({
    filters,
    setFilters,
    pillars = [],
    angles = [],
    unit = 'posts',
    setUnit,
}) {
    const { t } = useTranslation();
    const desktop = isDesktop();

    const filteredAngles = angles.filter(
        (a) => filters.pillar_id === 'all' || a.pillar_id === filters.pillar_id
    );

    const hasActiveFilters =
        filters.range !== 'all' ||
        filters.platform !== 'all' ||
        filters.pillar_id !== 'all' ||
        filters.angle_id !== 'all' ||
        unit !== 'posts';

    const activeCount =
        (filters.range !== 'all' ? 1 : 0) +
        (filters.platform !== 'all' ? 1 : 0) +
        (filters.pillar_id !== 'all' ? 1 : 0) +
        (filters.angle_id !== 'all' ? 1 : 0) +
        (unit !== 'posts' ? 1 : 0);

    const handleReset = () => {
        setFilters({
            ...filters,
            range: 'all',
            platform: 'all',
            status: 'all',
            pillar_id: 'all',
            angle_id: 'all',
        });
        if (setUnit) setUnit('posts');
    };

    return (
        <div className="panel p-4 mb-6 space-y-3 bg-card border border-border/80 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <SlidersHorizontal size={15} weight="bold" />
                    </span>
                    <span className="text-xs font-semibold text-foreground">{t('Filters')}</span>
                    {hasActiveFilters && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/20 text-foreground">
                            {t('{count} active', { count: activeCount })}
                        </span>
                    )}
                </div>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
                    >
                        <ArrowCounterClockwise size={13} />
                        <span>{t('Reset')}</span>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                {/* Period Filter */}
                <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t('Period')}
                    </label>
                    <div className="relative flex items-center">
                        <CalendarBlank
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <select
                            aria-label={t('Period')}
                            value={filters.range}
                            onChange={(e) => setFilters({ ...filters, range: e.target.value })}
                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                            <option value="all">{t('All dates')}</option>
                            <option value="past30">{t('Past 30 days')}</option>
                            <option value="past90">{t('Past 90 days')}</option>
                            <option value="next30">{t('Next 30 days')}</option>
                        </select>
                        <CaretDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                    </div>
                </div>

                {/* Count Unit Filter */}
                <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t('Count')}
                    </label>
                    <div className="relative flex items-center">
                        <Hash
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <select
                            aria-label={t('Count')}
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                            <option value="posts">{t('Unique content posts')}</option>
                            {!desktop && <option value="jobs">{t('Publishing jobs')}</option>}
                        </select>
                        <CaretDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                    </div>
                </div>

                {/* Platform Filter */}
                <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t('Platform')}
                    </label>
                    <div className="relative flex items-center">
                        <Globe
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <select
                            aria-label={t('Platform')}
                            value={filters.platform}
                            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                            <option value="all">{t('All platforms')}</option>
                            {PLATFORMS.map((platform) => (
                                <option key={platform.value} value={platform.value}>
                                    {PLATFORM_LABEL[platform.value] || platform.short || platform.value}
                                </option>
                            ))}
                        </select>
                        <CaretDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                    </div>
                </div>

                {/* Pillar Filter */}
                <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t('Pillar')}
                    </label>
                    <div className="relative flex items-center">
                        <Stack
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <select
                            aria-label={t('Pillar')}
                            value={filters.pillar_id}
                            onChange={(e) => setFilters({ ...filters, pillar_id: e.target.value })}
                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                            <option value="all">{t('All pillars')}</option>
                            {pillars.map((pillar) => (
                                <option key={pillar.id} value={pillar.id}>
                                    {pillar.name}
                                </option>
                            ))}
                        </select>
                        <CaretDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                    </div>
                </div>

                {/* Angle Filter */}
                <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t('Angle')}
                    </label>
                    <div className="relative flex items-center">
                        <TreeStructure
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <select
                            aria-label={t('Angle')}
                            value={filters.angle_id}
                            onChange={(e) => setFilters({ ...filters, angle_id: e.target.value })}
                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                            <option value="all">{t('All angles')}</option>
                            {filteredAngles.map((angle) => (
                                <option key={angle.id} value={angle.id}>
                                    {angle.name}
                                </option>
                            ))}
                        </select>
                        <CaretDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
