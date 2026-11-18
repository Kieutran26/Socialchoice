import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowsClockwise,
    Article,
    CalendarBlank,
    Check,
    CheckCircle,
    Clock,
    CursorClick,
    Globe,
    Lightning,
    Plus,
    ShareNetwork,
    Sparkle,
    Stack,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { dateKey, formatNumber, formatShortDateTime, percent, relativeTime } from '@/lib/format';
import { todayInZone, toZonedParts } from '@/lib/tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import StatusBadge from '@/components/common/StatusBadge';

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

function cleanPostText(text) {
    if (!text) return '';
    return String(text)
        .replace(/@\[([^\]]+)\](?:\([^)]+\)|\[[^\]]+\])/g, '@$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatScheduleSlot(isoValue, timezone, todayStr, t) {
    if (!isoValue) return { dayLabel: '—', timeLabel: '', isToday: false };
    const parts = toZonedParts(isoValue, timezone);
    if (!parts.date) return { dayLabel: formatShortDateTime(isoValue, timezone), timeLabel: '', isToday: false };

    const tomorrowDate = new Date(`${todayStr}T00:00:00Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    if (parts.date === todayStr) {
        return { dayLabel: t('Hôm nay'), timeLabel: parts.time, isToday: true };
    }
    if (parts.date === tomorrowStr) {
        return { dayLabel: t('Ngày mai'), timeLabel: parts.time, isToday: false };
    }
    const [, month, day] = parts.date.split('-');
    return {
        dayLabel: `${Number(day)}/${Number(month)}`,
        timeLabel: parts.time,
        isToday: false,
    };
}

export default function Overview() {
    const { t } = useTranslation();
    const { scope, brands, switchMode, seeding, timezone } = useWorkspace();
    const activeTimezone = timezone || DEFAULT_TIMEZONE;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [postTab, setPostTab] = useState('auto');
    const [scheduleFilter, setScheduleFilter] = useState('all');
    const [chartTab, setChartTab] = useState('auto');
    const [mixTab, setMixTab] = useState('channels');
    const [trafficRefreshing, setTrafficRefreshing] = useState(false);
    const [openStepIndex, setOpenStepIndex] = useState(null);
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
        const totalClicks = trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
        return { trackingLinks, totalClicks };
    }, [scope, brands]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [statusAgg, pillarAgg, angleAgg, accounts, upcoming, recentPosts, pillars, angles, traffic] =
                await Promise.all([
                    appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
                    appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
                    appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
                    appClient.entities.SocialAccount.filter(scope, { limit: 200 }),
                    appClient.entities.Post.filter(
                        { ...scope, status: { $in: ['scheduled', 'processing'] } },
                        { sort: 'scheduled_at', limit: 12 }
                    ),
                    appClient.entities.Post.filter(scope, { sort: '-created_date', limit: 100 }),
                    appClient.entities.ContentPillar.filter(scope, { limit: 100 }),
                    appClient.entities.ContentAngle.filter(scope, { limit: 200 }),
                    fetchTraffic().catch(() => ({ trackingLinks: [], totalClicks: 0 })),
                ]);

            const byStatus = {};
            statusAgg.rows.forEach((row) => {
                byStatus[row.status] = row.count;
            });
            const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

            setData({
                byStatus,
                total,
                accounts: accounts.items || [],
                upcoming: upcoming.items || [],
                recentPosts: recentPosts.items || [],
                pillarRows: pillarAgg.rows || [],
                angleRows: angleAgg.rows || [],
                pillars: pillars.items || [],
                angles: angles.items || [],
                trackingLinks: traffic.trackingLinks,
                totalClicks: traffic.totalClicks,
            });
        } catch (error) {
            setLoadError(error.message || 'Không tải được dữ liệu tổng quan');
        } finally {
            setLoading(false);
        }
    }, [scope, fetchTraffic]);

    const refreshTraffic = useCallback(
        async ({ showSpinner = false } = {}) => {
            if (trafficInFlightRef.current) return;
            trafficInFlightRef.current = true;
            if (showSpinner) setTrafficRefreshing(true);
            try {
                const traffic = await fetchTraffic();
                setData((prev) =>
                    prev
                        ? { ...prev, trackingLinks: traffic.trackingLinks, totalClicks: traffic.totalClicks }
                        : prev
                );
            } catch {
                // Giữ nguyên số liệu hiện tại khi làm mới ngầm không thành công
            } finally {
                trafficInFlightRef.current = false;
                if (showSpinner) setTrafficRefreshing(false);
            }
        },
        [fetchTraffic]
    );

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const POLL_INTERVAL_MS = 300000;
        let lastRefreshTime = Date.now();

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshTraffic({ showSpinner: false });
                lastRefreshTime = Date.now();
            }
        }, POLL_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastRefreshTime > POLL_INTERVAL_MS) {
                refreshTraffic({ showSpinner: false });
                lastRefreshTime = Date.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshTraffic]);

    const todayStr = useMemo(() => todayInZone(activeTimezone), [activeTimezone]);

    const accounts = data?.accounts || [];
    const connectedCount = accounts.filter((a) => a.connection_status === 'connected').length;
    const demoAccountsCount = accounts.filter((a) => a.connection_status === 'demo').length;
    const readyChannelsCount = connectedCount + demoAccountsCount;
    const disconnectedCount = Math.max(0, accounts.length - readyChannelsCount);

    const totalPosts = data?.total || 0;
    const scheduledCount =
        (data?.byStatus?.scheduled || 0) +
        (data?.byStatus?.processing || 0) +
        (data?.byStatus?.queued || 0);
    const plannedCount = (data?.byStatus?.planned || 0) + (data?.byStatus?.approved || 0);
    const processingCount = data?.byStatus?.processing || 0;
    const publishedCount = data?.byStatus?.published || 0;
    const draftCount =
        (data?.byStatus?.draft || 0) +
        (data?.byStatus?.[''] || 0) +
        (data?.byStatus?.null || 0);
    const cancelledCount = data?.byStatus?.cancelled || 0;
    const failedCount =
        (data?.byStatus?.failed || 0) +
        (data?.byStatus?.partially_published || 0) +
        (data?.byStatus?.unknown || 0);
    const otherStatusCount = Math.max(
        0,
        totalPosts -
            publishedCount -
            scheduledCount -
            plannedCount -
            draftCount -
            cancelledCount -
            failedCount
    );

    const hasContent = totalPosts > 0 || accounts.length > 0;

    const effectivePostTab = useMemo(() => {
        if (postTab !== 'auto') return postTab;
        return (data?.upcoming?.length || 0) > 0 ? 'upcoming' : 'recent';
    }, [postTab, data?.upcoming?.length]);

    const effectiveChartTab = useMemo(() => {
        if (chartTab !== 'auto') return chartTab;
        return (data?.trackingLinks?.length || 0) > 0 ? 'utm' : 'cadence';
    }, [chartTab, data?.trackingLinks?.length]);

    const unassignedPillarPosts = useMemo(() => {
        if (!data) return 0;
        const validIds = new Set((data.pillars || []).map((p) => p.id));
        return (data.pillarRows || []).reduce((sum, row) => {
            if (!row.pillar_id || !validIds.has(row.pillar_id)) {
                return sum + (row.count || 0);
            }
            return sum;
        }, 0);
    }, [data]);

    const attentionItems = useMemo(() => {
        const items = [];
        if (failedCount > 0) {
            items.push({
                id: 'failed-posts',
                title: t('{n} bài xuất bản chưa hoàn tất', { n: failedCount }),
                detail: t('Kiểm tra phản hồi từ nền tảng và xác nhận gửi lại'),
                tone: 'danger',
                badge: t('Cần kiểm tra'),
                to: '/posts?status=failed',
            });
        }
        if (disconnectedCount > 0) {
            items.push({
                id: 'disconnected-channels',
                title: t('{n} kênh cần xác thực kết nối', { n: disconnectedCount }),
                detail: t('Cấp quyền hoặc làm mới phiên đăng nhập để tự động đăng bài'),
                tone: 'warn',
                badge: t('Chưa nối'),
                to: '/accounts',
            });
        }
        if (draftCount > 0) {
            items.push({
                id: 'draft-posts',
                title: t('{n} bản nháp chờ đưa vào lịch', { n: draftCount }),
                detail: t('Hoàn thiện nội dung và chọn giờ phát sóng'),
                tone: 'brand',
                badge: t('Bản nháp'),
                to: '/posts?status=draft',
            });
        }
        if (unassignedPillarPosts > 0 && (data?.pillars?.length || 0) > 0) {
            items.push({
                id: 'unassigned-pillars',
                title: t('{n} bài chưa gắn trụ cột chiến lược', { n: unassignedPillarPosts }),
                detail: t('Phân loại để giữ đúng tỷ trọng nội dung của thương hiệu'),
                tone: 'neutral',
                badge: t('Chiến lược'),
                to: '/strategy?tab=analytics',
            });
        }
        return items;
    }, [failedCount, disconnectedCount, draftCount, unassignedPillarPosts, data?.pillars?.length, t]);

    const attentionTotalCount = failedCount + disconnectedCount + draftCount;

    const filteredUpcoming = useMemo(() => {
        const list = data?.upcoming || [];
        if (scheduleFilter === 'all') return list;

        const weekLimitDate = new Date(`${todayStr}T00:00:00Z`);
        weekLimitDate.setUTCDate(weekLimitDate.getUTCDate() + 7);
        const weekLimitStr = weekLimitDate.toISOString().slice(0, 10);

        return list.filter((post) => {
            if (!post.scheduled_at) return false;
            const pDate = toZonedParts(post.scheduled_at, activeTimezone).date;
            if (scheduleFilter === 'today') return pDate === todayStr;
            if (scheduleFilter === 'week') return pDate >= todayStr && pDate <= weekLimitStr;
            return true;
        });
    }, [data?.upcoming, scheduleFilter, todayStr, activeTimezone]);

    const visibleUpcoming = filteredUpcoming.slice(0, 4);
    const visibleRecent = useMemo(() => (data?.recentPosts || []).slice(0, 4), [data?.recentPosts]);
    const nextPost = data?.upcoming?.[0] || null;

    /* ── Chart 1: Cột 7 ngày (Nhịp bài viết / Clicks UTM) ── */
    const utmChartDays = useMemo(() => {
        const daysMap = {};
        const currentKey = dateKey(new Date(), activeTimezone);
        const [year, month, day] = currentKey.split('-').map(Number);

        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(Date.UTC(year, month - 1, day - i));
            const iso = d.toISOString().slice(0, 10);
            const [, mStr, dStr] = iso.split('-');
            daysMap[iso] = {
                iso,
                label: i === 0 ? t('Hôm nay') : `${Number(dStr)}/${Number(mStr)}`,
                isCurrent: i === 0,
                value: 0,
            };
        }

        (data?.trackingLinks || []).forEach((link) => {
            (link.days || []).forEach((entry) => {
                const key = typeof entry?.day === 'string' ? entry.day.slice(0, 10) : '';
                if (key && daysMap[key]) {
                    daysMap[key].value += entry.clicks || 0;
                }
            });
        });

        const rows = Object.values(daysMap);
        const maxVal = Math.max(...rows.map((r) => r.value), 1);
        const sum7d = rows.reduce((s, r) => s + r.value, 0);
        return { rows, maxVal, sum7d };
    }, [data?.trackingLinks, activeTimezone, t]);

    const cadenceChartDays = useMemo(() => {
        const daysMap = {};
        const currentKey = dateKey(new Date(), activeTimezone);
        const [year, month, day] = currentKey.split('-').map(Number);

        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(Date.UTC(year, month - 1, day - i));
            const iso = d.toISOString().slice(0, 10);
            const [, mStr, dStr] = iso.split('-');
            daysMap[iso] = {
                iso,
                label: i === 0 ? t('Hôm nay') : `${Number(dStr)}/${Number(mStr)}`,
                isCurrent: i === 0,
                value: 0,
            };
        }

        (data?.recentPosts || []).forEach((post) => {
            const rawTs = post.published_at || post.scheduled_at || post.created_date || post.updated_date;
            if (!rawTs) return;
            try {
                const key = dateKey(rawTs, activeTimezone);
                if (key && daysMap[key]) {
                    daysMap[key].value += 1;
                }
            } catch {
                // Bỏ qua mốc thời gian không hợp lệ
            }
        });

        const rows = Object.values(daysMap);
        const maxVal = Math.max(...rows.map((r) => r.value), 1);
        const sum7d = rows.reduce((s, r) => s + r.value, 0);
        return { rows, maxVal, sum7d };
    }, [data?.recentPosts, activeTimezone, t]);

    /* ── Chart 2: Donut cơ cấu trạng thái bài viết (tối đa 4 phần, xếp lớn → nhỏ) ── */
    const statusDonut = useMemo(() => {
        const scheduleAndPlanCount = scheduledCount + plannedCount;
        const remainderCount = cancelledCount + otherStatusCount;
        const fourthSlice =
            failedCount > 0
                ? {
                      id: 'failed',
                      label: t('Cần kiểm tra'),
                      count: failedCount + remainderCount,
                      stroke: '#dc2626',
                      dotClass: 'bg-red-600',
                  }
                : cancelledCount > 0 && otherStatusCount === 0
                ? {
                      id: 'cancelled',
                      label: t('Đã huỷ lịch'),
                      count: cancelledCount,
                      stroke: '#ffe98a',
                      dotClass: 'bg-brand-200 ring-1 ring-brand-dark/60',
                  }
                : {
                      id: 'other',
                      label: t('Đang lên kế hoạch'),
                      count: remainderCount,
                      stroke: '#ffe98a',
                      dotClass: 'bg-brand-200 ring-1 ring-brand-dark/60',
                  };

        const rawSlices = [
            {
                id: 'published',
                label: t('Đã xuất bản'),
                count: publishedCount,
                stroke: '#ffd631',
                dotClass: 'bg-brand ring-1 ring-brand-dark',
            },
            {
                id: 'scheduled',
                label: t('Đã lên lịch'),
                count: scheduleAndPlanCount,
                stroke: '#ca9a04',
                dotClass: 'bg-brand-dark',
            },
            {
                id: 'draft',
                label: t('Bản nháp'),
                count: draftCount,
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
            const rawLen = (slice.count / Math.max(totalPosts, 1)) * circumference;
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
            pct: totalPosts > 0 ? percent(s.count, totalPosts) : 0,
        }));

        return { rows, arcs, radius };
    }, [
        publishedCount,
        scheduledCount,
        plannedCount,
        draftCount,
        cancelledCount,
        failedCount,
        otherStatusCount,
        totalPosts,
        t,
    ]);

    /* ── Chart 3: Đối sánh Mục tiêu vs Thực tế Trụ cột nội dung (Bullet bars màu vàng) ── */
    const pillarSummary = useMemo(() => {
        const pillarItems = data?.pillars || [];
        if (pillarItems.length === 0) return [];
        const countsById = new Map();
        (data?.pillarRows || []).forEach((r) => {
            if (r.pillar_id) {
                countsById.set(r.pillar_id, (countsById.get(r.pillar_id) || 0) + (r.count || 0));
            }
        });
        return pillarItems
            .map((p) => {
                const count = countsById.get(p.id) || 0;
                const actualPct = percent(count, totalPosts);
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
            .slice(0, 5);
    }, [data?.pillars, data?.pillarRows, totalPosts]);

    /* ── Chart 4: Phân bổ theo Kênh xuất bản & Góc tiếp cận (Horizontal Bar Chart) ── */
    const channelDistribution = useMemo(() => {
        const accById = new Map(accounts.map((a) => [a.id, a]));
        const byPlatform = new Map();

        accounts.forEach((acc) => {
            const key = acc.platform || 'other';
            const prev = byPlatform.get(key) || {
                platform: key,
                accountCount: 0,
                connectedCount: 0,
                postCount: 0,
            };
            prev.accountCount += 1;
            if (acc.connection_status === 'connected' || acc.connection_status === 'demo') {
                prev.connectedCount += 1;
            }
            byPlatform.set(key, prev);
        });

        (data?.recentPosts || []).forEach((post) => {
            const platformsInPost = new Set();
            (post.account_ids || []).forEach((id) => {
                const acc = accById.get(id);
                if (acc?.platform) platformsInPost.add(acc.platform);
            });
            platformsInPost.forEach((plat) => {
                const prev = byPlatform.get(plat) || {
                    platform: plat,
                    accountCount: 0,
                    connectedCount: 0,
                    postCount: 0,
                };
                prev.postCount += 1;
                byPlatform.set(plat, prev);
            });
        });

        const rows = Array.from(byPlatform.values()).sort(
            (a, b) => b.postCount - a.postCount || b.accountCount - a.accountCount
        );
        const maxPosts = Math.max(...rows.map((r) => r.postCount), 1);
        const totalAssigned = rows.reduce((s, r) => s + r.postCount, 0);

        return { rows: rows.slice(0, 5), maxPosts, totalAssigned };
    }, [accounts, data?.recentPosts]);

    const angleDistribution = useMemo(() => {
        const angleMap = new Map((data?.angles || []).map((a) => [a.id, a]));
        const counts = new Map();
        (data?.angleRows || []).forEach((r) => {
            if (r.angle_id && angleMap.has(r.angle_id)) {
                counts.set(r.angle_id, (counts.get(r.angle_id) || 0) + (r.count || 0));
            }
        });

        let rows = Array.from(counts.entries())
            .map(([id, count]) => ({
                id,
                name: angleMap.get(id)?.name || '',
                count,
            }))
            .filter((r) => r.name)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        if (rows.length === 0 && (data?.angles?.length || 0) > 0) {
            rows = data.angles.slice(0, 5).map((a) => ({
                id: a.id,
                name: a.name,
                count: 0,
            }));
        }

        const maxCount = Math.max(...rows.map((r) => r.count), 1);
        return { rows, maxCount };
    }, [data?.angles, data?.angleRows]);

    const topLinks = useMemo(() => {
        return [...(data?.trackingLinks || [])]
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 3);
    }, [data?.trackingLinks]);

    const activeLinksCount = useMemo(
        () => (data?.trackingLinks || []).filter((l) => l.active !== false).length,
        [data?.trackingLinks]
    );

    const onboardingSteps = useMemo(() => {
        const hasBrand = brands.length > 0;
        const hasChannel = accounts.length > 0;
        const hasPost = totalPosts > 0;
        return [
            {
                id: 'brand',
                done: hasBrand,
                title: t('Thiết lập thương hiệu'),
                desc: t('Tạo không gian thương hiệu riêng để quản lý kênh, trụ cột nội dung và link rút gọn.'),
                ctaLabel: t('Quản lý thương hiệu'),
                to: '/brands',
            },
            {
                id: 'channel',
                done: hasChannel,
                title: t('Kết nối kênh mạng xã hội'),
                desc: t('Liên kết Facebook, Instagram, Threads, TikTok hoặc LinkedIn để sẵn sàng lên lịch tự động.'),
                ctaLabel: t('Kết nối kênh'),
                to: '/accounts',
            },
            {
                id: 'post',
                done: hasPost,
                title: t('Lên lịch bài viết đầu tiên'),
                desc: t('Soạn bài đa kênh hoặc nhờ AI đề xuất kế hoạch nội dung theo trụ cột của bạn.'),
                ctaLabel: t('Tạo bài viết đầu tiên'),
                to: '/create',
            },
        ];
    }, [brands.length, accounts.length, totalPosts, t]);

    const defaultNextStepIndex = onboardingSteps.findIndex((s) => !s.done);
    const activeStepIndex =
        openStepIndex !== null ? openStepIndex : defaultNextStepIndex === -1 ? 0 : defaultNextStepIndex;

    if (loadError) {
        return (
            <div role="alert" className="panel flex flex-col items-center gap-3 py-10 px-5 text-center">
                <div>
                    <p className="text-sm font-medium text-red-700">{t('Không tải được dữ liệu tổng quan')}</p>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{t(loadError)}</p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100"
                >
                    <ArrowsClockwise size={16} aria-hidden="true" />
                    {t('Thử lại')}
                </button>
            </div>
        );
    }

    const activeChart = effectiveChartTab === 'utm' ? utmChartDays : cadenceChartDays;

    return (
        <div className="space-y-5">
            {/* Đầu trang: Tiêu đề xl + mô tả + nút AI viền vàng nhạt + nút Tạo bài viết vàng thương hiệu */}
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl font-heading font-semibold text-foreground">
                        {t('Tổng quan')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">
                        {loading
                            ? t('Đang đồng bộ nhịp vận hành của không gian làm việc…')
                            : t('Toàn cảnh nhịp xuất bản, tỷ trọng chiến lược và sức khỏe đa kênh.')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                        to="/agent"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-dark/50 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-200"
                    >
                        <Sparkle size={16} weight="fill" aria-hidden="true" />
                        <span>{t('AI lên lịch')}</span>
                    </Link>
                    <Link to="/create" className="btn-skew min-h-10">
                        <Plus size={16} weight="bold" aria-hidden="true" />
                        <span>{t('Tạo bài viết')}</span>
                    </Link>
                </div>
            </header>

            {loading ? (
                isSkeletonVisible ? (
                    <OverviewSkeleton t={t} />
                ) : (
                    <div className="min-h-96" />
                )
            ) : !hasContent ? (
                <section className="panel overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                        <div className="min-w-0">
                            <h2 className="text-base font-heading font-semibold text-foreground">
                                {t('Các bước bắt đầu')}
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {t('{done} / {total} bước hoàn tất', {
                                    done: onboardingSteps.filter((s) => s.done).length,
                                    total: onboardingSteps.length,
                                })}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => switchMode(true)}
                            disabled={seeding || isDesktop()}
                            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {seeding ? t('Đang chuẩn bị…') : t('Tải dữ liệu mẫu')}
                        </button>
                    </div>

                    <div className="px-4 pb-4 sm:px-5">
                        <div
                            role="progressbar"
                            aria-label={t('Tiến độ thiết lập')}
                            aria-valuemin={0}
                            aria-valuemax={onboardingSteps.length}
                            aria-valuenow={onboardingSteps.filter((s) => s.done).length}
                            className="h-2 w-full rounded-full bg-foreground/5"
                        >
                            <div
                                className="h-2 rounded-full bg-brand ring-1 ring-inset ring-brand-dark/50 transition-all"
                                style={{
                                    width: `${percent(
                                        onboardingSteps.filter((s) => s.done).length,
                                        onboardingSteps.length
                                    )}%`,
                                }}
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-border border-t border-border">
                        {onboardingSteps.map((step, idx) => {
                            const isOpen = activeStepIndex === idx;
                            const isPrimaryStep = idx === defaultNextStepIndex;
                            return (
                                <div key={step.id}>
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenStepIndex(isOpen ? -1 : idx)}
                                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                                    >
                                        {step.done ? (
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink ring-1 ring-brand-dark">
                                                <Check size={12} weight="bold" aria-hidden="true" />
                                            </span>
                                        ) : (
                                            <span className="h-5 w-5 shrink-0 rounded-full border-2 border-foreground/35" />
                                        )}
                                        <span
                                            className={`min-w-0 flex-1 text-sm font-medium ${
                                                step.done ? 'text-muted-foreground' : 'text-foreground'
                                            }`}
                                        >
                                            {step.title}
                                        </span>
                                    </button>

                                    <div
                                        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                                            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                        }`}
                                    >
                                        <div className="min-h-0 overflow-hidden">
                                            <div className="pb-4 pl-12 pr-4 sm:pl-13 sm:pr-5">
                                                <p className="text-sm text-muted-foreground text-pretty">
                                                    {step.desc}
                                                </p>
                                                <div className="mt-4">
                                                    <Link
                                                        to={step.to}
                                                        className={
                                                            isPrimaryStep
                                                                ? 'btn-skew min-h-10'
                                                                : 'inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100'
                                                        }
                                                    >
                                                        {step.ctaLabel}
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <>
                    {/* Hàng 1: Dải 4 chỉ số vận hành với điểm nhấn icon vàng thương hiệu */}
                    <section
                        aria-label={t('Chỉ số vận hành chính')}
                        className="panel grid grid-cols-2 overflow-hidden xl:grid-cols-4"
                    >
                        {/* Ô 1: Sắp phát sóng */}
                        <div className="flex min-w-0 flex-col border-b border-r border-border/60 p-4 sm:p-5 xl:border-b-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Sắp phát sóng')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/25 text-brand-ink ring-1 ring-brand-dark/35">
                                    <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(scheduledCount + plannedCount)}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                {processingCount > 0
                                    ? t('{n} bài đang xử lý xuất bản', { n: processingCount })
                                    : nextPost?.scheduled_at
                                    ? `${t('Tiếp theo')}: ${formatShortDateTime(
                                          nextPost.scheduled_at,
                                          nextPost.timezone || activeTimezone
                                      )}`
                                    : plannedCount > 0
                                    ? t('{n} bài trong kế hoạch lịch', { n: formatNumber(plannedCount) })
                                    : t('Chưa có lịch hẹn giờ mới')}
                            </p>
                        </div>

                        {/* Ô 2: Cần xử lý */}
                        <div className="flex min-w-0 flex-col border-b border-border/60 p-4 sm:p-5 xl:border-b-0 xl:border-r">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Cần xử lý')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/25 text-brand-ink ring-1 ring-brand-dark/35">
                                    <Lightning size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(attentionTotalCount)}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                {failedCount > 0 ? (
                                    <span className="font-medium text-red-700">
                                        {t('{n} bài gặp lỗi khi đăng', { n: failedCount })}
                                    </span>
                                ) : disconnectedCount > 0 ? (
                                    <span className="font-medium text-amber-800">
                                        {t('{n} kênh cần xác thực', { n: disconnectedCount })}
                                    </span>
                                ) : draftCount > 0 ? (
                                    <span>{t('{n} bản nháp chờ xếp lịch', { n: draftCount })}</span>
                                ) : (
                                    <span className="font-medium text-emerald-700">
                                        {t('Mọi khâu đều thông suốt')}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Ô 3: Đã xuất bản */}
                        <div className="flex min-w-0 flex-col border-r border-border/60 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Đã xuất bản')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/25 text-brand-ink ring-1 ring-brand-dark/35">
                                    <CheckCircle size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(publishedCount)}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">
                                {t('{pct}% trên tổng {total} bài', {
                                    pct: percent(publishedCount, totalPosts),
                                    total: formatNumber(totalPosts),
                                })}
                            </p>
                        </div>

                        {/* Ô 4: Lượt nhấp UTM */}
                        <div className="flex min-w-0 flex-col p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                    {t('Lượt nhấp UTM')}
                                </p>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/25 text-brand-ink ring-1 ring-brand-dark/35">
                                    <CursorClick size={16} weight="duotone" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-2 font-heading text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
                                {formatNumber(data.totalClicks || 0)}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">
                                {activeLinksCount > 0
                                    ? t('{n} link rút gọn đang theo dõi', { n: formatNumber(activeLinksCount) })
                                    : t('{n} kênh sẵn sàng xuất bản', { n: formatNumber(readyChannelsCount) })}
                            </p>
                        </div>
                    </section>

                    {/* Hàng 2: Cặp Biểu đồ chính (Chart 1: Biểu đồ cột 7 ngày · Chart 2: Biểu đồ Donut cơ cấu bài viết) */}
                    <div className="grid items-stretch gap-4 xl:grid-cols-12">
                        {/* Chart 1 (7 cột): Nhịp độ nội dung / Lượt nhấp UTM 7 ngày (Cột vàng thương hiệu) */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5 xl:col-span-7">
                            <header className="flex items-start justify-between gap-3">
                                <div className="min-h-8 min-w-0">
                                    <h2 className="truncate text-base font-heading font-semibold text-foreground">
                                        {effectiveChartTab === 'utm'
                                            ? t('Lưu lượng nhấp UTM · 7 ngày')
                                            : t('Nhịp độ nội dung · 7 ngày')}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums text-pretty">
                                        {effectiveChartTab === 'utm'
                                            ? t('{n} lượt nhấp ghi nhận trong 7 ngày qua', {
                                                  n: formatNumber(utmChartDays.sum7d),
                                              })
                                            : t('{n} bài được tạo hoặc lên lịch trong 7 ngày qua', {
                                                  n: formatNumber(cadenceChartDays.sum7d),
                                              })}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2.5">
                                    {effectiveChartTab === 'utm' && (data.trackingLinks?.length || 0) > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                aria-label={t('Làm mới số liệu nhấp link')}
                                                aria-busy={trafficRefreshing || undefined}
                                                aria-disabled={trafficRefreshing || undefined}
                                                onClick={(e) => {
                                                    if (trafficRefreshing) {
                                                        e.preventDefault();
                                                        return;
                                                    }
                                                    refreshTraffic({ showSpinner: true });
                                                }}
                                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground/75 transition-colors hover:bg-zinc-100 hover:text-foreground"
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

                                            <Link
                                                to="/shortlinks"
                                                className="inline-flex h-8 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                            >
                                                {t('Quản lý link')}
                                            </Link>
                                        </>
                                    )}

                                    {effectiveChartTab === 'cadence' && totalPosts > 0 && (
                                        <Link
                                            to="/analytics"
                                            className="inline-flex h-8 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                        >
                                            {t('Báo cáo')}
                                        </Link>
                                    )}
                                </div>
                            </header>

                            <div className="mb-4 mt-3">
                                <div
                                    role="group"
                                    aria-label={t('Chọn chỉ số biểu đồ 7 ngày')}
                                    className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={effectiveChartTab === 'cadence'}
                                        onClick={() => setChartTab('cadence')}
                                        className={`min-h-8 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                            effectiveChartTab === 'cadence'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Bài viết')}
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={effectiveChartTab === 'utm'}
                                        onClick={() => setChartTab('utm')}
                                        className={`min-h-8 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                            effectiveChartTab === 'utm'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Clicks UTM')}
                                    </button>
                                </div>
                            </div>

                            {effectiveChartTab === 'utm' && (data.trackingLinks?.length || 0) === 0 ? (
                                <div className="flex min-h-44 flex-1 items-center justify-center">
                                    <p className="py-6 text-center text-sm text-muted-foreground text-pretty">
                                        {t(
                                            'Chưa có link rút gọn UTM nào. Gắn link khi soạn bài để đo lượt nhấp về trang đích.'
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-1 flex-col justify-end space-y-5">
                                    <div
                                        role="img"
                                        aria-label={
                                            effectiveChartTab === 'utm'
                                                ? t('Biểu đồ lượt nhấp UTM 7 ngày, tổng {n} lượt nhấp', {
                                                      n: formatNumber(activeChart.sum7d),
                                                  })
                                                : t('Biểu đồ bài viết 7 ngày, tổng {n} bài', {
                                                      n: formatNumber(activeChart.sum7d),
                                                  })
                                        }
                                    >
                                        <div className="flex h-44 items-end gap-2 sm:gap-3">
                                            {activeChart.rows.map((item) => {
                                                const heightPct =
                                                    item.value > 0
                                                        ? Math.max(
                                                              12,
                                                              Math.round((item.value / activeChart.maxVal) * 100)
                                                          )
                                                        : 0;
                                                return (
                                                    <div
                                                        key={item.iso}
                                                        className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5"
                                                    >
                                                        <p className="text-center text-xs font-semibold tabular-nums text-foreground">
                                                            {formatNumber(item.value)}
                                                        </p>
                                                        {heightPct > 0 ? (
                                                            <div
                                                                className={`mx-auto w-full max-w-9 rounded-t-md ${
                                                                    item.isCurrent
                                                                        ? 'bg-brand/40 ring-1 ring-inset ring-brand-dark/60'
                                                                        : 'bg-brand ring-1 ring-inset ring-brand-dark'
                                                                }`}
                                                                style={{ height: `${heightPct}%` }}
                                                            />
                                                        ) : (
                                                            <div className="mx-auto h-1 w-full max-w-9 rounded-full bg-brand/30" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-2.5 flex gap-2 border-t border-border pt-2.5 sm:gap-3">
                                            {activeChart.rows.map((item, idx) => {
                                                const showOnMobile = idx % 2 === 0;
                                                const isLast = idx === activeChart.rows.length - 1;
                                                return (
                                                    <p
                                                        key={item.iso}
                                                        className={`min-w-0 flex-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground ${
                                                            isLast
                                                                ? 'flex justify-end sm:block sm:text-center'
                                                                : 'text-center'
                                                        } ${showOnMobile ? '' : 'max-sm:invisible'}`}
                                                    >
                                                        {item.label}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {effectiveChartTab === 'utm' && topLinks.length > 0 && (
                                        <div className="border-t border-border pt-4">
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                {t('Link thu hút nhấp nhiều nhất')}
                                            </p>
                                            <ul className="divide-y divide-border">
                                                {topLinks.map((link) => {
                                                    const cfg = PLATFORM_CONFIG[link.platform];
                                                    const IconComp = cfg?.icon || Globe;
                                                    const cleanTarget = link.target
                                                        ? String(link.target).replace(/^https?:\/\//, '')
                                                        : link.url || '';
                                                    return (
                                                        <li
                                                            key={link.id}
                                                            className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0"
                                                        >
                                                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                                <IconComp
                                                                    size={16}
                                                                    weight="duotone"
                                                                    aria-hidden="true"
                                                                    className="shrink-0 text-muted-foreground"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-medium text-foreground">
                                                                        {link.campaign || t('Chiến dịch chung')}
                                                                    </p>
                                                                    {cleanTarget && (
                                                                        <p
                                                                            title={link.target || link.url}
                                                                            className="truncate text-xs text-muted-foreground"
                                                                        >
                                                                            {cleanTarget}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                                                                {formatNumber(link.clicks || 0)}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Chart 2 (5 cột): Biểu đồ Vòng Donut Cơ cấu trạng thái bài viết */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5 xl:col-span-5">
                            <header className="mb-4 flex items-start justify-between gap-3">
                                <div className="min-h-8 min-w-0">
                                    <h2 className="truncate text-base font-heading font-semibold text-foreground">
                                        {t('Cơ cấu quy trình bài viết')}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {t('Tỷ lệ phân bổ theo trạng thái xuất bản')}
                                    </p>
                                </div>

                                <Link
                                    to="/posts"
                                    className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                >
                                    {t('Tất cả bài')}
                                </Link>
                            </header>

                            <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
                                {/* Vòng Donut SVG sắc nét */}
                                <div
                                    role="img"
                                    aria-label={t('Biểu đồ tròn quy trình nội dung, tổng {n} bài viết', {
                                        n: formatNumber(totalPosts),
                                    })}
                                    className="relative flex h-36 w-36 shrink-0 items-center justify-center"
                                >
                                    <svg viewBox="0 0 128 128" className="h-full w-full">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r={statusDonut.radius}
                                            fill="none"
                                            stroke="#f4f4f5"
                                            strokeWidth="18"
                                        />
                                        <g transform="rotate(-90 64 64)">
                                            {statusDonut.arcs.map((arc) => (
                                                <circle
                                                    key={arc.id}
                                                    cx="64"
                                                    cy="64"
                                                    r={statusDonut.radius}
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
                                            {formatNumber(totalPosts)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{t('bài viết')}</span>
                                    </div>
                                </div>

                                {/* Bảng chú giải Donut kèm số đếm và phần trăm */}
                                <ul className="w-full min-w-0 flex-1 divide-y divide-border/70">
                                    {statusDonut.rows.map((row) => (
                                        <li
                                            key={row.id}
                                            className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
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
                                                    {totalPosts > 0 ? `${row.pct}%` : '—'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    </div>

                    {/* Hàng 3: Cặp Biểu đồ Chiến lược & Đa kênh (Chart 3: Bullet Chart Trụ cột · Chart 4: Phân bổ Kênh & Góc tiếp cận) */}
                    <div className="grid items-stretch gap-4 lg:grid-cols-2">
                        {/* Chart 3: Biểu đồ đối sánh Thực tế vs Mục tiêu Trụ cột nội dung */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5">
                            <header className="mb-4 flex items-start justify-between gap-3">
                                <div className="min-h-8 min-w-0">
                                    <h2 className="truncate text-base font-heading font-semibold text-foreground">
                                        {t('Tỷ trọng Trụ cột nội dung')}
                                    </h2>
                                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span
                                                aria-hidden="true"
                                                className="h-2.5 w-2.5 rounded-sm bg-brand ring-1 ring-brand-dark"
                                            />
                                            <span>{t('Thực tế %')}</span>
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <span aria-hidden="true" className="h-3 w-0.5 bg-zinc-900" />
                                            <span>{t('Mục tiêu %')}</span>
                                        </span>
                                    </p>
                                </div>

                                {pillarSummary.length > 0 && (
                                    <Link
                                        to="/strategy"
                                        className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                    >
                                        {t('Chiến lược')}
                                    </Link>
                                )}
                            </header>

                            {pillarSummary.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center py-8">
                                    <p className="text-center text-sm text-muted-foreground text-pretty">
                                        {t('Chưa thiết lập trụ cột nội dung cho thương hiệu này.')}
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {pillarSummary.map((pillar) => {
                                        const isShort = pillar.targetPct > 0 && pillar.gap <= -10;
                                        return (
                                            <li key={pillar.id} className="min-w-0">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <p
                                                        title={pillar.name}
                                                        className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
                                                    >
                                                        {pillar.name}
                                                    </p>
                                                    <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                                        {pillar.actualPct}%
                                                        {pillar.targetPct > 0 && (
                                                            <span className="font-normal text-muted-foreground">
                                                                {' '}
                                                                / {pillar.targetPct}%
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Thanh vàng thực tế kèm vạch đen chỉ tiêu */}
                                                <div className="relative mt-2 h-3 w-full rounded-full bg-zinc-100">
                                                    <div
                                                        className="h-3 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                        style={{
                                                            width: `${Math.min(
                                                                100,
                                                                pillar.actualPct > 0
                                                                    ? Math.max(4, pillar.actualPct)
                                                                    : 0
                                                            )}%`,
                                                        }}
                                                    />
                                                    {pillar.targetPct > 0 && pillar.targetPct <= 100 && (
                                                        <span
                                                            aria-hidden="true"
                                                            title={`${t('Mục tiêu')}: ${pillar.targetPct}%`}
                                                            className="pointer-events-none absolute top-0 h-3 w-0.5 bg-zinc-900"
                                                            style={{ left: `${pillar.targetPct}%` }}
                                                        />
                                                    )}
                                                </div>

                                                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                                                    {t('{n} bài viết', { n: formatNumber(pillar.count) })}
                                                    {isShort && (
                                                        <>
                                                            {' · '}
                                                            <span className="font-medium text-amber-800">
                                                                {t('Thiếu {n} điểm %', {
                                                                    n: Math.abs(pillar.gap),
                                                                })}
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>

                        {/* Chart 4: Biểu đồ Thanh ngang Phân bổ theo Kênh xuất bản / Góc tiếp cận */}
                        <section className="panel flex min-w-0 flex-col p-4 sm:p-5">
                            <header className="flex items-start justify-between gap-3">
                                <div className="min-h-8 min-w-0">
                                    <h2 className="truncate text-base font-heading font-semibold text-foreground">
                                        {mixTab === 'channels'
                                            ? t('Phân bổ nội dung theo Kênh')
                                            : t('Phân bổ theo Góc khai thác')}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {mixTab === 'channels'
                                            ? t('Khối lượng bài viết trên từng nền tảng mạng xã hội')
                                            : t('Các góc tiếp cận được sử dụng nhiều nhất')}
                                    </p>
                                </div>

                                <Link
                                    to={mixTab === 'channels' ? '/accounts' : '/strategy/angles'}
                                    className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                >
                                    {mixTab === 'channels' ? t('Quản lý kênh') : t('Góc nội dung')}
                                </Link>
                            </header>

                            <div className="mb-4 mt-3">
                                <div
                                    role="group"
                                    aria-label={t('Chiều phân tích phân bổ')}
                                    className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={mixTab === 'channels'}
                                        onClick={() => setMixTab('channels')}
                                        className={`min-h-8 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                            mixTab === 'channels'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Theo nền tảng')}
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={mixTab === 'angles'}
                                        onClick={() => setMixTab('angles')}
                                        className={`min-h-8 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                            mixTab === 'angles'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Theo góc tiếp cận')}
                                    </button>
                                </div>
                            </div>

                            {mixTab === 'channels' ? (
                                channelDistribution.rows.length === 0 ? (
                                    <div className="flex flex-1 items-center justify-center py-8">
                                        <p className="text-center text-sm text-muted-foreground">
                                            {t('Chưa có kênh mạng xã hội nào được liên kết.')}
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="space-y-3.5">
                                        {channelDistribution.rows.map((row) => {
                                            const conf = PLATFORM_CONFIG[row.platform];
                                            const IconComp = conf?.icon || ShareNetwork;
                                            const label = conf?.label || row.platform;
                                            const barWidth =
                                                row.postCount > 0
                                                    ? Math.max(
                                                          6,
                                                          Math.round(
                                                              (row.postCount / channelDistribution.maxPosts) *
                                                                  100
                                                          )
                                                      )
                                                    : 0;
                                            return (
                                                <li key={row.platform} className="min-w-0">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/20 text-brand-ink ring-1 ring-brand-dark/35">
                                                                <IconComp
                                                                    size={14}
                                                                    weight="bold"
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                            <span className="truncate text-sm font-medium text-foreground">
                                                                {label}
                                                            </span>
                                                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                                                · {row.accountCount} {t('kênh')}
                                                            </span>
                                                        </div>

                                                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                                            {formatNumber(row.postCount)} {t('bài')}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1.5 h-2.5 w-full rounded-full bg-zinc-100">
                                                        {barWidth > 0 && (
                                                            <div
                                                                className="h-2.5 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                                style={{ width: `${barWidth}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )
                            ) : angleDistribution.rows.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center py-8">
                                    <p className="text-center text-sm text-muted-foreground">
                                        {t('Chưa có dữ liệu góc khai thác nội dung.')}
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-3.5">
                                    {angleDistribution.rows.map((row) => {
                                        const barWidth =
                                            row.count > 0
                                                ? Math.max(
                                                      6,
                                                      Math.round(
                                                          (row.count / angleDistribution.maxCount) * 100
                                                      )
                                                  )
                                                : 0;
                                        return (
                                            <li key={row.id} className="min-w-0">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/20 text-brand-ink ring-1 ring-brand-dark/35">
                                                            <Stack
                                                                size={13}
                                                                weight="duotone"
                                                                aria-hidden="true"
                                                            />
                                                        </span>
                                                        <span
                                                            title={row.name}
                                                            className="truncate text-sm font-medium text-foreground"
                                                        >
                                                            {row.name}
                                                        </span>
                                                    </div>

                                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                                        {formatNumber(row.count)} {t('bài')}
                                                    </span>
                                                </div>

                                                <div className="mt-1.5 h-2.5 w-full rounded-full bg-zinc-100">
                                                    {barWidth > 0 && (
                                                        <div
                                                            className="h-2.5 rounded-full bg-brand ring-1 ring-inset ring-brand-dark"
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>

                    {/* Hàng 4: Khu vực tác nghiệp (Trái 7 cột: Lịch & Bài gần đây · Phải 5 cột: Việc cần chú ý & Trạng thái kênh) */}
                    <div className="grid items-start gap-4 xl:grid-cols-12">
                        {/* Khối tác nghiệp trái: Hàng đợi nội dung */}
                        <section className="panel flex min-w-0 flex-col py-4 sm:py-5 xl:col-span-7">
                            <header className="flex items-center justify-between gap-3 px-4 sm:px-5">
                                <h2 className="min-w-0 truncate text-base font-heading font-semibold text-foreground">
                                    {effectivePostTab === 'upcoming'
                                        ? t('Lịch phát sóng sắp tới')
                                        : t('Bài viết gần đây')}
                                </h2>

                                {effectivePostTab === 'upcoming' && (data.upcoming?.length || 0) > 0 && (
                                    <Link
                                        to="/calendar"
                                        className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                    >
                                        {t('Mở lịch tháng')}
                                    </Link>
                                )}

                                {effectivePostTab === 'recent' && visibleRecent.length > 0 && (
                                    <Link
                                        to="/posts"
                                        className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                    >
                                        {t('Tất cả bài viết')}
                                    </Link>
                                )}
                            </header>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5">
                                <div
                                    role="group"
                                    aria-label={t('Chế độ xem danh sách bài viết')}
                                    className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={effectivePostTab === 'upcoming'}
                                        onClick={() => setPostTab('upcoming')}
                                        className={`min-h-8 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium tabular-nums transition-colors ${
                                            effectivePostTab === 'upcoming'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Sắp tới')} ({formatNumber(data.upcoming?.length || 0)})
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={effectivePostTab === 'recent'}
                                        onClick={() => setPostTab('recent')}
                                        className={`min-h-8 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium tabular-nums transition-colors ${
                                            effectivePostTab === 'recent'
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'text-foreground/75 hover:text-foreground'
                                        }`}
                                    >
                                        {t('Gần đây')}
                                    </button>
                                </div>

                                {effectivePostTab === 'upcoming' && (data.upcoming?.length || 0) > 0 && (
                                    <div
                                        role="group"
                                        aria-label={t('Lọc khoảng ngày lịch đăng')}
                                        className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
                                    >
                                        {[
                                            { id: 'all', label: t('Tất cả') },
                                            { id: 'today', label: t('Hôm nay') },
                                            { id: 'week', label: t('7 ngày') },
                                        ].map((tab) => {
                                            const active = scheduleFilter === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => setScheduleFilter(tab.id)}
                                                    className={`min-h-8 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                                        active
                                                            ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                            : 'text-foreground/75 hover:text-foreground'
                                                    }`}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-2 px-1 sm:px-2">
                                {effectivePostTab === 'upcoming' ? (
                                    (data.upcoming?.length || 0) === 0 ? (
                                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                                            {t('Chưa có bài viết nào được hẹn giờ xuất bản.')}
                                        </p>
                                    ) : visibleUpcoming.length === 0 ? (
                                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                                            {scheduleFilter === 'today'
                                                ? t('Không có bài nào hẹn đăng trong hôm nay.')
                                                : t('Không có bài nào trong 7 ngày tới.')}{' '}
                                            <button
                                                type="button"
                                                onClick={() => setScheduleFilter('all')}
                                                className="inline cursor-pointer font-medium text-foreground underline-offset-4 hover:underline"
                                            >
                                                {t('Xem tất cả lịch')}
                                            </button>
                                        </p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {visibleUpcoming.map((post) => {
                                                const brand = brands.find((b) => b.id === post.brand_id);
                                                const postAccounts = (post.account_ids || [])
                                                    .map((id) => accounts.find((a) => a.id === id))
                                                    .filter(Boolean);
                                                const mediaUrl =
                                                    post.media_urls?.[0] ||
                                                    (Array.isArray(post.media) ? post.media[0]?.url : null);
                                                const slot = formatScheduleSlot(
                                                    post.scheduled_at,
                                                    post.timezone || activeTimezone,
                                                    todayStr,
                                                    t
                                                );
                                                const headline =
                                                    cleanPostText(post.title) ||
                                                    cleanPostText(post.caption) ||
                                                    t('Bài viết chưa đặt tiêu đề');

                                                return (
                                                    <li key={post.id}>
                                                        <Link
                                                            to={`/posts?post=${post.id}`}
                                                            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-100"
                                                        >
                                                            <div className="w-16 shrink-0 tabular-nums">
                                                                <p
                                                                    className={`text-sm font-semibold ${
                                                                        slot.isToday
                                                                            ? 'text-brand-ink'
                                                                            : 'text-foreground/85'
                                                                    }`}
                                                                >
                                                                    {slot.timeLabel || '—'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {slot.dayLabel}
                                                                </p>
                                                            </div>

                                                            {mediaUrl ? (
                                                                <img
                                                                    src={mediaUrl}
                                                                    alt=""
                                                                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                                                                />
                                                            ) : (
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-ink ring-1 ring-brand-dark/35">
                                                                    <Clock
                                                                        size={16}
                                                                        weight="duotone"
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="min-w-0 flex-1">
                                                                <p className="line-clamp-2 text-sm font-medium text-foreground text-pretty">
                                                                    {headline}
                                                                </p>
                                                                <PostMetaLine
                                                                    brand={brand}
                                                                    postAccounts={postAccounts}
                                                                    accountIdsCount={
                                                                        post.account_ids?.length || 0
                                                                    }
                                                                    t={t}
                                                                />
                                                            </div>

                                                            {post.status === 'processing' && (
                                                                <span className="shrink-0 rounded-full bg-brand/30 px-2.5 py-0.5 text-xs font-medium text-brand-ink">
                                                                    {t('Đang đăng')}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )
                                ) : visibleRecent.length === 0 ? (
                                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                                        {t('Chưa có bài viết nào trong không gian làm việc.')}
                                    </p>
                                ) : (
                                    <ul className="space-y-1">
                                        {visibleRecent.map((post) => {
                                            const brand = brands.find((b) => b.id === post.brand_id);
                                            const postAccounts = (post.account_ids || [])
                                                .map((id) => accounts.find((a) => a.id === id))
                                                .filter(Boolean);
                                            const mediaUrl =
                                                post.media_urls?.[0] ||
                                                (Array.isArray(post.media) ? post.media[0]?.url : null);
                                            const headline =
                                                cleanPostText(post.title) ||
                                                cleanPostText(post.caption) ||
                                                t('Bài viết chưa đặt tiêu đề');
                                            const timeRef =
                                                post.published_at ||
                                                post.scheduled_at ||
                                                post.updated_date ||
                                                post.created_date;

                                            return (
                                                <li key={post.id}>
                                                    <Link
                                                        to={`/posts?post=${post.id}`}
                                                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-100"
                                                    >
                                                        {mediaUrl ? (
                                                            <img
                                                                src={mediaUrl}
                                                                alt=""
                                                                className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-ink ring-1 ring-brand-dark/35">
                                                                <Article
                                                                    size={16}
                                                                    weight="duotone"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <p className="line-clamp-2 text-sm font-medium text-foreground text-pretty">
                                                                {headline}
                                                            </p>
                                                            <PostMetaLine
                                                                brand={brand}
                                                                postAccounts={postAccounts}
                                                                accountIdsCount={post.account_ids?.length || 0}
                                                                timeText={timeRef ? relativeTime(timeRef) : ''}
                                                                t={t}
                                                            />
                                                        </div>

                                                        <div className="shrink-0">
                                                            <StatusBadge status={post.status || 'draft'} />
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </section>

                        {/* Khối tác nghiệp phải (5 cột): Việc cần chú ý + Trạng thái kênh */}
                        <div className="grid min-w-0 items-start gap-4 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
                            {/* Việc cần chú ý */}
                            <section className="panel flex min-w-0 flex-col py-4 sm:py-5">
                                <header className="flex items-center justify-between gap-2 px-4 sm:px-5">
                                    <h2 className="text-base font-heading font-semibold text-foreground">
                                        {t('Việc cần chú ý')}
                                    </h2>
                                    {attentionItems.length > 0 && (
                                        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-ink ring-1 ring-brand-dark/50">
                                            {formatNumber(attentionItems.length)}
                                        </span>
                                    )}
                                </header>

                                <div className="mt-2 px-1 sm:px-2">
                                    {attentionItems.length === 0 ? (
                                        <p className="px-3 py-5 text-sm text-muted-foreground text-pretty">
                                            {t(
                                                'Không có việc tồn đọng. Tất cả kênh kết nối và hàng đợi xuất bản đều ổn định.'
                                            )}
                                        </p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {attentionItems.map((item) => {
                                                const badgeToneClass =
                                                    item.tone === 'danger'
                                                        ? 'bg-dangerBg text-dangerFg'
                                                        : item.tone === 'warn'
                                                        ? 'bg-warnBg text-warnFg'
                                                        : item.tone === 'brand'
                                                        ? 'bg-brand/30 text-brand-ink ring-1 ring-brand-dark/40'
                                                        : 'bg-muted text-foreground/75';
                                                return (
                                                    <li key={item.id}>
                                                        <Link
                                                            to={item.to}
                                                            className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-100"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-foreground text-pretty">
                                                                    {item.title}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                                                                    {item.detail}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeToneClass}`}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </section>

                            {/* Kênh xuất bản */}
                            <section className="panel flex min-w-0 flex-col py-4 sm:py-5">
                                <header className="flex items-start justify-between gap-3 px-4 sm:px-5">
                                    <div
                                        className={`flex min-w-0 items-center ${
                                            accounts.length > 0 ? 'min-h-8' : ''
                                        }`}
                                    >
                                        <h2 className="text-base font-heading font-semibold text-foreground">
                                            {t('Trạng thái kênh kết nối')}
                                        </h2>
                                    </div>
                                    {accounts.length > 0 && (
                                        <Link
                                            to="/accounts"
                                            className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-foreground/75 hover:text-foreground hover:underline"
                                        >
                                            {t('Quản lý')}
                                        </Link>
                                    )}
                                </header>

                                <div className="mt-2 px-1 sm:px-2">
                                    {accounts.length === 0 ? (
                                        <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                                            {t('Chưa có kênh mạng xã hội nào được liên kết.')}
                                        </p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {accounts.slice(0, 4).map((acc) => {
                                                const conf = PLATFORM_CONFIG[acc.platform];
                                                const IconComp = conf?.icon || ShareNetwork;
                                                const isConn = acc.connection_status === 'connected';
                                                const isDemo = acc.connection_status === 'demo';
                                                const needsAuth = !isConn && !isDemo;

                                                return (
                                                    <li key={acc.id}>
                                                        <Link
                                                            to="/accounts"
                                                            className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-brand-100"
                                                        >
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-ink ring-1 ring-brand-dark/35">
                                                                <IconComp
                                                                    size={16}
                                                                    weight="duotone"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <p
                                                                    title={acc.name}
                                                                    className="truncate text-sm font-medium text-foreground"
                                                                >
                                                                    {acc.name}
                                                                </p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    <span>
                                                                        {acc.handle || conf?.label || acc.platform}
                                                                    </span>
                                                                    <span aria-hidden="true"> · </span>
                                                                    {needsAuth ? (
                                                                        <span className="font-medium text-amber-800">
                                                                            {t('Cần xác thực')}
                                                                        </span>
                                                                    ) : isConn ? (
                                                                        <span className="text-emerald-700">
                                                                            {t('Hoạt động')}
                                                                        </span>
                                                                    ) : (
                                                                        <span>{t('Mô phỏng')}</span>
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <span
                                                                aria-hidden="true"
                                                                className={`h-2 w-2 shrink-0 rounded-full ${
                                                                    isConn
                                                                        ? 'bg-emerald-600'
                                                                        : isDemo
                                                                        ? 'bg-brand-dark'
                                                                        : 'bg-amber-500'
                                                                }`}
                                                            />
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function PostMetaLine({ brand, postAccounts, accountIdsCount, timeText = '', t }) {
    const channelLabel =
        postAccounts.length > 0
            ? `${postAccounts[0].name}${postAccounts.length > 1 ? ` +${postAccounts.length - 1}` : ''}`
            : accountIdsCount > 0
            ? t('{n} kênh đích', { n: accountIdsCount })
            : '';

    const segments = [brand?.name, channelLabel, timeText].filter(Boolean);
    if (segments.length === 0) return null;

    return (
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {brand && (
                <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: brand.color || '#ffd631' }}
                />
            )}
            <span className="min-w-0 truncate tabular-nums">{segments.join(' · ')}</span>
        </p>
    );
}

function OverviewSkeleton({ t }) {
    return (
        <div aria-busy="true" className="space-y-5">
            <span className="sr-only" role="status">
                {t('Đang tải dữ liệu tổng quan')}
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
                <div className="panel space-y-4 p-4 sm:p-5 xl:col-span-7">
                    <div className="h-4 w-48 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-44 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
                <div className="panel space-y-4 p-4 sm:p-5 xl:col-span-5">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-44 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <div className="panel space-y-4 p-4 sm:p-5">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-36 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
                <div className="panel space-y-4 p-4 sm:p-5">
                    <div className="h-4 w-44 animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none" />
                    <div className="h-36 w-full animate-pulse rounded-xl bg-foreground/5 motion-reduce:animate-none" />
                </div>
            </div>
        </div>
    );
}
