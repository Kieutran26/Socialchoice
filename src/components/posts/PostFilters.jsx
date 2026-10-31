import { isDesktop } from '@/api/desktop/runtime';
import { useTranslation } from '@/lib/i18n';
import { POST_STATUS_LABEL, PLATFORMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
    MagnifyingGlass,
    X,
    ArrowCounterClockwise,
    ListBullets,
    SquaresFour,
    Funnel,
} from '@phosphor-icons/react';

export default function PostFilters({
    filters,
    setFilters,
    pillars = [],
    angles = [],
    accounts = [],
    viewMode = 'table',
    setViewMode = null,
}) {
    const { t } = useTranslation();

    const desktop = isDesktop();

    const filteredAngles = angles.filter(
        (a) => filters.pillar_id === 'all' || a.pillar_id === filters.pillar_id
    );

    const hasActiveFilters =
        Boolean(filters.search?.trim()) ||
        (filters.status && filters.status !== 'all') ||
        (filters.platform && filters.platform !== 'all') ||
        (filters.account_id && filters.account_id !== 'all') ||
        (filters.pillar_id && filters.pillar_id !== 'all') ||
        (filters.angle_id && filters.angle_id !== 'all');

    const handleReset = () => {
        setFilters({
            ...filters,
            search: '',
            status: 'all',
            platform: 'all',
            account_id: 'all',
            pillar_id: 'all',
            angle_id: 'all',
        });
    };

    return (
        <div className="panel p-3.5 mb-5 space-y-3 bg-card border border-border rounded-2xl shadow-2xs">
            {/* Top Toolbar: Search + View Toggles + Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Input */}
                {'search' in filters && (
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <MagnifyingGlass
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                            type="text"
                            aria-label={t('Search posts')}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder={t('Search by title or caption…')}
                            className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {filters.search && (
                            <button
                                type="button"
                                onClick={() => setFilters({ ...filters, search: '' })}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                                aria-label={t('Clear search')}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                )}

                {/* Right controls: Reset button + View mode toggle */}
                <div className="flex items-center gap-2 ml-auto">
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
                        >
                            <ArrowCounterClockwise size={13} />
                            <span>{t('Reset filters')}</span>
                        </Button>
                    )}

                    {setViewMode && (
                        <div className="flex items-center rounded-xl border border-border bg-muted/30 p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs transition-colors cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-card text-foreground shadow-2xs font-medium'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={t('Table view')}
                                aria-label={t('Table view')}
                            >
                                <ListBullets size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs transition-colors cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-card text-foreground shadow-2xs font-medium'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={t('Grid view')}
                                aria-label={t('Grid view')}
                            >
                                <SquaresFour size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* Platform */}
                {!desktop && 'platform' in filters && (
                    <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            {t('Platform')}
                        </label>
                        <select
                            aria-label={t('Filter by platform')}
                            value={filters.platform}
                            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                            className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="all">{t('All platforms')}</option>
                            {PLATFORMS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Destination */}
                {!desktop && 'account_id' in filters && (
                    <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            {t('Destination')}
                        </label>
                        <select
                            aria-label={t('Filter by destination')}
                            value={filters.account_id}
                            onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
                            className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="all">{t('All destinations')}</option>
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Content Pillar */}
                {'pillar_id' in filters && (
                    <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            {t('Pillar')}
                        </label>
                        <select
                            aria-label={t('Filter by pillar')}
                            value={filters.pillar_id}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    pillar_id: e.target.value,
                                    angle_id: 'all',
                                })
                            }
                            className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="all">{t('All pillars')}</option>
                            {pillars.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Content Angle */}
                {'angle_id' in filters && (
                    <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            {t('Angle')}
                        </label>
                        <select
                            aria-label={t('Filter by angle')}
                            value={filters.angle_id}
                            onChange={(e) => setFilters({ ...filters, angle_id: e.target.value })}
                            className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="all">{t('All angles')}</option>
                            {filteredAngles.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
