import { useTranslation } from '@/lib/i18n';
import { relativeTime } from '@/lib/format';
export default function RecentActivity({ logs }) { const { t } = useTranslation(); return <section className="panel p-5"><h2 className="text-[15px]">{t("Recent activity")}</h2>{!logs.length && <p className="label-xs mt-4">{t("No publishing activity recorded.")}</p>}{logs.map(l => <div key={l.id} className="border-b py-3"><p className="text-xs">{t(l.message || l.error_message || l.event || l.status)}</p><p className="label-xs mt-1">{relativeTime(l.occurred_at || l.created_date)}</p></div>)}</section>; }
