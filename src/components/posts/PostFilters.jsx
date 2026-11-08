import { isDesktop } from '@/api/desktop/runtime';
import { useTranslation } from '@/lib/i18n';
import { PLATFORMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
    MagnifyingGlass,
    X,
    ArrowCounterClockwise,
    ListBullets,
    SquaresFour,
} from '@phosphor-icons/react';

export default function PostFilters({
    filters,
    setFilters,
    tabs = [],
    activeTab = 'all',
    onTabChange = null,
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
        if (onTabChange) onTabChange('all');
    };

    return (
        <div className="panel p-3 mb-5 space-y-3 bg-card border border-border rounded-2xl shadow-2xs">
            {/* Unified Smart Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left: Segmented Status Pills */}
                {tabs.length > 0 && onTabChange && (
                    <div className="flex items-center min-w-0 max-w-full gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto scroll-slim">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => onTabChange(tab.key)}
                                    className={`flex items-center shrink-0 gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'bg-card text-foreground font-bold shadow-2xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab.dot && <span className={`size-2 rounded-full ${tab.dot}`} />}
                                    <span>{tab.label}</span>
                                    <span
                                        className={`min-w-[18px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-zinc-900 text-white'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Right: Search + Quick Filters + View Switcher */}
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:ml-auto">
                    {/* Search Input */}
                    {'search' in filters && (
                        <div className="relative w-full min-w-0 sm:w-64">
                            <MagnifyingGlass
                                size={15}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                            <input
                                type="text"
                                aria-label={t('Search posts')}
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                placeholder={t('Tìm tiêu đề, chú thích…')}
                                className="w-full h-9 pl-8 pr-7 text-xs rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                            />
                            {filters.search && (
                                <button
                                    type="button"
                                    onClick={() => setFilters({ ...filters, search: '' })}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                                    aria-label={t('Clear search')}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Filter Platform */}
                    {!desktop && 'platform' in filters && (
                        <select
                            aria-label={t('Filter by platform')}
                            value={filters.platform}
                            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                            className="h-9 px-2 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
                        >
                            <option value="all">{t('Tất cả nền tảng')}</option>
                            {PLATFORMS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Filter Destination */}
                    {!desktop && 'account_id' in filters && accounts.length > 0 && (
                        <select
                            aria-label={t('Filter by destination')}
                            value={filters.account_id}
                            onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
                            className="h-9 px-2 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer max-w-[140px] truncate"
                        >
                            <option value="all">{t('Tất cả đích đăng')}</option>
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Filter Pillar */}
                    {'pillar_id' in filters && pillars.length > 0 && (
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
                            className="h-9 px-2 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer max-w-[140px] truncate"
                        >
                            <option value="all">{t('Tất cả trụ cột')}</option>
                            {pillars.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Filter Angle (if pillar selected) */}
                    {'angle_id' in filters && filters.pillar_id !== 'all' && filteredAngles.length > 0 && (
                        <select
                            aria-label={t('Filter by angle')}
                            value={filters.angle_id}
                            onChange={(e) => setFilters({ ...filters, angle_id: e.target.value })}
                            className="h-9 px-2 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer max-w-[140px] truncate"
                        >
                            <option value="all">{t('Tất cả góc')}</option>
                            {filteredAngles.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Reset Filters */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-xl cursor-pointer"
                            title={t('Reset filters')}
                        >
                            <ArrowCounterClockwise size={13} />
                            <span>{t('Đặt lại')}</span>
                        </Button>
                    )}

                    {/* View Switcher Table / Grid */}
                    {setViewMode && (
                        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs transition-colors cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-card text-foreground shadow-2xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={t('Table view')}
                                aria-label={t('Table view')}
                            >
                                <ListBullets size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs transition-colors cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-card text-foreground shadow-2xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={t('Grid view')}
                                aria-label={t('Grid view')}
                            >
                                <SquaresFour size={15} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
