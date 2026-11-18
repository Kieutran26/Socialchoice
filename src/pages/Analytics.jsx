import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowsClockwise,
    ArrowSquareOut,
    Article,
    CalendarBlank,
    CaretLeft,
    CaretRight,
    ChartBar,
    ChatDots,
    CheckCircle,
    Clock,
    CursorClick,
    DownloadSimple,
    FacebookLogo,
    Globe,
    Info,
    LinkSimple,
    PaperPlaneTilt,
    ShareFat,
    ShareNetwork,
    Stack,
    ThumbsUp,
    TrendUp,
    WarningCircle,
} from '@phosphor-icons/react';
import { isDesktop } from '@/api/desktop/runtime';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { CONNECTION_LABEL, DEFAULT_TIMEZONE, PLATFORM_LABEL } from '@/lib/constants';
import {
    dateKey,
    formatCalendarDate,
    formatDateTime,
    formatNumber,
    percent,
} from '@/lib/format';
import { addDays, todayInZone, toUtcIso, toZonedParts } from '@/lib/tz';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import ExportReportDialog from '@/components/analytics/ExportReportDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

function useDelayedLoading(isLoading, delayMs = 300, minVisibleMs = 500) {
    const [isVisible, setIsVisible] = useState(false);
    const shownAtRef = useRef(0);

    useEffect(() => {
        if (isLoading) {
            if (isVisible) return undefined;
            const showTimer = window.setTimeout(() => {
                shownAtRef.current = Date.now();
                setIsVisible(true);
            }, delayMs);
            return () => window.clearTimeout(showTimer);
        }

        if (!isVisible) return undefined;
        const remainingMs = Math.max(0, minVisibleMs - (Date.now() - shownAtRef.current));
        const hideTimer = window.setTimeout(() => setIsVisible(false), remainingMs);
        return () => window.clearTimeout(hideTimer);
    }, [isLoading, isVisible, delayMs, minVisibleMs]);

    return isVisible;
}

function computeNiceScale(rawMax) {
    const safeMax = Math.max(Number(rawMax) || 0, 1);
    if (safeMax <= 4) {
        return { top: 4, ticks: [4, 3, 2, 1, 0] };
    }
    const candidates = [
        1, 2, 3, 5, 10, 15, 20, 25, 50, 100, 150, 200, 250, 500, 1000, 2500, 5000, 10000, 25000,
    ];
    const targetStep = Math.ceil(safeMax / 4);
    const step = candidates.find((c) => c >= targetStep) || Math.ceil(targetStep / 1000) * 1000;
    const top = step * 4;
    return {
        top,
        ticks: [step * 4, step * 3, step * 2, step, 0],
    };
}

function formatShortDayMonth(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '—';
    const parts = isoDate.slice(0, 10).split('-');
    if (parts.length !== 3) return isoDate;
    return `${Number(parts[2])}/${Number(parts[1])}`;
}

function formatDisplayDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '—';
    const parts = isoDate.slice(0, 10).split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function metricDisplay(metric) {
    if (!metric || metric.value === null || metric.value === undefined) return '—';
    return formatNumber(metric.value);
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function CustomDatePicker({ label, value, onChange, t }) {
    const [open, setOpen] = useState(false);
    const parsed = useMemo(() => {
        const [y, m, d] = String(value || '2026-01-01')
            .slice(0, 10)
            .split('-')
            .map(Number);
        return {
            year: Number.isFinite(y) ? y : 2026,
            month: Number.isFinite(m) ? m : 1,
            day: Number.isFinite(d) ? d : 1,
        };
    }, [value]);

    const [viewYear, setViewYear] = useState(parsed.year);
    const [viewMonth, setViewMonth] = useState(parsed.month);

    useEffect(() => {
        if (open) {
            setViewYear(parsed.year);
            setViewMonth(parsed.month);
        }
    }, [open, parsed.year, parsed.month]);

    const calendarCells = useMemo(() => {
        const firstDayUtc = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
        const jsDow = firstDayUtc.getUTCDay();
        const mondayOffset = jsDow === 0 ? 6 : jsDow - 1;
        const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
        const cells = [];
        for (let i = 0; i < mondayOffset; i += 1) {
            cells.push(null);
        }
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
            const iso = `${String(viewYear).padStart(4, '0')}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            cells.push({ dayNum, iso });
        }
        return cells;
    }, [viewYear, viewMonth]);

    const stepMonth = (delta) => {
        let nextM = viewMonth + delta;
        let nextY = viewYear;
        if (nextM < 1) {
            nextM = 12;
            nextY -= 1;
        } else if (nextM > 12) {
            nextM = 1;
            nextY += 1;
        }
        setViewMonth(nextM);
        setViewYear(nextY);
    };

    return (
        <div className="min-w-0">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={label}
                        className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium tabular-nums text-foreground transition-colors hover:bg-zinc-50"
                    >
                        <span className="truncate">{formatDisplayDate(value)}</span>
                        <CalendarBlank size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-68 p-3">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            aria-label={t('Tháng trước')}
                            onClick={() => stepMonth(-1)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-zinc-100"
                        >
                            <CaretLeft size={14} weight="bold" aria-hidden="true" />
                        </button>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                            {t('Tháng')} {viewMonth}/{viewYear}
                        </span>
                        <button
                            type="button"
                            aria-label={t('Tháng sau')}
                            onClick={() => stepMonth(1)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-zinc-100"
                        >
                            <CaretRight size={14} weight="bold" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="mb-1 grid grid-cols-7 gap-1 text-center">
                        {WEEKDAY_LABELS.map((wd) => (
                            <span key={wd} className="py-1 text-xs font-medium text-muted-foreground">
                                {wd}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell, idx) => {
                            if (!cell) {
                                return <span key={`empty-${idx}`} className="h-8 w-8" />;
                            }
                            const isSelected = cell.iso === value;
                            return (
                                <button
                                    key={cell.iso}
                                    type="button"
                                    onClick={() => {
                                        onChange(cell.iso);
                                        setOpen(false);
                                    }}
                                    className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-xs tabular-nums transition-colors ${
                                        isSelected
                                            ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark'
                                            : 'text-foreground hover:bg-zinc-100'
                                    }`}
                                >
                                    {cell.dayNum}
                                </button>
                            );
                        })}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export default function Analytics() {
    const { t } = useTranslation();
    const { scope, brands, timezone, switchMode, seeding } = useWorkspace();
    const activeTimezone = timezone || DEFAULT_TIMEZONE;

    const [activeTab, setActiveTab] = useState('workspace');
    const [period, setPeriod] = useState('auto');
    const [trendMode, setTrendMode] = useState('volume');
    const [strategyTab, setStrategyTab] = useState('pillars');
    const [secondaryChartTab, setSecondaryChartTab] = useState('auto');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [exportOpen, setExportOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [data, setData] = useState(null);
    const [trafficRefreshing, setTrafficRefreshing] = useState(false);

    const loadRunRef = useRef(0);
    const trafficInFlightRef = useRef(false);
    const isSkeletonVisible = useDelayedLoading(loading);

    const fetchTraffic = useCallback(async () => {
        const deduped = new Map();
        try {
            const listArg = scope.brand_id
                ? { brand_id: scope.brand_id }
                : { brand_id: 'all', is_demo: scope.is_demo };
            /** @type {any} */
            const res = await appClient.links.list(listArg, { silent: true });
            (res?.links || []).forEach((link) => {
                if (link?.id) deduped.set(link.id, link);
            });
        } catch {
            if (!scope.brand_id && brands.length > 0) {
                /** @type {any[]} */
                const results = await Promise.all(
                    brands.map((b) =>
                        appClient.links.list({ brand_id: b.id }, { silent: true }).catch(() => ({ links: [] }))
                    )
                );
                results.forEach((res) => {
                    (res?.links || []).forEach((link) => {
                        if (link?.id) deduped.set(link.id, link);
                    });
                });
            }
        }
        const trackingLinks = Array.from(deduped.values());
        const totalClicks = trackingLinks.reduce(
            (sum, link) => sum + (Number(link.clicks) || Number(link.total_clicks) || 0),
            0
        );
        return { trackingLinks, totalClicks };
    }, [scope, brands]);

    const load = useCallback(async () => {
        const run = ++loadRunRef.current;
        setLoading(true);
        setLoadError('');
        try {
            const [
                postAgg,
                jobAgg,
                weekAgg,
                postsRes,
                accountsRes,
                jobsPerAccount,
                pillarAgg,
                pillarsRes,
                angleAgg,
                anglesRes,
                traffic,
            ] = await Promise.all([
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.PublishJob.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.Post.aggregate({
                    query: scope,
                    dateBucket: { field: 'created_date', unit: 'week' },
                }),
                appClient.entities.Post.filter(scope, { sort: '-created_date', limit: 300 }),
                appClient.entities.SocialAccount.filter(scope, { sort: 'name', limit: 200 }),
                appClient.entities.PublishJob.aggregate({ query: scope, groupBy: 'social_account_id' }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
                appClient.entities.ContentPillar.filter(scope, { limit: 300 }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
                appClient.entities.ContentAngle.filter(scope, { limit: 300 }),
                fetchTraffic().catch(() => ({ trackingLinks: [], totalClicks: 0 })),
            ]);

            if (run !== loadRunRef.current) return;

            const postStatus = {};
            (postAgg?.rows || []).forEach((row) => {
                postStatus[row.status] = row.count;
            });

            const jobStatus = {};
            (jobAgg?.rows || []).forEach((row) => {
                jobStatus[row.status] = row.count;
            });

            const perAccount = {};
            (jobsPerAccount?.rows || []).forEach((row) => {
                perAccount[row.social_account_id] = row.count;
            });

            const weekly = (weekAgg?.rows || [])
                .filter((row) => row.bucket)
                .map((row) => ({
                    week: String(row.bucket).slice(0, 10),
                    count: row.count || 0,
                }))
                .sort((a, b) => a.week.localeCompare(b.week));

            setData({
                postStatus,
                jobStatus,
                weekly,
                posts: postsRes?.items || [],
                accounts: accountsRes?.items || [],
                perAccount,
                rawPillarRows: pillarAgg?.rows || [],
                pillars: pillarsRes?.items || [],
                rawAngleRows: angleAgg?.rows || [],
                angles: anglesRes?.items || [],
                trackingLinks: traffic.trackingLinks,
                totalClicks: traffic.totalClicks,
            });
        } catch (err) {
            if (run === loadRunRef.current) {
                setLoadError(err?.message || 'Không tải được dữ liệu phân tích');
            }
        } finally {
            if (run === loadRunRef.current) {
                setLoading(false);
            }
        }
    }, [scope, fetchTraffic]);

    useEffect(() => {
        load();
        return () => {
            loadRunRef.current += 1;
        };
    }, [load]);

    const refreshTrafficOnly = useCallback(async () => {
        if (trafficInFlightRef.current) return;
        trafficInFlightRef.current = true;
        setTrafficRefreshing(true);
        try {
            const traffic = await fetchTraffic();
            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          trackingLinks: traffic.trackingLinks,
                          totalClicks: traffic.totalClicks,
                      }
                    : prev
            );
        } catch {
            // Giữ nguyên số hiện tại khi làm mới ngầm gặp sự cố
        } finally {
            trafficInFlightRef.current = false;
            setTrafficRefreshing(false);
        }
    }, [fetchTraffic]);

    const todayStr = useMemo(() => todayInZone(activeTimezone), [activeTimezone]);

    const postDatedList = useMemo(() => {
        return (data?.posts || [])
            .map((post) => {
                const rawTs =
                    post.published_at || post.scheduled_at || post.created_date || post.created_at || post.updated_date;
                if (!rawTs) return null;
                try {
                    const isoDay = dateKey(rawTs, activeTimezone);
                    return isoDay ? { post, isoDay } : null;
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
    }, [data?.posts, activeTimezone]);

    const effectivePeriod = useMemo(() => {
        if (period !== 'auto') return period;
        const [y, m, d] = todayStr.split('-').map(Number);
        const start30 = new Date(Date.UTC(y, m - 1, d - 29)).toISOString().slice(0, 10);
        const hasRecent30d = postDatedList.some((entry) => entry.isoDay >= start30 && entry.isoDay <= todayStr);
        return hasRecent30d ? '30d' : 'all';
    }, [period, todayStr, postDatedList]);

    const effectiveSecondaryTab = useMemo(() => {
        if (secondaryChartTab !== 'auto') return secondaryChartTab;
        return (data?.trackingLinks?.length || 0) > 0 ? 'utm' : 'weekday';
    }, [secondaryChartTab, data?.trackingLinks?.length]);

    /* ── Chuẩn hóa dữ liệu xuất báo cáo PDF/CSV cho ExportReportDialog ── */
    const exportAnalyticsData = useMemo(() => {
        if (!data) return null;
        const pillarMap = {};
        const pillarMetaMap = {};
        (data.pillars || []).forEach((p) => {
            pillarMap[p.id] = p.name;
            pillarMetaMap[p.id] = p;
        });
        const pillarRows = (data.rawPillarRows || [])
            .filter((r) => r.count > 0)
            .map((r) => ({
                pillar_id: r.pillar_id || 'unassigned',
                count: r.count,
            }));
        return {
            postStatus: data.postStatus,
            jobStatus: data.jobStatus,
            weekly: data.weekly,
            accounts: data.accounts,
            perAccount: data.perAccount,
            pillarRows,
            pillarMap,
            pillarMetaMap,
        };
    }, [data]);

    /* ── Tính toán chuỗi thời gian & đối sánh kỳ trước theo effectivePeriod ── */
    const timeSeriesStats = useMemo(() => {
        const [year, month, day] = todayStr.split('-').map(Number);
        const clicksByDay = new Map();
        (data?.trackingLinks || []).forEach((link) => {
            (link.days || []).forEach((entry) => {
                const k = typeof entry?.day === 'string' ? entry.day.slice(0, 10) : '';
                if (k) {
                    clicksByDay.set(k, (clicksByDay.get(k) || 0) + (Number(entry.clicks) || 0));
                }
            });
        });

        const postsByDay = new Map();
        postDatedList.forEach(({ isoDay }) => {
            postsByDay.set(isoDay, (postsByDay.get(isoDay) || 0) + 1);
        });

        const sumDaysRange = (mapObj, startIso, endIso) => {
            let sum = 0;
            mapObj.forEach((val, key) => {
                if (key >= startIso && key <= endIso) sum += val;
            });
            return sum;
        };

        if (effectivePeriod === '7d') {
            const buckets = [];
            for (let i = 6; i >= 0; i -= 1) {
                const dt = new Date(Date.UTC(year, month - 1, day - i));
                const iso = dt.toISOString().slice(0, 10);
                buckets.push({
                    id: iso,
                    label: i === 0 ? t('Hôm nay') : formatShortDayMonth(iso),
                    isCurrent: i === 0,
                    posts: postsByDay.get(iso) || 0,
                    clicks: clicksByDay.get(iso) || 0,
                });
            }
            const curStart = new Date(Date.UTC(year, month - 1, day - 6)).toISOString().slice(0, 10);
            const prevStart = new Date(Date.UTC(year, month - 1, day - 13)).toISOString().slice(0, 10);
            const prevEnd = new Date(Date.UTC(year, month - 1, day - 7)).toISOString().slice(0, 10);

            const curPosts = sumDaysRange(postsByDay, curStart, todayStr);
            const prevPosts = sumDaysRange(postsByDay, prevStart, prevEnd);
            const curClicks = sumDaysRange(clicksByDay, curStart, todayStr);
            const prevClicks = sumDaysRange(clicksByDay, prevStart, prevEnd);

            let runTotal = 0;
            const withCum = buckets.map((b) => {
                runTotal += b.posts;
                return { ...b, cumulative: runTotal };
            });

            return {
                buckets: withCum,
                periodPosts: curPosts,
                prevPeriodPosts: prevPosts,
                periodClicks: curClicks,
                prevPeriodClicks: prevClicks,
                hasComparison: true,
                periodLabel: t('7 ngày qua'),
            };
        }

        if (effectivePeriod === '30d') {
            const buckets = [];
            // 10 cụm 3 ngày = 30 ngày tròn, vừa thoáng trên mobile vừa đủ độ chi tiết xu hướng
            for (let bIdx = 9; bIdx >= 0; bIdx -= 1) {
                const endOffset = bIdx * 3;
                const startOffset = endOffset + 2;
                const startDt = new Date(Date.UTC(year, month - 1, day - startOffset));
                const endDt = new Date(Date.UTC(year, month - 1, day - endOffset));
                const startIso = startDt.toISOString().slice(0, 10);
                const endIso = endDt.toISOString().slice(0, 10);
                buckets.push({
                    id: startIso,
                    label: bIdx === 0 ? t('Hôm nay') : formatShortDayMonth(endIso),
                    isCurrent: bIdx === 0,
                    posts: sumDaysRange(postsByDay, startIso, endIso),
                    clicks: sumDaysRange(clicksByDay, startIso, endIso),
                });
            }

            const curStart = new Date(Date.UTC(year, month - 1, day - 29)).toISOString().slice(0, 10);
            const prevStart = new Date(Date.UTC(year, month - 1, day - 59)).toISOString().slice(0, 10);
            const prevEnd = new Date(Date.UTC(year, month - 1, day - 30)).toISOString().slice(0, 10);

            const curPosts = sumDaysRange(postsByDay, curStart, todayStr);
            const prevPosts = sumDaysRange(postsByDay, prevStart, prevEnd);
            const curClicks = sumDaysRange(clicksByDay, curStart, todayStr);
            const prevClicks = sumDaysRange(clicksByDay, prevStart, prevEnd);

            let runTotal = 0;
            const withCum = buckets.map((b) => {
                runTotal += b.posts;
                return { ...b, cumulative: runTotal };
            });

            return {
                buckets: withCum,
                periodPosts: curPosts,
                prevPeriodPosts: prevPosts,
                periodClicks: curClicks,
                prevPeriodClicks: prevClicks,
                hasComparison: true,
                periodLabel: t('30 ngày qua'),
            };
        }

        if (effectivePeriod === '90d') {
            const buckets = [];
            // 10 cụm 9 ngày = 90 ngày
            for (let bIdx = 9; bIdx >= 0; bIdx -= 1) {
                const endOffset = bIdx * 9;
                const startOffset = endOffset + 8;
                const startDt = new Date(Date.UTC(year, month - 1, day - startOffset));
                const endDt = new Date(Date.UTC(year, month - 1, day - endOffset));
                const startIso = startDt.toISOString().slice(0, 10);
                const endIso = endDt.toISOString().slice(0, 10);
                buckets.push({
                    id: startIso,
                    label: bIdx === 0 ? t('Hôm nay') : formatShortDayMonth(endIso),
                    isCurrent: bIdx === 0,
                    posts: sumDaysRange(postsByDay, startIso, endIso),
                    clicks: sumDaysRange(clicksByDay, startIso, endIso),
                });
            }

            const curStart = new Date(Date.UTC(year, month - 1, day - 89)).toISOString().slice(0, 10);
            const prevStart = new Date(Date.UTC(year, month - 1, day - 179)).toISOString().slice(0, 10);
            const prevEnd = new Date(Date.UTC(year, month - 1, day - 90)).toISOString().slice(0, 10);

            const curPosts = sumDaysRange(postsByDay, curStart, todayStr);
            const prevPosts = sumDaysRange(postsByDay, prevStart, prevEnd);
            const curClicks = sumDaysRange(clicksByDay, curStart, todayStr);
            const prevClicks = sumDaysRange(clicksByDay, prevStart, prevEnd);

            let runTotal = 0;
            const withCum = buckets.map((b) => {
                runTotal += b.posts;
                return { ...b, cumulative: runTotal };
            });

            return {
                buckets: withCum,
                periodPosts: curPosts,
                prevPeriodPosts: prevPosts,
                periodClicks: curClicks,
                prevPeriodClicks: prevClicks,
                hasComparison: true,
                periodLabel: t('90 ngày qua'),
            };
        }

        // Chế độ Toàn thời gian ('all'): lấy theo tuần từ weekAgg (tối đa 10 mốc gần nhất)
        const rawWeekly = data?.weekly || [];
        const slicedWeeks = rawWeekly.slice(-10);
        let baseBeforeSlice = rawWeekly
            .slice(0, Math.max(0, rawWeekly.length - 10))
            .reduce((s, w) => s + w.count, 0);

        const buckets =
            slicedWeeks.length > 0
                ? slicedWeeks.map((w, idx) => {
                      baseBeforeSlice += w.count;
                      const endWeekIso = addDays(w.week, 6);
                      return {
                          id: w.week,
                          label: formatShortDayMonth(w.week),
                          isCurrent: idx === slicedWeeks.length - 1,
                          posts: w.count,
                          cumulative: baseBeforeSlice,
                          clicks: sumDaysRange(clicksByDay, w.week, endWeekIso),
                      };
                  })
                : [5, 4, 3, 2, 1, 0].map((wIdx) => {
                      const dt = new Date(Date.UTC(year, month - 1, day - wIdx * 7));
                      const iso = dt.toISOString().slice(0, 10);
                      return {
                          id: iso,
                          label: wIdx === 0 ? t('Tuần này') : formatShortDayMonth(iso),
                          isCurrent: wIdx === 0,
                          posts: 0,
                          cumulative: 0,
                          clicks: 0,
                      };
                  });

        const totalAllPosts = Object.values(data?.postStatus || {}).reduce((s, v) => s + v, 0);
        return {
            buckets,
            periodPosts: totalAllPosts,
            prevPeriodPosts: null,
            periodClicks: data?.totalClicks || 0,
            prevPeriodClicks: null,
            hasComparison: false,
            periodLabel: t('Toàn thời gian'),
        };
    }, [effectivePeriod, todayStr, data, postDatedList, t]);

    /* ── Tổng hợp KPI toàn cục & kỳ chọn ── */
    const totalPostsAll = Object.values(data?.postStatus || {}).reduce((sum, v) => sum + v, 0);
    const publishedPostsAll = data?.postStatus?.published || 0;
    const scheduledPostsAll =
        (data?.postStatus?.scheduled || 0) +
        (data?.postStatus?.processing || 0) +
        (data?.postStatus?.queued || 0);

    const totalJobs = Object.values(data?.jobStatus || {}).reduce((sum, v) => sum + v, 0);
    const publishedJobs = data?.jobStatus?.published || 0;
    const pendingJobs = (data?.jobStatus?.pending || 0) + (data?.jobStatus?.processing || 0);
    const cancelledJobs = data?.jobStatus?.cancelled || 0;
    const failedAndBlockedJobs =
        (data?.jobStatus?.failed || 0) +
        (data?.jobStatus?.blocked || 0) +
        (data?.jobStatus?.unknown || 0);
    const attemptedJobs = publishedJobs + failedAndBlockedJobs;
    const deliverySuccessRate = attemptedJobs > 0 ? percent(publishedJobs, attemptedJobs) : null;

    const accounts = data?.accounts || [];
    const readyChannelsCount = accounts.filter(
        (a) => a.connection_status === 'connected' || a.connection_status === 'demo'
    ).length;
    const totalFollowers = accounts.reduce((sum, a) => sum + (Number(a.followers) || 0), 0);
    const activeLinksCount = (data?.trackingLinks || []).filter((l) => l.active !== false).length;

    const hasWorkspaceData = totalPostsAll > 0 || totalJobs > 0 || accounts.length > 0;

    /* ── Biểu đồ 2: Donut Phễu tác vụ xuất bản (PublishJob) ── */
    const jobDonut = useMemo(() => {
        const otherJobs = Math.max(
            0,
            totalJobs - publishedJobs - pendingJobs - cancelledJobs - failedAndBlockedJobs
        );
        const fourthSlice =
            failedAndBlockedJobs > 0
                ? {
                      id: 'failed',
                      label: t('Lỗi / Bị chặn'),
                      count: failedAndBlockedJobs + otherJobs,
                      stroke: '#dc2626',
                      dotClass: 'bg-red-600',
                  }
                : {
                      id: 'other',
                      label: t('Chờ xác nhận'),
                      count: otherJobs,
                      stroke: '#ffe98a',
                      dotClass: 'bg-brand-200 ring-1 ring-brand-dark/60',
                  };

        const rawSlices = [
            {
                id: 'published',
                label: t('Đã phát hành'),
                count: publishedJobs,
                stroke: '#ffd631',
                dotClass: 'bg-brand ring-1 ring-brand-dark',
            },
            {
                id: 'pending',
                label: t('Đang chờ lịch'),
                count: pendingJobs,
                stroke: '#ca9a04',
                dotClass: 'bg-brand-dark',
            },
            {
                id: 'cancelled',
                label: t('Đã huỷ lệnh'),
                count: cancelledJobs,
                stroke: '#27272a',
                dotClass: 'bg-zinc-800',
            },
            fourthSlice,
        ];

        const sorted = [...rawSlices].sort((a, b) => b.count - a.count);
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const nonZero = sorted.filter((s) => s.count > 0);
        const gapPx = nonZero.length > 1 ? 3 : 0;

        let offset = 0;
        const arcs = nonZero.map((slice) => {
            const rawLen = (slice.count / Math.max(totalJobs, 1)) * circumference;
            const visibleLen = Math.max(rawLen - gapPx, 2);
            const arc = {
                ...slice,
                dashArray: `${visibleLen} ${circumference}`,
                dashOffset: -offset,
            };
            offset += rawLen;
            return arc;
        });

        const rows = sorted.map((s) => ({
            ...s,
            pct: totalJobs > 0 ? percent(s.count, totalJobs) : 0,
        }));

        return { rows, arcs, radius };
    }, [totalJobs, publishedJobs, pendingJobs, cancelledJobs, failedAndBlockedJobs, t]);

    /* ── Biểu đồ 3: Đối sánh Trụ cột (Bullet Chart) & Góc tiếp cận ── */
    const pillarAnalytics = useMemo(() => {
        const items = data?.pillars || [];
        const countsById = new Map();
        let unassigned = 0;
        const validIds = new Set(items.map((p) => p.id));

        (data?.rawPillarRows || []).forEach((r) => {
            if (r.pillar_id && validIds.has(r.pillar_id)) {
                countsById.set(r.pillar_id, (countsById.get(r.pillar_id) || 0) + (r.count || 0));
            } else {
                unassigned += r.count || 0;
            }
        });

        const rows = items
            .map((p) => {
                const count = countsById.get(p.id) || 0;
                const actualPct = totalPostsAll > 0 ? percent(count, totalPostsAll) : 0;
                const targetPct = typeof p.target_percentage === 'number' ? p.target_percentage : 0;
                const gap = targetPct > 0 ? actualPct - targetPct : 0;
                return {
                    id: p.id,
                    name: p.name,
                    count,
                    actualPct,
                    targetPct,
                    gap,
                };
            })
            .sort((a, b) => b.count - a.count || b.targetPct - a.targetPct)
            .slice(0, 6);

        return { rows, unassigned };
    }, [data?.pillars, data?.rawPillarRows, totalPostsAll]);

    const angleAnalytics = useMemo(() => {
        const angleMap = new Map((data?.angles || []).map((a) => [a.id, a]));
        const counts = new Map();
        (data?.rawAngleRows || []).forEach((r) => {
            if (r.angle_id && angleMap.has(r.angle_id)) {
                counts.set(r.angle_id, (counts.get(r.angle_id) || 0) + (r.count || 0));
            }
        });

        let rows = Array.from(counts.entries())
            .map(([id, count]) => ({
                id,
                name: angleMap.get(id)?.name || '',
                count,
                sharePct: totalPostsAll > 0 ? percent(count, totalPostsAll) : 0,
            }))
            .filter((r) => r.name)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        if (rows.length === 0 && (data?.angles?.length || 0) > 0) {
            rows = data.angles.slice(0, 5).map((a) => ({
                id: a.id,
                name: a.name,
                count: 0,
                sharePct: 0,
            }));
        }

        const maxCount = Math.max(...rows.map((r) => r.count), 1);
        return { rows, maxCount };
    }, [data?.angles, data?.rawAngleRows, totalPostsAll]);

    /* ── Biểu đồ 4: Mật độ đăng theo Thứ (T2–CN) & Top Chiến dịch UTM ── */
    const weekdayCadence = useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0, 0]; // 0 = T2 ... 6 = CN
        postDatedList.forEach(({ isoDay }) => {
            const [y, m, d] = isoDay.split('-').map(Number);
            if (!y || !m || !d) return;
            const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
            const mondayIdx = jsDay === 0 ? 6 : jsDay - 1;
            counts[mondayIdx] += 1;
        });
        const maxVal = Math.max(...counts, 1);
        const total = counts.reduce((s, c) => s + c, 0);
        let peakIdx = -1;
        if (total > 0) {
            peakIdx = counts.indexOf(Math.max(...counts));
        }
        const rows = WEEKDAY_LABELS.map((label, idx) => ({
            id: label,
            label,
            count: counts[idx],
            isPeak: idx === peakIdx && counts[idx] > 0,
        }));
        return { rows, maxVal, total, peakLabel: peakIdx >= 0 ? WEEKDAY_LABELS[peakIdx] : null };
    }, [postDatedList]);

    const utmCampaignRanking = useMemo(() => {
        const links = data?.trackingLinks || [];
        const byCampaign = new Map();
        links.forEach((link) => {
            const rawName = (link.campaign || link.title || link.slug || '').trim();
            const key = rawName || t('Link trực tiếp (Chưa gắn chiến dịch)');
            const clicks = Number(link.clicks) || Number(link.total_clicks) || 0;
            const prev = byCampaign.get(key) || { name: key, clicks: 0, linkCount: 0 };
            prev.clicks += clicks;
            prev.linkCount += 1;
            byCampaign.set(key, prev);
        });
        const rows = Array.from(byCampaign.values())
            .sort((a, b) => b.clicks - a.clicks || b.linkCount - a.linkCount)
            .slice(0, 5);
        const maxClicks = Math.max(...rows.map((r) => r.clicks), 1);
        const totalClicks = Math.max(data?.totalClicks || 0, 1);
        return {
            rows: rows.map((r) => ({
                ...r,
                sharePct: data?.totalClicks > 0 ? percent(r.clicks, totalClicks) : 0,
            })),
            maxClicks,
        };
    }, [data?.trackingLinks, data?.totalClicks, t]);

    /* ── Bảng 5: Danh sách kênh đích kèm lọc nền tảng & thanh tỷ trọng vàng ── */
    const availablePlatforms = useMemo(() => {
        const set = new Set();
        accounts.forEach((a) => {
            if (a.platform) set.add(a.platform);
        });
        return Array.from(set);
    }, [accounts]);

    const channelRows = useMemo(() => {
        const filtered =
            platformFilter === 'all'
                ? accounts
                : accounts.filter((acc) => acc.platform === platformFilter);
        const rows = filtered
            .map((acc) => {
                const jobs = data?.perAccount?.[acc.id] || 0;
                return {
                    ...acc,
                    jobs,
                    sharePct: totalJobs > 0 ? percent(jobs, totalJobs) : 0,
                };
            })
            .sort((a, b) => b.jobs - a.jobs || (Number(b.followers) || 0) - (Number(a.followers) || 0));
        const maxJobs = Math.max(...rows.map((r) => r.jobs), 1);
        return { rows, maxJobs };
    }, [accounts, platformFilter, data?.perAccount, totalJobs]);

    /* ── Dữ liệu cho Biểu đồ 1 (theo chế độ đang chọn) ── */
    const mainChartModel = useMemo(() => {
        const buckets = timeSeriesStats.buckets;
        const values = buckets.map((b) =>
            trendMode === 'cumulative' ? b.cumulative : trendMode === 'utm' ? b.clicks : b.posts
        );
        const rawMax = Math.max(...values, 1);
        const scale = computeNiceScale(rawMax);
        const sumValues = buckets.reduce(
            (s, b) => s + (trendMode === 'utm' ? b.clicks : b.posts),
            0
        );
        const latestCum = buckets.length > 0 ? buckets[buckets.length - 1].cumulative : 0;

        // Tọa độ SVG cho chế độ đường / miền tích lũy (640 x 180)
        const svgW = 640;
        const svgH = 180;
        const padX = 16;
        const padTop = 14;
        const padBot = 10;
        const plotW = svgW - padX * 2;
        const plotH = svgH - padTop - padBot;

        const points = buckets.map((b, idx) => {
            const x =
                buckets.length === 1
                    ? svgW / 2
                    : padX + (idx / (buckets.length - 1)) * plotW;
            const val = b.cumulative;
            const y = padTop + plotH - (Math.min(val, scale.top) / scale.top) * plotH;
            return { x, y, val, label: b.label, id: b.id };
        });

        const linePath = points
            .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
            .join(' ');
        const baselineY = padTop + plotH;
        const areaPath =
            points.length > 0
                ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${points[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`
                : '';

        return {
            buckets,
            scale,
            sumValues,
            latestCum,
            svgW,
            svgH,
            points,
            linePath,
            areaPath,
        };
    }, [timeSeriesStats.buckets, trendMode]);

    const renderDeltaHint = (curVal, prevVal, fallbackText) => {
        if (!timeSeriesStats.hasComparison || prevVal === null || prevVal === undefined) {
            return <span className="text-muted-foreground">{fallbackText}</span>;
        }
        if (prevVal === 0) {
            if (curVal > 0) {
                return (
                    <span className="font-medium text-emerald-700">
                        +{formatNumber(curVal)} {t('mới trong kỳ')}
                    </span>
                );
            }
            return <span className="text-muted-foreground">{t('Không đổi so với kỳ trước')}</span>;
        }
        if (prevVal < 5) {
            const diffAbs = curVal - prevVal;
            if (diffAbs > 0) {
                return (
                    <span className="font-medium text-emerald-700">
                        +{formatNumber(diffAbs)} {t('so với kỳ trước')} ({formatNumber(prevVal)} →{' '}
                        {formatNumber(curVal)})
                    </span>
                );
            }
            if (diffAbs < 0) {
                return (
                    <span className="font-medium text-amber-800">
                        {formatNumber(diffAbs)} {t('so với kỳ trước')} ({formatNumber(prevVal)} →{' '}
                        {formatNumber(curVal)})
                    </span>
                );
            }
            return <span className="text-muted-foreground">{t('Ngang bằng kỳ liền trước')}</span>;
        }
        const diffPct = Math.round(((curVal - prevVal) / prevVal) * 100);
        if (diffPct > 0) {
            return (
                <span className="font-medium text-emerald-700">
                    +{diffPct}% ({formatNumber(prevVal)} → {formatNumber(curVal)})
                </span>
            );
        }
        if (diffPct < 0) {
            return (
                <span className="font-medium text-amber-800">
                    {diffPct}% ({formatNumber(prevVal)} → {formatNumber(curVal)})
                </span>
            );
        }
        return <span className="text-muted-foreground">{t('Ngang bằng kỳ liền trước')}</span>;
    };

    return (
        <div className="space-y-5">
            {/* Đầu trang: Tiêu đề + Mô tả + Nút phụ vàng nhạt + Nút chính Xuất báo cáo (.btn-skew) */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl font-heading font-semibold text-foreground">
                        {t('Phân tích')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">
                        {t(
                            'Đo lường sản lượng xuất bản, hiệu quả link rút gọn UTM, tỷ trọng chiến lược và tương tác thực tế.'
                        )}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    <Link
                        to="/shortlinks"
                        className="inline-flex min-h-10 scroll-mt-20 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-brand-dark/50 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-200"
                    >
                        <LinkSimple size={16} weight="bold" aria-hidden="true" />
                        <span>{t('Link UTM')}</span>
                    </Link>

                    {activeTab === 'workspace' && hasWorkspaceData && (
                        <button
                            type="button"
                            onClick={() => setExportOpen(true)}
                            className="btn-skew min-h-10 cursor-pointer whitespace-nowrap"
                        >
                            <DownloadSimple size={16} weight="bold" aria-hidden="true" />
                            <span>{t('Xuất báo cáo')}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Thanh điều hướng Tab + Bộ lọc thời gian đồng nhất */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {!isDesktop() ? (
                    <div
                        role="tablist"
                        aria-label={t('Chế độ phân tích')}
                        className="grid w-full grid-cols-2 rounded-xl border border-border bg-card p-1 sm:inline-flex sm:w-auto sm:self-start"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'workspace'}
                            onClick={() => setActiveTab('workspace')}
                            className={`inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors sm:gap-2 sm:px-3.5 sm:text-sm ${
                                activeTab === 'workspace'
                                    ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                    : 'font-medium text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ChartBar
                                size={16}
                                weight={activeTab === 'workspace' ? 'fill' : 'regular'}
                                aria-hidden="true"
                                className="shrink-0"
                            />
                            <span className="truncate">{t('Workspace & UTM')}</span>
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'facebook'}
                            onClick={() => setActiveTab('facebook')}
                            className={`inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors sm:gap-2 sm:px-3.5 sm:text-sm ${
                                activeTab === 'facebook'
                                    ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                    : 'font-medium text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FacebookLogo
                                size={16}
                                weight={activeTab === 'facebook' ? 'fill' : 'regular'}
                                aria-hidden="true"
                                className="shrink-0"
                            />
                            <span className="truncate">{t('Facebook Insights')}</span>
                        </button>
                    </div>
                ) : (
                    <div />
                )}

                {activeTab === 'workspace' && hasWorkspaceData && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        {timeSeriesStats.hasComparison && (
                            <span className="text-xs text-muted-foreground">
                                {t('Đối sánh với kỳ liền trước')}
                            </span>
                        )}
                        <div
                            role="group"
                            aria-label={t('Khoảng thời gian báo cáo')}
                            className="inline-flex self-start rounded-xl border border-border bg-card p-1"
                        >
                            {[
                                { id: '7d', label: t('7 ngày') },
                                { id: '30d', label: t('30 ngày') },
                                { id: '90d', label: t('90 ngày') },
                                { id: 'all', label: t('Tất cả') },
                            ].map((opt) => {
                                const isActive = effectivePeriod === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        aria-pressed={isActive}
                                        onClick={() => setPeriod(opt.id)}
                                        className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition-colors sm:px-3 ${
                                            isActive
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'font-medium text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'facebook' && !isDesktop() ? (
                <FacebookInsightsClean
                    scope={scope}
                    timezone={activeTimezone}
                    switchMode={switchMode}
                    seeding={seeding}
                />
            ) : loadError ? (
                <div role="alert" className="panel flex flex-col items-center gap-3 px-5 py-10 text-center">
                    <div>
                        <p className="text-sm font-medium text-red-700">
                            {t('Không tải được dữ liệu phân tích')}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground text-pretty">{t(loadError)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100"
                    >
                        <ArrowsClockwise size={16} aria-hidden="true" />
                        <span>{t('Thử lại')}</span>
                    </button>
                </div>
            ) : loading ? (
                isSkeletonVisible ? (
                    <AnalyticsSkeleton t={t} />
                ) : (
                    <div className="min-h-96" />
                )
            ) : !hasWorkspaceData ? (
                <section className="panel flex flex-col items-center justify-center px-5 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-ink ring-1 ring-brand-dark/40">
                        <ChartBar size={24} weight="duotone" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-base font-heading font-semibold text-foreground">
                        {t('Chưa có dữ liệu phân tích trong không gian này')}
                    </h2>
                    <p className="mt-1.5 max-w-md text-sm text-muted-foreground text-pretty">
                        {t(
                            'Hãy tạo bài viết đầu tiên, kết nối kênh mạng xã hội hoặc bật chế độ dữ liệu mẫu để khám phá toàn bộ biểu đồ hiệu suất.'
                        )}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <Link to="/create" className="btn-skew min-h-10">
                            <span>{t('Tạo bài viết đầu tiên')}</span>
                        </Link>
                        {!isDesktop() && (
                            <button
                                type="button"
                                disabled={seeding}
                                onClick={() => switchMode(true)}
                                className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 disabled:opacity-50"
                            >
                                {seeding ? t('Đang chuẩn bị…') : t('Xem dữ liệu mẫu')}
                            </button>
                        )}
                    </div>
                </section>
            ) : (
                <>
                    {/* Hàng 1: Dải 4 KPI chuẩn hairline với huy hiệu vàng thương hiệu */}
                    <section
                        aria-label={t('Chỉ số phân tích tổng hợp')}
                        className="panel grid grid-cols-2 overflow-hidden xl:grid-cols-4"
                    >
                        {/* KPI 1: Sản lượng bài viết */}
                        <div className="flex min-w-0 flex-col border-b border-r border-border/60 p-4 sm:p-5 xl:border-b-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {effectivePeriod === 'all' ? t('Tổng bài viết') : t('Bài viết trong kỳ')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <Article size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(timeSeriesStats.periodPosts)}
                            </p>
                            <p className="mt-1 text-xs tabular-nums">
                                {renderDeltaHint(
                                    timeSeriesStats.periodPosts,
                                    timeSeriesStats.prevPeriodPosts,
                                    t('{pub} đã đăng · {sched} hẹn giờ', {
                                        pub: formatNumber(publishedPostsAll),
                                        sched: formatNumber(scheduledPostsAll),
                                    })
                                )}
                            </p>
                        </div>

                        {/* KPI 2: Tỷ lệ giao bài thành công */}
                        <div className="flex min-w-0 flex-col border-b border-border/60 p-4 sm:p-5 xl:border-b-0 xl:border-r">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Tỷ lệ giao thành công')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <CheckCircle size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {deliverySuccessRate !== null ? `${deliverySuccessRate}%` : '—'}
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {attemptedJobs > 0 ? (
                                    failedAndBlockedJobs > 0 ? (
                                        <span className="font-medium text-amber-800">
                                            {formatNumber(publishedJobs)}/{formatNumber(attemptedJobs)} {t('hoàn tất')} ·{' '}
                                            {formatNumber(failedAndBlockedJobs)} {t('cần xử lý')}
                                        </span>
                                    ) : (
                                        <span className="font-medium text-emerald-700">
                                            {formatNumber(publishedJobs)}/{formatNumber(attemptedJobs)} {t('lượt gửi trơn tru')}
                                        </span>
                                    )
                                ) : (
                                    <span>{t('Chưa phát sinh tác vụ gửi đi')}</span>
                                )}
                            </p>
                        </div>

                        {/* KPI 3: Lưu lượng nhấp UTM */}
                        <div className="flex min-w-0 flex-col border-r border-border/60 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {effectivePeriod === 'all' ? t('Tổng lượt nhấp UTM') : t('Clicks UTM trong kỳ')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <CursorClick size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(timeSeriesStats.periodClicks)}
                            </p>
                            <p className="mt-1 text-xs tabular-nums">
                                {renderDeltaHint(
                                    timeSeriesStats.periodClicks,
                                    timeSeriesStats.prevPeriodClicks,
                                    t('{n} link rút gọn đang hoạt động', {
                                        n: formatNumber(activeLinksCount),
                                    })
                                )}
                            </p>
                        </div>

                        {/* KPI 4: Quy mô kênh đích */}
                        <div className="flex min-w-0 flex-col p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {totalFollowers > 0 ? t('Quy mô người theo dõi') : t('Kênh đích sẵn sàng')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <ShareNetwork size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {totalFollowers > 0
                                    ? formatNumber(totalFollowers)
                                    : `${readyChannelsCount}/${accounts.length}`}
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {readyChannelsCount}/{accounts.length} {t('kênh kết nối')} ·{' '}
                                {formatNumber(totalJobs)} {t('lượt phát')}
                            </p>
                        </div>
                    </section>

                    {/* Hàng 2: Cặp Biểu đồ chính (Chart 1: Cột/Miền xu hướng thời gian · Chart 2: Donut Phễu PublishJob) */}
                    <div className="grid items-stretch gap-4 xl:grid-cols-12">
                        {/* Chart 1 (8 cột): Xu hướng Sản lượng / Tăng trưởng tích lũy / Clicks UTM */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5 xl:col-span-8">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h2 className="text-base font-heading font-semibold text-foreground">
                                        {trendMode === 'cumulative'
                                            ? t('Đà tăng trưởng bài viết tích lũy')
                                            : trendMode === 'utm'
                                            ? t('Diễn biến lượt nhấp UTM theo thời gian')
                                            : t('Nhịp độ sản xuất nội dung')}
                                    </h2>
                                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                                        {trendMode === 'cumulative'
                                            ? t('Tổng cộng {n} bài tích lũy đến cuối kỳ ({period})', {
                                                  n: formatNumber(mainChartModel.latestCum),
                                                  period: timeSeriesStats.periodLabel,
                                              })
                                            : trendMode === 'utm'
                                            ? t('{n} lượt nhấp ghi nhận trong {period}', {
                                                  n: formatNumber(mainChartModel.sumValues),
                                                  period: timeSeriesStats.periodLabel,
                                              })
                                            : t('{n} bài viết phát sinh trong {period}', {
                                                  n: formatNumber(mainChartModel.sumValues),
                                                  period: timeSeriesStats.periodLabel,
                                              })}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {trendMode === 'utm' && (
                                        <button
                                            type="button"
                                            aria-label={t('Làm mới số liệu nhấp link')}
                                            disabled={trafficRefreshing}
                                            onClick={refreshTrafficOnly}
                                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground/75 transition-colors hover:bg-zinc-100 hover:text-foreground disabled:opacity-50"
                                        >
                                            <ArrowsClockwise
                                                size={15}
                                                aria-hidden="true"
                                                className={
                                                    trafficRefreshing
                                                        ? 'animate-spin motion-reduce:animate-none'
                                                        : ''
                                                }
                                            />
                                        </button>
                                    )}
                                    <div
                                        role="group"
                                        aria-label={t('Chế độ biểu đồ xu hướng')}
                                        className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
                                    >
                                        {[
                                            { id: 'volume', label: t('Theo kỳ') },
                                            { id: 'cumulative', label: t('Tích lũy') },
                                            { id: 'utm', label: t('Clicks UTM') },
                                        ].map((tab) => {
                                            const active = trendMode === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => setTrendMode(tab.id)}
                                                    className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition-colors sm:px-3 ${
                                                        active
                                                            ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                            : 'font-medium text-foreground/75 hover:text-foreground'
                                                    }`}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-1 flex-col justify-end">
                                {trendMode === 'utm' && (data?.trackingLinks?.length || 0) === 0 ? (
                                    <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 text-center">
                                        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                                            {t(
                                                'Chưa có link rút gọn UTM nào để ghi nhận biểu đồ nhấp chuột theo ngày.'
                                            )}
                                        </p>
                                        <Link
                                            to="/shortlinks"
                                            className="inline-flex min-h-9 items-center text-sm font-medium text-brand-ink underline underline-offset-4"
                                        >
                                            {t('Tạo link rút gọn ngay')}
                                        </Link>
                                    </div>
                                ) : trendMode === 'cumulative' ? (
                                    /* Biểu đồ Miền + Đường (SVG Area Chart) vàng thương hiệu */
                                    <div
                                        role="img"
                                        aria-label={t('Biểu đồ miền tích lũy đạt {n} bài viết', {
                                            n: formatNumber(mainChartModel.latestCum),
                                        })}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-stretch gap-3">
                                            <div className="flex flex-col justify-between py-1 text-right text-xs tabular-nums text-muted-foreground">
                                                {mainChartModel.scale.ticks.map((tick) => (
                                                    <span key={tick}>{formatNumber(tick)}</span>
                                                ))}
                                            </div>
                                            <div className="relative min-w-0 flex-1">
                                                <svg
                                                    viewBox={`0 0 ${mainChartModel.svgW} ${mainChartModel.svgH}`}
                                                    className="h-48 w-full overflow-visible"
                                                    preserveAspectRatio="none"
                                                >
                                                    <defs>
                                                        <linearGradient
                                                            id="scYellowAreaGrad"
                                                            x1="0"
                                                            y1="0"
                                                            x2="0"
                                                            y2="1"
                                                        >
                                                            <stop
                                                                offset="0%"
                                                                stopColor="#ffd631"
                                                                stopOpacity="0.55"
                                                            />
                                                            <stop
                                                                offset="100%"
                                                                stopColor="#ffd631"
                                                                stopOpacity="0.04"
                                                            />
                                                        </linearGradient>
                                                    </defs>
                                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                                                        const yPos = 14 + ratio * (180 - 24);
                                                        return (
                                                            <line
                                                                key={ratio}
                                                                x1="0"
                                                                x2={mainChartModel.svgW}
                                                                y1={yPos}
                                                                y2={yPos}
                                                                stroke="#e4e4e7"
                                                                strokeWidth="1"
                                                            />
                                                        );
                                                    })}
                                                    {mainChartModel.areaPath && (
                                                        <path
                                                            d={mainChartModel.areaPath}
                                                            fill="url(#scYellowAreaGrad)"
                                                        />
                                                    )}
                                                    {mainChartModel.linePath && (
                                                        <path
                                                            d={mainChartModel.linePath}
                                                            fill="none"
                                                            stroke="#2b2100"
                                                            strokeWidth="2.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    )}
                                                </svg>
                                            </div>
                                        </div>

                                        <div className="flex gap-1 border-t border-border pt-2 pl-8">
                                            {mainChartModel.buckets.map((b, idx) => {
                                                const len = mainChartModel.buckets.length;
                                                const isLast = idx === len - 1;
                                                const step = len > 7 ? 2 : 1;
                                                const showMobile =
                                                    isLast || (idx % 2 === 0 && idx < len - 2);
                                                const showDesktop =
                                                    isLast || (idx % step === 0 && idx < len - (step > 1 ? 2 : 1));
                                                return (
                                                    <span
                                                        key={b.id}
                                                        className={`min-w-0 flex-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground ${
                                                            isLast
                                                                ? 'flex justify-end sm:block sm:text-center'
                                                                : 'text-center'
                                                        } ${showDesktop ? '' : 'sm:invisible'} ${
                                                            showMobile ? '' : 'max-sm:invisible'
                                                        }`}
                                                    >
                                                        {b.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    /* Biểu đồ Cột vàng chuẩn lưới ngang bậc tròn */
                                    <div
                                        role="img"
                                        aria-label={t('Biểu đồ cột theo thời gian, tổng {n}', {
                                            n: formatNumber(mainChartModel.sumValues),
                                        })}
                                    >
                                        <div className="flex items-stretch gap-3">
                                            <div className="flex h-48 flex-col justify-between text-right text-xs tabular-nums text-muted-foreground">
                                                {mainChartModel.scale.ticks.map((tick) => (
                                                    <span key={tick} className="leading-none">
                                                        {formatNumber(tick)}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="relative flex h-48 min-w-0 flex-1 items-end gap-1.5 sm:gap-2.5">
                                                {/* Đường lưới ngang mờ tại 4 mốc tròn */}
                                                <div
                                                    aria-hidden="true"
                                                    className="pointer-events-none absolute inset-0 flex flex-col justify-between"
                                                >
                                                    {mainChartModel.scale.ticks.map((tick) => (
                                                        <div
                                                            key={tick}
                                                            className="w-full border-b border-border/60"
                                                        />
                                                    ))}
                                                </div>

                                                {mainChartModel.buckets.map((bucket) => {
                                                    const val =
                                                        trendMode === 'utm' ? bucket.clicks : bucket.posts;
                                                    const heightPct =
                                                        val > 0
                                                            ? Math.max(
                                                                  8,
                                                                  Math.round(
                                                                      (val / mainChartModel.scale.top) * 100
                                                                  )
                                                              )
                                                            : 0;
                                                    return (
                                                        <div
                                                            key={bucket.id}
                                                            className="relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                                                        >
                                                            {val > 0 && (
                                                                <span className="mb-1 text-xs font-semibold tabular-nums text-foreground">
                                                                    {formatNumber(val)}
                                                                </span>
                                                            )}
                                                            {heightPct > 0 ? (
                                                                <div
                                                                    title={`${bucket.label}: ${formatNumber(val)}`}
                                                                    className={`w-full max-w-10 rounded-t-md transition-all ${
                                                                        bucket.isCurrent
                                                                            ? 'bg-brand-200 ring-1 ring-inset ring-brand-dark'
                                                                            : 'bg-brand ring-1 ring-inset ring-brand-dark'
                                                                    }`}
                                                                    style={{ height: `${heightPct}%` }}
                                                                />
                                                            ) : (
                                                                <div className="h-1 w-full max-w-10 rounded-full bg-brand-200/70" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-2.5 flex gap-1.5 pl-7 sm:gap-2.5">
                                            {mainChartModel.buckets.map((bucket, idx) => {
                                                const len = mainChartModel.buckets.length;
                                                const isLast = idx === len - 1;
                                                const showOnMobile =
                                                    isLast || (idx % 2 === 0 && idx < len - 2);
                                                return (
                                                    <span
                                                        key={bucket.id}
                                                        className={`min-w-0 flex-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground ${
                                                            isLast
                                                                ? 'flex justify-end sm:block sm:text-center'
                                                                : 'text-center'
                                                        } ${showOnMobile ? '' : 'max-sm:invisible'}`}
                                                    >
                                                        {bucket.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Chart 2 (4 cột): Biểu đồ Vòng Donut Phễu tác vụ xuất bản (PublishJob) */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5 xl:col-span-4">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-base font-heading font-semibold text-foreground">
                                        {t('Phễu tác vụ xuất bản')}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {t('Tỷ trọng trạng thái gửi bài tới các kênh')}
                                    </p>
                                </div>
                                <Link
                                    to="/posts"
                                    className="inline-flex min-h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                >
                                    {t('Chi tiết')}
                                </Link>
                            </div>

                            <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row xl:flex-col">
                                <div
                                    role="img"
                                    aria-label={t('Biểu đồ tròn phễu xuất bản gồm {n} tác vụ', {
                                        n: formatNumber(totalJobs),
                                    })}
                                    className="relative flex h-36 w-36 shrink-0 items-center justify-center"
                                >
                                    <svg viewBox="0 0 128 128" className="h-full w-full">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r={jobDonut.radius}
                                            fill="none"
                                            stroke="#f4f4f5"
                                            strokeWidth="18"
                                        />
                                        <g transform="rotate(-90 64 64)">
                                            {jobDonut.arcs.map((arc) => (
                                                <circle
                                                    key={arc.id}
                                                    cx="64"
                                                    cy="64"
                                                    r={jobDonut.radius}
                                                    fill="none"
                                                    stroke={arc.stroke}
                                                    strokeWidth="16"
                                                    strokeDasharray={arc.dashArray}
                                                    strokeDashoffset={arc.dashOffset}
                                                />
                                            ))}
                                        </g>
                                    </svg>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                                            {formatNumber(totalJobs)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{t('tác vụ')}</span>
                                    </div>
                                </div>

                                <ul className="w-full min-w-0 flex-1 divide-y divide-border/70">
                                    {jobDonut.rows.map((row) => (
                                        <li
                                            key={row.id}
                                            className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <span
                                                    aria-hidden="true"
                                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dotClass}`}
                                                />
                                                <span className="truncate text-sm text-foreground">
                                                    {row.label}
                                                </span>
                                            </div>
                                            <div className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {formatNumber(row.count)}
                                                </span>
                                                <span className="w-10 text-right text-xs text-muted-foreground">
                                                    {totalJobs > 0 ? `${row.pct}%` : '—'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    </div>

                    {/* Hàng 3: Cặp Biểu đồ Chiến lược & Chuyển đổi (Chart 3: Bullet Trụ cột / Góc tiếp cận · Chart 4: Chiến dịch UTM / Nhịp Thứ) */}
                    <div className="grid items-stretch gap-4 lg:grid-cols-2">
                        {/* Chart 3: Đối sánh Trụ cột nội dung (Thực tế % vs Mục tiêu %) & Góc tiếp cận */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5">
                            <div className="mb-4 space-y-2">
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="min-w-0 truncate text-base font-heading font-semibold text-foreground">
                                        {strategyTab === 'pillars'
                                            ? t('Đối sánh Trụ cột nội dung')
                                            : t('Phân bổ Góc tiếp cận')}
                                    </h2>

                                    <div
                                        role="group"
                                        aria-label={t('Chiều phân tích chiến lược')}
                                        className="inline-flex shrink-0 self-start rounded-xl bg-muted p-1"
                                    >
                                        <button
                                            type="button"
                                            aria-pressed={strategyTab === 'pillars'}
                                            onClick={() => setStrategyTab('pillars')}
                                            className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                                strategyTab === 'pillars'
                                                    ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                    : 'font-medium text-foreground/75 hover:text-foreground'
                                            }`}
                                        >
                                            {t('Trụ cột')}
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={strategyTab === 'angles'}
                                            onClick={() => setStrategyTab('angles')}
                                            className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                                strategyTab === 'angles'
                                                    ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                    : 'font-medium text-foreground/75 hover:text-foreground'
                                            }`}
                                        >
                                            {t('Góc tiếp cận')}
                                        </button>
                                    </div>
                                </div>

                                {strategyTab === 'pillars' ? (
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                            <span
                                                aria-hidden="true"
                                                className="h-2.5 w-2.5 rounded-sm bg-brand ring-1 ring-brand-dark"
                                            />
                                            <span>{t('Thực tế %')}</span>
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                            <span aria-hidden="true" className="h-3 w-0.5 bg-zinc-900" />
                                            <span>{t('Mục tiêu %')}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {t('Xếp hạng góc khai thác có nhiều bài viết nhất')}
                                    </p>
                                )}
                            </div>

                            {strategyTab === 'pillars' ? (
                                pillarAnalytics.rows.length === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                                        <p className="text-sm text-muted-foreground text-pretty">
                                            {t('Chưa thiết lập trụ cột nội dung cho không gian này.')}
                                        </p>
                                        <Link
                                            to="/strategy/pillars"
                                            className="inline-flex min-h-9 items-center text-sm font-medium text-brand-ink underline underline-offset-4"
                                        >
                                            {t('Thiết lập trụ cột')}
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 flex-col justify-between space-y-4">
                                        <ul className="space-y-3.5">
                                            {pillarAnalytics.rows.map((p) => {
                                                const isShort = p.targetPct > 0 && p.gap <= -10;
                                                return (
                                                    <li key={p.id} className="min-w-0">
                                                        <div className="flex items-baseline justify-between gap-3">
                                                            <span
                                                                title={p.name}
                                                                className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
                                                            >
                                                                {p.name}
                                                            </span>
                                                            <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                                                {p.actualPct}%
                                                                {p.targetPct > 0 && (
                                                                    <span className="font-normal text-muted-foreground">
                                                                        {' '}
                                                                        / {p.targetPct}%
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="relative mt-1.5 h-3 w-full rounded-full bg-zinc-100">
                                                            <div
                                                                className="h-3 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        p.actualPct > 0
                                                                            ? Math.max(4, p.actualPct)
                                                                            : 0
                                                                    )}%`,
                                                                }}
                                                            />
                                                            {p.targetPct > 0 && p.targetPct <= 100 && (
                                                                <span
                                                                    aria-hidden="true"
                                                                    title={`${t('Mục tiêu')}: ${p.targetPct}%`}
                                                                    className="pointer-events-none absolute top-0 h-3 w-0.5 bg-zinc-900"
                                                                    style={{ left: `${p.targetPct}%` }}
                                                                />
                                                            )}
                                                        </div>

                                                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                                            {formatNumber(p.count)} {t('bài viết')}
                                                            {isShort && (
                                                                <span className="font-medium text-amber-800">
                                                                    {' · '}
                                                                    {t('Thiếu {n}% so với mục tiêu', {
                                                                        n: Math.abs(p.gap),
                                                                    })}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {pillarAnalytics.unassigned > 0 && (
                                            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                                                <span className="text-muted-foreground">
                                                    {formatNumber(pillarAnalytics.unassigned)}{' '}
                                                    {t('bài chưa gắn trụ cột')}
                                                </span>
                                                <Link
                                                    to="/posts"
                                                    className="font-medium text-foreground hover:underline"
                                                >
                                                    {t('Phân loại ngay')}
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : angleAnalytics.rows.length === 0 ? (
                                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                                    <p className="text-sm text-muted-foreground text-pretty">
                                        {t('Chưa có dữ liệu góc tiếp cận nội dung.')}
                                    </p>
                                    <Link
                                        to="/strategy/angles"
                                        className="inline-flex min-h-9 items-center text-sm font-medium text-brand-ink underline underline-offset-4"
                                    >
                                        {t('Quản lý góc tiếp cận')}
                                    </Link>
                                </div>
                            ) : (
                                <ul className="space-y-3.5">
                                    {angleAnalytics.rows.map((angle) => {
                                        const widthPct =
                                            angle.count > 0
                                                ? Math.max(
                                                      6,
                                                      Math.round((angle.count / angleAnalytics.maxCount) * 100)
                                                  )
                                                : 0;
                                        return (
                                            <li key={angle.id} className="min-w-0">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <span
                                                        title={angle.name}
                                                        className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
                                                    >
                                                        {angle.name}
                                                    </span>
                                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                                        {formatNumber(angle.count)} {t('bài')} ({angle.sharePct}%)
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 h-3 w-full rounded-full bg-zinc-100">
                                                    {widthPct > 0 && (
                                                        <div
                                                            className="h-3 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                            style={{ width: `${widthPct}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>

                        {/* Chart 4: Hiệu quả Chiến dịch UTM & Mật độ đăng theo Thứ trong tuần */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h2 className="text-base font-heading font-semibold text-foreground">
                                        {effectiveSecondaryTab === 'utm'
                                            ? t('Chiến dịch thu hút nhấp UTM')
                                            : t('Mật độ xuất bản theo Thứ')}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {effectiveSecondaryTab === 'utm'
                                            ? t('Xếp hạng nhóm chiến dịch rút gọn mang lại nhiều lượt truy cập nhất')
                                            : weekdayCadence.peakLabel
                                            ? t('Ngày sôi động nhất trong tuần: {day}', {
                                                  day: weekdayCadence.peakLabel,
                                              })
                                            : t('Phân bổ thói quen đăng bài từ Thứ Hai đến Chủ Nhật')}
                                    </p>
                                </div>

                                <div
                                    role="group"
                                    aria-label={t('Chế độ biểu đồ chuyển đổi và thói quen')}
                                    className="inline-flex shrink-0 self-start rounded-xl bg-muted p-1"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={effectiveSecondaryTab === 'utm'}
                                        onClick={() => setSecondaryChartTab('utm')}
                                        className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                            effectiveSecondaryTab === 'utm'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'font-medium text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Chiến dịch UTM')}
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={effectiveSecondaryTab === 'weekday'}
                                        onClick={() => setSecondaryChartTab('weekday')}
                                        className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                            effectiveSecondaryTab === 'weekday'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'font-medium text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Theo Thứ')}
                                    </button>
                                </div>
                            </div>

                            {effectiveSecondaryTab === 'utm' ? (
                                utmCampaignRanking.rows.length === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                                        <p className="max-w-xs text-sm text-muted-foreground text-pretty">
                                            {t(
                                                'Chưa có chiến dịch link rút gọn nào. Tạo link gắn UTM để so sánh hiệu quả kéo truy cập.'
                                            )}
                                        </p>
                                        <Link
                                            to="/shortlinks"
                                            className="inline-flex min-h-9 items-center text-sm font-medium text-brand-ink underline underline-offset-4"
                                        >
                                            {t('Mở trình quản lý Shortlinks')}
                                        </Link>
                                    </div>
                                ) : (
                                    <ul className="space-y-3.5">
                                        {utmCampaignRanking.rows.map((camp) => {
                                            const barWidth =
                                                camp.clicks > 0
                                                    ? Math.max(
                                                          6,
                                                          Math.round(
                                                              (camp.clicks / utmCampaignRanking.maxClicks) * 100
                                                          )
                                                      )
                                                    : 0;
                                            return (
                                                <li key={camp.name} className="min-w-0">
                                                    <div className="flex items-baseline justify-between gap-3">
                                                        <span
                                                            title={camp.name}
                                                            className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
                                                        >
                                                            {camp.name}
                                                        </span>
                                                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                                            {formatNumber(camp.clicks)} {t('clicks')} ({camp.sharePct}
                                                            %)
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 h-3 w-full rounded-full bg-zinc-100">
                                                        {barWidth > 0 && (
                                                            <div
                                                                className="h-3 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                                style={{ width: `${barWidth}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                                        {formatNumber(camp.linkCount)} {t('link theo dõi')}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )
                            ) : (
                                /* Biểu đồ cột Mật độ Thứ Hai -> Chủ Nhật */
                                <div className="flex flex-1 flex-col justify-end pt-2">
                                    <div
                                        role="img"
                                        aria-label={t('Biểu đồ mật độ bài viết theo các thứ trong tuần')}
                                    >
                                        <div className="flex h-44 items-end gap-2 sm:gap-3">
                                            {weekdayCadence.rows.map((dayItem) => {
                                                const heightPct =
                                                    dayItem.count > 0
                                                        ? Math.max(
                                                              10,
                                                              Math.round(
                                                                  (dayItem.count / weekdayCadence.maxVal) * 100
                                                              )
                                                          )
                                                        : 0;
                                                return (
                                                    <div
                                                        key={dayItem.id}
                                                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                                                    >
                                                        <span className="text-xs font-semibold tabular-nums text-foreground">
                                                            {formatNumber(dayItem.count)}
                                                        </span>
                                                        {heightPct > 0 ? (
                                                            <div
                                                                className={`w-full max-w-10 rounded-t-md ${
                                                                    dayItem.isPeak
                                                                        ? 'bg-brand ring-1 ring-inset ring-brand-dark'
                                                                        : 'bg-brand-200 ring-1 ring-inset ring-brand-dark/70'
                                                                }`}
                                                                style={{ height: `${heightPct}%` }}
                                                            />
                                                        ) : (
                                                            <div className="h-1 w-full max-w-10 rounded-full bg-zinc-200" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-2.5 flex gap-2 border-t border-border pt-2.5 sm:gap-3">
                                            {weekdayCadence.rows.map((dayItem) => (
                                                <span
                                                    key={dayItem.id}
                                                    className={`min-w-0 flex-1 text-center text-xs tabular-nums ${
                                                        dayItem.isPeak
                                                            ? 'font-semibold text-foreground'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {dayItem.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Hàng 4: Bảng Hiệu suất & Tỷ trọng phân phối theo Kênh đích */}
                    <section className="panel min-w-0 overflow-hidden">
                        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="min-w-0">
                                <h2 className="text-base font-heading font-semibold text-foreground">
                                    {t('Hiệu suất theo kênh đích')}
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {t(
                                        'Đối chiếu quy mô người theo dõi, tình trạng kết nối và tỷ trọng lượt phát hành trên từng tài khoản'
                                    )}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {availablePlatforms.length > 1 && (
                                    <div className="w-44">
                                        <Select value={platformFilter} onValueChange={setPlatformFilter}>
                                            <SelectTrigger
                                                aria-label={t('Lọc nền tảng')}
                                                className="min-h-9 rounded-xl border-border bg-card text-xs font-medium"
                                            >
                                                <SelectValue placeholder={t('Tất cả nền tảng')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    {t('Tất cả nền tảng')} ({accounts.length})
                                                </SelectItem>
                                                {availablePlatforms.map((plat) => (
                                                    <SelectItem key={plat} value={plat}>
                                                        {PLATFORM_CONFIG[plat]?.label ||
                                                            PLATFORM_LABEL[plat] ||
                                                            plat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <Link
                                    to="/accounts"
                                    className="inline-flex min-h-9 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                >
                                    {t('Quản lý kênh')}
                                </Link>
                            </div>
                        </div>

                        {channelRows.rows.length === 0 ? (
                            <div className="px-5 py-10 text-center">
                                <p className="text-sm text-muted-foreground">
                                    {t('Chưa có tài khoản mạng xã hội nào khớp bộ lọc hiện tại.')}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Bảng chuẩn trên màn hình rộng >= md */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-zinc-50/70 text-xs font-semibold text-muted-foreground">
                                                <th className="px-5 py-3">{t('Tài khoản / Trang đích')}</th>
                                                <th className="px-4 py-3">{t('Nền tảng')}</th>
                                                <th className="px-4 py-3 text-right">{t('Người theo dõi')}</th>
                                                <th className="w-64 px-4 py-3">{t('Tỷ trọng phát hành')}</th>
                                                <th className="px-5 py-3 text-right">{t('Trạng thái')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/70">
                                            {channelRows.rows.map((acc) => {
                                                const cfg = PLATFORM_CONFIG[acc.platform];
                                                const IconComp = cfg?.icon || Globe;
                                                const isConnected = acc.connection_status === 'connected';
                                                const isDemo = acc.connection_status === 'demo';
                                                const barPct =
                                                    acc.jobs > 0
                                                        ? Math.max(
                                                              6,
                                                              Math.round(
                                                                  (acc.jobs / channelRows.maxJobs) * 100
                                                              )
                                                          )
                                                        : 0;
                                                return (
                                                    <tr key={acc.id}>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                                                                    <IconComp
                                                                        size={18}
                                                                        weight="fill"
                                                                        aria-hidden="true"
                                                                        className={cfg?.color || 'text-foreground'}
                                                                    />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p
                                                                        title={acc.name}
                                                                        className="max-w-xs truncate font-medium text-foreground"
                                                                    >
                                                                        {acc.name}
                                                                    </p>
                                                                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                                                                        {acc.handle ||
                                                                            cfg?.label ||
                                                                            PLATFORM_LABEL[acc.platform] ||
                                                                            acc.platform}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">
                                                            {cfg?.label || PLATFORM_LABEL[acc.platform] || acc.platform}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-foreground">
                                                            {acc.followers ? formatNumber(acc.followers) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                                                                <span className="font-semibold text-foreground">
                                                                    {formatNumber(acc.jobs)} {t('lượt')}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    {totalJobs > 0 ? `${acc.sharePct}%` : '—'}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-100">
                                                                {barPct > 0 && (
                                                                    <div
                                                                        className="h-2 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                                        style={{ width: `${barPct}%` }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                                    isConnected
                                                                        ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/25'
                                                                        : isDemo
                                                                        ? 'bg-brand-100 text-brand-ink ring-1 ring-inset ring-brand-dark/40'
                                                                        : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25'
                                                                }`}
                                                            >
                                                                <span
                                                                    aria-hidden="true"
                                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                                        isConnected
                                                                            ? 'bg-emerald-600'
                                                                            : isDemo
                                                                            ? 'bg-brand-dark'
                                                                            : 'bg-amber-600'
                                                                    }`}
                                                                />
                                                                <span>
                                                                    {CONNECTION_LABEL[acc.connection_status] ||
                                                                        acc.connection_status}
                                                                </span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Dạng danh sách gọn gàng trên màn hình hẹp < md (không cuộn ngang, không cắt số) */}
                                <ul className="divide-y divide-border md:hidden">
                                    {channelRows.rows.map((acc) => {
                                        const cfg = PLATFORM_CONFIG[acc.platform];
                                        const IconComp = cfg?.icon || Globe;
                                        const isConnected = acc.connection_status === 'connected';
                                        const isDemo = acc.connection_status === 'demo';
                                        const barPct =
                                            acc.jobs > 0
                                                ? Math.max(
                                                      6,
                                                      Math.round((acc.jobs / channelRows.maxJobs) * 100)
                                                  )
                                                : 0;
                                        return (
                                            <li key={acc.id} className="space-y-2.5 px-4 py-3.5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                                                            <IconComp
                                                                size={18}
                                                                weight="fill"
                                                                aria-hidden="true"
                                                                className={cfg?.color || 'text-foreground'}
                                                            />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p
                                                                title={acc.name}
                                                                className="truncate text-sm font-medium text-foreground"
                                                            >
                                                                {acc.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {cfg?.label ||
                                                                    PLATFORM_LABEL[acc.platform] ||
                                                                    acc.platform}
                                                                {acc.followers
                                                                    ? ` · ${formatNumber(acc.followers)} theo dõi`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            isConnected
                                                                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/25'
                                                                : isDemo
                                                                ? 'bg-brand-100 text-brand-ink ring-1 ring-inset ring-brand-dark/40'
                                                                : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25'
                                                        }`}
                                                    >
                                                        {CONNECTION_LABEL[acc.connection_status] ||
                                                            acc.connection_status}
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between text-xs tabular-nums">
                                                        <span className="text-muted-foreground">
                                                            {t('Lượt phát hành')}
                                                        </span>
                                                        <span className="font-semibold text-foreground">
                                                            {formatNumber(acc.jobs)} {t('lượt')}
                                                            {totalJobs > 0 ? ` (${acc.sharePct}%)` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
                                                        {barPct > 0 && (
                                                            <div
                                                                className="h-2 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                                style={{ width: `${barPct}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </section>
                </>
            )}

            <ExportReportDialog
                open={exportOpen}
                onClose={() => setExportOpen(false)}
                analyticsData={exportAnalyticsData}
                scope={scope}
                timezone={activeTimezone}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
 * TAB 2: FACEBOOK INSIGHTS (Clean Brand-Yellow UI + Strict Metric Integrity)
 * ────────────────────────────────────────────────────────────────────────── */
function FacebookInsightsClean({ scope, timezone, switchMode, seeding }) {
    const { t } = useTranslation();
    const [dates, setDates] = useState(() => ({
        from: toZonedParts(new Date(Date.now() - 29 * 86400000).toISOString(), timezone).date,
        to: todayInZone(timezone),
    }));
    const [preset, setPreset] = useState('30d');
    const [accountId, setAccountId] = useState('');
    const [pillarId, setPillarId] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const generationRef = useRef(0);

    const handlePresetChange = (days, id) => {
        setPreset(id);
        const fromDate = toZonedParts(
            new Date(Date.now() - (days - 1) * 86400000).toISOString(),
            timezone
        ).date;
        const toDate = todayInZone(timezone);
        setDates({ from: fromDate, to: toDate });
    };

    const options = useMemo(() => {
        try {
            return {
                brandId: scope.brand_id || '',
                accountId,
                pillarId,
                start: toUtcIso(dates.from, '00:00', timezone),
                end: toUtcIso(addDays(dates.to, 1), '00:00', timezone),
            };
        } catch {
            return null;
        }
    }, [scope.brand_id, accountId, pillarId, dates, timezone]);

    useEffect(() => {
        if (scope.is_demo) return undefined;
        let active = true;
        Promise.all([
            appClient.entities.SocialAccount.filter(
                { ...scope, platform: 'facebook' },
                { limit: 300, sort: 'name' }
            ),
            appClient.entities.ContentPillar.filter(scope, { limit: 300, sort: 'name' }),
        ])
            .then(([a, p]) => {
                if (active) {
                    setAccounts(a.items || []);
                    setPillars(p.items || []);
                }
            })
            .catch((e) => {
                if (active) setError(e.message || '');
            });
        return () => {
            active = false;
        };
    }, [scope]);

    useEffect(() => {
        const current = ++generationRef.current;
        setRefreshing(false);
        setLoading(false);
        setReport(null);
        setError('');
        if (scope.is_demo) return undefined;
        if (!options?.start || !options.end) {
            setError('Choose a valid metrics date range of up to one year');
            return undefined;
        }
        setLoading(true);
        appClient.metrics
            .list(options)
            .then((result) => {
                if (current === generationRef.current) setReport(result);
            })
            .catch((e) => {
                if (current === generationRef.current) setError(e.message || '');
            })
            .finally(() => {
                if (current === generationRef.current) setLoading(false);
            });
        return () => {
            generationRef.current += 1;
        };
    }, [options, scope.is_demo, reloadKey]);

    useEffect(() => {
        if (!report?.ready || report.pending > 0 || !report.total) return undefined;
        const timer = window.setTimeout(() => setReloadKey((k) => k + 1), 61000);
        return () => window.clearTimeout(timer);
    }, [report]);

    const handleRefreshNext = async () => {
        const current = generationRef.current;
        setRefreshing(true);
        setError('');
        try {
            const result = await appClient.metrics.refresh(options);
            if (current === generationRef.current) setReport(result);
        } catch (e) {
            if (current === generationRef.current) setError(e.message || '');
        } finally {
            if (current === generationRef.current) setRefreshing(false);
        }
    };

    if (scope.is_demo) {
        return (
            <section className="panel flex flex-col items-center justify-center px-5 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-ink ring-1 ring-brand-dark">
                    <FacebookLogo size={24} weight="fill" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-base font-heading font-semibold text-foreground">
                    {t('Số liệu thực tế từ Facebook chỉ hoạt động ở không gian thật')}
                </h2>
                <p className="mt-1.5 max-w-md text-sm text-muted-foreground text-pretty">
                    {t(
                        'Bạn đang bật chế độ Dữ liệu mẫu. SocialChoice không giả lập lượt cảm xúc, bình luận hay chia sẻ từ Meta để đảm bảo tính xác thực.'
                    )}
                </p>
                <div className="mt-5">
                    <button
                        type="button"
                        disabled={seeding}
                        onClick={() => switchMode(false)}
                        className="btn-skew min-h-10 cursor-pointer"
                    >
                        <span>{t('Chuyển sang Dữ liệu thật')}</span>
                    </button>
                </div>
            </section>
        );
    }

    const measuredReactions = report?.totals?.reactions?.measured || 0;
    const measuredComments = report?.totals?.comments?.measured || 0;
    const measuredShares = report?.totals?.shares?.measured || 0;

    const avgReactions =
        measuredReactions > 0 && report?.totals?.reactions?.value != null
            ? Math.round(report.totals.reactions.value / measuredReactions)
            : null;
    const avgComments =
        measuredComments > 0 && report?.totals?.comments?.value != null
            ? Math.round(report.totals.comments.value / measuredComments)
            : null;
    const avgShares =
        measuredShares > 0 && report?.totals?.shares?.value != null
            ? Math.round(report.totals.shares.value / measuredShares)
            : null;

    return (
        <div className="space-y-5">
            {/* Bộ lọc điều khiển Facebook Insights */}
            <section className="panel space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink ring-1 ring-brand-dark">
                            <FacebookLogo size={22} weight="fill" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-heading font-semibold text-foreground">
                                {t('Hiệu suất bài đăng Facebook')}
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                                {t(
                                    'Lọc theo ngày xuất bản. Số liệu là tổng tích lũy mới nhất được xác nhận trực tiếp từ Meta.'
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                        {report?.pending > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-ink ring-1 ring-brand-dark/40">
                                <span
                                    aria-hidden="true"
                                    className="h-1.5 w-1.5 rounded-full bg-brand-dark"
                                />
                                {t('{count} bài sẵn sàng đồng bộ', { count: report.pending })}
                            </span>
                        )}
                        <button
                            type="button"
                            disabled={
                                loading ||
                                refreshing ||
                                !report?.ready ||
                                !report?.total ||
                                report.pending === 0
                            }
                            onClick={handleRefreshNext}
                            className="btn-skew min-h-10 cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ArrowsClockwise
                                size={16}
                                weight="bold"
                                aria-hidden="true"
                                className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''}
                            />
                            <span>
                                {refreshing
                                    ? t('Đang đồng bộ…')
                                    : t('Cập nhật 3 bài tiếp theo')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Hàng phím chọn nhanh kỳ hạn */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div
                        role="group"
                        aria-label={t('Kỳ hạn nhanh Facebook')}
                        className="inline-flex self-start rounded-xl bg-muted p-1"
                    >
                        {[
                            { id: '7d', days: 7, label: t('7 ngày qua') },
                            { id: '30d', days: 30, label: t('30 ngày qua') },
                            { id: '90d', days: 90, label: t('90 ngày qua') },
                        ].map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={preset === item.id}
                                onClick={() => handlePresetChange(item.days, item.id)}
                                className={`min-h-8 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                    preset === item.id
                                        ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                        : 'font-medium text-foreground/75 hover:text-foreground'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                        <Clock size={14} aria-hidden="true" />
                        <span>
                            {t('Múi giờ')}: {timezone}
                        </span>
                    </span>
                </div>

                {/* 4 Ô điều khiển chuẩn custom UI (không dùng native date/select của trình duyệt) */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <CustomDatePicker
                        label={t('Từ ngày xuất bản')}
                        value={dates.from}
                        onChange={(nextIso) => {
                            setPreset('custom');
                            setDates((prev) => ({ ...prev, from: nextIso }));
                        }}
                        t={t}
                    />

                    <CustomDatePicker
                        label={t('Đến hết ngày')}
                        value={dates.to}
                        onChange={(nextIso) => {
                            setPreset('custom');
                            setDates((prev) => ({ ...prev, to: nextIso }));
                        }}
                        t={t}
                    />

                    <div className="min-w-0">
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('Trang Facebook')}</p>
                        <Select
                            value={accountId || '__all__'}
                            onValueChange={(val) => setAccountId(val === '__all__' ? '' : val)}
                        >
                            <SelectTrigger
                                aria-label={t('Trang Facebook')}
                                className="min-h-10 rounded-xl border-border bg-card text-sm font-medium"
                            >
                                <SelectValue placeholder={t('Tất cả Trang')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">
                                    {t('Tất cả Trang')} ({accounts.length})
                                </SelectItem>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="min-w-0">
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                            {t('Trụ cột nội dung')}
                        </p>
                        <Select
                            value={pillarId || '__all__'}
                            onValueChange={(val) => setPillarId(val === '__all__' ? '' : val)}
                        >
                            <SelectTrigger
                                aria-label={t('Trụ cột nội dung')}
                                className="min-h-10 rounded-xl border-border bg-card text-sm font-medium"
                            >
                                <SelectValue placeholder={t('Tất cả trụ cột')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">
                                    {t('Tất cả trụ cột')} ({pillars.length})
                                </SelectItem>
                                {pillars.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Chú thích minh bạch số liệu */}
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        {t(
                            'Chỉ số chưa thu thập giữ dấu "—". Không ước tính Reach, Views hay tỷ lệ tương tác.'
                        )}
                    </span>
                    {report?.pending === 0 && report?.total > 0 && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                            <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                            <span>
                                {t('Mỗi bài có thời gian nghỉ 1 phút giữa các lần làm mới.')}
                            </span>
                        </span>
                    )}
                </div>

                {report && !report.ready && (
                    <div className="flex items-center gap-2 rounded-xl border border-brand-dark/40 bg-brand-50 p-3 text-xs text-foreground">
                        <Info size={16} className="shrink-0 text-brand-ink" />
                        <span>{t('Cần cấu hình kết nối Meta trước khi đồng bộ số liệu bài đăng.')}</span>
                    </div>
                )}

                {report?.limited && (
                    <div className="flex items-center gap-2 rounded-xl border border-brand-dark/40 bg-brand-50 p-3 text-xs text-foreground">
                        <WarningCircle size={16} className="shrink-0 text-brand-ink" />
                        <span>
                            {t(
                                'Đang hiển thị tối đa 1.000 bài đã xác nhận. Thu hẹp khoảng ngày để có tổng đầy đủ.'
                            )}
                        </span>
                    </div>
                )}

                {report?.stale > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-brand-dark/40 bg-brand-50 p-3 text-xs text-foreground">
                        <Info size={16} className="shrink-0 text-brand-ink" />
                        <span>
                            {t(
                                '{count} bài đang dùng bản ghi đo lường trước đó. Kiểm tra thời điểm đồng bộ và quyền truy cập.',
                                { count: report.stale }
                            )}
                        </span>
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-800"
                    >
                        <WarningCircle size={16} className="shrink-0 text-red-600" />
                        <span>{t(error)}</span>
                    </div>
                )}
            </section>

            {loading ? (
                <div role="status" className="panel flex flex-col items-center justify-center p-10 text-center">
                    <ArrowsClockwise
                        size={24}
                        className="mb-2 animate-spin text-muted-foreground motion-reduce:animate-none"
                    />
                    <p className="text-sm text-muted-foreground">
                        {t('Đang tải số liệu bài đăng từ Facebook…')}
                    </p>
                </div>
            ) : !report?.total ? (
                <section className="panel flex flex-col items-center justify-center px-5 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-ink ring-1 ring-brand-dark/40">
                        <ChartBar size={24} weight="duotone" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-heading font-semibold text-foreground">
                        {t('Chưa có bài đăng Facebook đã xác nhận trong khoảng ngày này')}
                    </h3>
                    <p className="mt-1.5 max-w-md text-sm text-muted-foreground text-pretty">
                        {t(
                            'Chỉ các bài xuất bản qua SocialChoice có mã bài đăng Facebook xác nhận mới xuất hiện tại đây. Hãy mở rộng khoảng ngày hoặc kết nối Fanpage.'
                        )}
                    </p>
                </section>
            ) : (
                <>
                    {/* Dải 4 KPI Facebook chuẩn hairline */}
                    <section
                        aria-label={t('Chỉ số tương tác Facebook')}
                        className="panel grid grid-cols-2 overflow-hidden xl:grid-cols-4"
                    >
                        <div className="flex min-w-0 flex-col border-b border-r border-border/60 p-4 sm:p-5 xl:border-b-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Bài đăng xác nhận')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <PaperPlaneTilt size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(report.total)}
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {report.pending > 0
                                    ? t('{n} bài chờ đồng bộ mới', { n: formatNumber(report.pending) })
                                    : t('Đã xác thực mã bài đăng')}
                            </p>
                        </div>

                        <div className="flex min-w-0 flex-col border-b border-border/60 p-4 sm:p-5 xl:border-b-0 xl:border-r">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Cảm xúc (Reactions)')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <ThumbsUp size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {metricDisplay(report.totals?.reactions)}
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {measuredReactions}/{report.total} {t('bài đã đo')}
                                {avgReactions !== null ? ` · ~${formatNumber(avgReactions)}/${t('bài')}` : ''}
                            </p>
                        </div>

                        <div className="flex min-w-0 flex-col border-r border-border/60 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Bình luận (Comments)')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <ChatDots size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {metricDisplay(report.totals?.comments)}
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {measuredComments}/{report.total} {t('bài đã đo')}
                                {avgComments !== null ? ` · ~${formatNumber(avgComments)}/${t('bài')}` : ''}
                            </p>
                        </div>

                        <div className="flex min-w-0 flex-col p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Chia sẻ (Shares)')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                                    <ShareFat size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {metricDisplay(report.totals?.shares)}
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {measuredShares}/{report.total} {t('bài đã đo')}
                                {avgShares !== null ? ` · ~${formatNumber(avgShares)}/${t('bài')}` : ''}
                            </p>
                        </div>
                    </section>

                    {/* Cặp Biểu đồ so sánh Trang & Trụ cột */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <FacebookGroupComparisonCard
                            title={t('So sánh theo Trang Facebook')}
                            groups={report.accounts || []}
                            isPage
                            t={t}
                        />
                        <FacebookGroupComparisonCard
                            title={t('So sánh theo Trụ cột nội dung')}
                            groups={report.pillars || []}
                            isPage={false}
                            t={t}
                        />
                    </div>

                    {/* Bảng Top 50 Bài đăng dẫn đầu cảm xúc */}
                    <section className="panel min-w-0 overflow-hidden">
                        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="min-w-0">
                                <h3 className="text-base font-heading font-semibold text-foreground">
                                    {t('Bài đăng dẫn đầu lượt cảm xúc')}
                                </h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {t(
                                        'Tối đa 50 bài đăng. Số liệu là tổng tích lũy trọn đời của bài viết trên Facebook.'
                                    )}
                                </p>
                            </div>
                            <span className="self-start rounded-lg bg-brand-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-ink ring-1 ring-brand-dark/40 sm:self-auto">
                                {formatNumber((report.rows || []).length)} {t('bài viết')}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-zinc-50/70 text-xs font-semibold text-muted-foreground">
                                        <th className="min-w-56 px-5 py-3">{t('Bài đăng')}</th>
                                        <th className="min-w-36 px-4 py-3">{t('Trang & Trụ cột')}</th>
                                        <th className="px-3 py-3 text-right">{t('Reactions')}</th>
                                        <th className="px-3 py-3 text-right">{t('Comments')}</th>
                                        <th className="px-3 py-3 text-right">{t('Shares')}</th>
                                        <th className="min-w-36 px-5 py-3 text-right">
                                            {t('Lần kiểm tra cuối')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                    {(report.rows || []).map((row) => (
                                        <tr key={row.attemptId}>
                                            <td className="px-5 py-3.5">
                                                <Link
                                                    to={`/posts?post=${row.postId}`}
                                                    className="line-clamp-1 font-medium text-foreground hover:underline"
                                                >
                                                    {row.title}
                                                </Link>
                                                <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                                                    <span className="tabular-nums">
                                                        {formatDateTime(row.publishedAt, timezone)}
                                                    </span>
                                                    {row.publishedUrl && (
                                                        <a
                                                            href={row.publishedUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 font-medium text-brand-ink hover:underline"
                                                        >
                                                            <span>{t('Mở Facebook')}</span>
                                                            <ArrowSquareOut size={13} weight="bold" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <p className="max-w-44 truncate text-sm font-medium text-foreground">
                                                    {row.pageName}
                                                </p>
                                                <span className="mt-1 inline-block rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-ink ring-1 ring-brand-dark/30">
                                                    {row.pillarName || t('Chưa phân loại')}
                                                </span>
                                            </td>

                                            {['reactions', 'comments', 'shares'].map((mKey) => {
                                                const mObj = row.metrics?.[mKey];
                                                return (
                                                    <td
                                                        key={mKey}
                                                        className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums"
                                                    >
                                                        <span className="font-semibold text-foreground">
                                                            {metricDisplay(mObj)}
                                                        </span>
                                                        {mObj?.stale && (
                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                {t('Số liệu cũ')}
                                                            </p>
                                                        )}
                                                        {mObj?.error && (
                                                            <p className="mt-0.5 text-xs text-amber-800">
                                                                {mObj.error ===
                                                                'user_content_permission_required'
                                                                    ? t('Thiếu quyền đọc nội dung')
                                                                    : mObj.error === 'permission_required'
                                                                    ? t('Kiểm tra quyền Trang')
                                                                    : t('Chưa khả dụng')}
                                                            </p>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs tabular-nums">
                                                {row.checkedAt ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                                        <CheckCircle
                                                            size={13}
                                                            weight="fill"
                                                            className="text-emerald-600"
                                                        />
                                                        <span>
                                                            {formatCalendarDate(
                                                                new Date(row.checkedAt).toISOString(),
                                                                timezone
                                                            )}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-inset ring-amber-600/25">
                                                        <Clock size={13} weight="fill" />
                                                        <span>{t('Chưa đồng bộ')}</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

function FacebookGroupComparisonCard({ title, groups, isPage, t }) {
    const maxReactions = Math.max(
        ...groups.map((g) => Number(g.totals?.reactions?.value) || 0),
        ...groups.map((g) => Number(g.publications) || 0),
        1
    );

    return (
        <section className="panel flex min-w-0 flex-col p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-ink ring-1 ring-brand-dark/35">
                        {isPage ? (
                            <FacebookLogo size={16} weight="fill" aria-hidden="true" />
                        ) : (
                            <Stack size={16} weight="duotone" aria-hidden="true" />
                        )}
                    </span>
                    <h3 className="truncate text-base font-heading font-semibold text-foreground">
                        {title}
                    </h3>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {formatNumber(groups.length)} {isPage ? t('trang') : t('nhóm')}
                </span>
            </div>

            {groups.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('Chưa có dữ liệu phân nhóm.')}
                </p>
            ) : (
                <ul className="divide-y divide-border/70">
                    {groups.map((g) => {
                        const rVal = g.totals?.reactions?.value;
                        const barMetric = rVal != null ? Number(rVal) : Number(g.publications) || 0;
                        const widthPct =
                            barMetric > 0 ? Math.max(8, Math.round((barMetric / maxReactions) * 100)) : 0;
                        const measured = g.totals?.reactions?.measured || 0;

                        return (
                            <li key={g.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                        {g.name || t('Chưa phân loại')}
                                    </span>
                                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                        {formatNumber(g.publications)} {t('bài')} · {measured}/
                                        {g.publications} {t('đã đo')}
                                    </span>
                                </div>

                                <div className="h-2.5 w-full rounded-full bg-zinc-100">
                                    {widthPct > 0 && (
                                        <div
                                            className="h-2.5 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                            style={{ width: `${widthPct}%` }}
                                        />
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
                                    <span>
                                        {t('Reactions')}:{' '}
                                        <strong className="font-semibold text-foreground">
                                            {metricDisplay(g.totals?.reactions)}
                                        </strong>
                                    </span>
                                    <span>
                                        {t('Comments')}:{' '}
                                        <strong className="font-semibold text-foreground">
                                            {metricDisplay(g.totals?.comments)}
                                        </strong>
                                    </span>
                                    <span>
                                        {t('Shares')}:{' '}
                                        <strong className="font-semibold text-foreground">
                                            {metricDisplay(g.totals?.shares)}
                                        </strong>
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function AnalyticsSkeleton({ t }) {
    return (
        <div aria-busy="true" className="space-y-5">
            <span className="sr-only" role="status">
                {t('Đang tải dữ liệu phân tích')}
            </span>

            <div className="panel grid grid-cols-2 overflow-hidden xl:grid-cols-4">
                {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="space-y-2.5 border-border/60 p-4 sm:p-5">
                        <div className="h-3 w-2/5 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                        <div className="h-6 w-1/3 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                        <div className="h-3 w-3/5 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    </div>
                ))}
            </div>

            <div className="grid items-stretch gap-4 xl:grid-cols-12">
                <div className="panel space-y-4 p-4 sm:p-5 xl:col-span-8">
                    <div className="h-4 w-52 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-48 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
                <div className="panel space-y-4 p-4 sm:p-5 xl:col-span-4">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-48 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <div className="panel space-y-4 p-4 sm:p-5">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-40 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
                <div className="panel space-y-4 p-4 sm:p-5">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-40 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
            </div>
        </div>
    );
}
