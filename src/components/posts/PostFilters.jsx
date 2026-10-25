import { isDesktop } from '@/api/desktop/runtime';
import { useTranslation } from '@/lib/i18n';
import { POST_STATUS_LABEL, PLATFORMS } from '@/lib/constants';
export default function PostFilters(/** @type {import("../component-types").FilterProps} */ { filters, setFilters, pillars = [], angles = [], accounts = [] }) { const { t } = useTranslation();
    const allLabels = { status: 'All statuses', platform: 'All platforms', account_id: 'All destinations', pillar_id: 'All pillars', angle_id: 'All angles' };
    /** @type {[string, string, import("../component-types").EntityRecord[]][]} */
    const fields = [['status', 'Status', Object.entries(POST_STATUS_LABEL).filter(([key]) => !isDesktop() || ['draft','scheduled','cancelled'].includes(key)).map(([id, name]) => ({ id, name }))], ['platform', 'Platform', PLATFORMS.map(p => ({ id: p.value, name: p.label }))], ['account_id', 'Destination', accounts], ['pillar_id', 'Pillar', pillars], ['angle_id', 'Angle', angles.filter(a => filters.pillar_id === 'all' || a.pillar_id === filters.pillar_id)]];
    return <div className="panel p-4 mb-5 flex flex-wrap gap-3">{'search' in filters && <label className="text-xs flex-1 min-w-40">{t("Search")}<input aria-label={t("Search posts")} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder={t("Title or caption")} className="border rounded-lg p-2 w-full mt-1 bg-white" /></label>}{fields.filter(([key]) => key in filters && (!isDesktop() || !['platform','account_id'].includes(key))).map(([key, label, options]) => <label className="text-xs min-w-32 flex-1" key={key}>{t(label)}<select className="border rounded-lg p-2 w-full mt-1 bg-white" value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value, ...(key === 'pillar_id' ? { angle_id: 'all' } : {}) })}><option value="all">{t(allLabels[key])}</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>)}</div>;
}

