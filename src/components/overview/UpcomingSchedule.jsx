import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { formatDateTime } from '@/lib/format';
export default function UpcomingSchedule({ posts, brands }) { const { t } = useTranslation(); return <section className="panel p-5"><div className="flex justify-between"><h2 className="text-[15px]">{t("Upcoming schedule")}</h2><Link to="/calendar" className="label-xs underline">{t("View calendar")}</Link></div>{!posts.length && <p className="label-xs mt-4">{t("No upcoming content.")}</p>}{posts.map(p => <Link key={p.id} to={`/posts?post=${p.id}`} className="block border-b py-3"><p className="text-sm">{p.title}</p><p className="label-xs mt-1">{brands.find(b => b.id === p.brand_id)?.name} · {formatDateTime(p.scheduled_at, p.timezone)}</p></Link>)}</section>; }
