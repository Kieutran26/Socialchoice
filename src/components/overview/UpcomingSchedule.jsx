import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { formatDateTime } from '@/lib/format';
import { CalendarDots, ArrowUpRight, Plus, Clock } from '@phosphor-icons/react';

export default function UpcomingSchedule({ posts, brands }) {
    const { t } = useTranslation();

    return (
        <section className="panel p-5 flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="font-heading text-[15px] font-medium text-foreground">
                            {t("Upcoming schedule")}
                        </h2>
                        {posts.length > 0 && (
                            <span className="label-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-medium">
                                {posts.length}
                            </span>
                        )}
                    </div>
                    <Link
                        to="/calendar"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                    >
                        <span>{t("View calendar")}</span>
                        <ArrowUpRight size={13} />
                    </Link>
                </div>

                {/* Empty State */}
                {!posts.length ? (
                    <div className="py-8 px-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground mx-auto mb-3">
                            <CalendarDots size={24} weight="duotone" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{t("No upcoming content.")}</p>
                        <p className="label-xs mt-1 text-muted-foreground max-w-xs mx-auto">
                            {t("Schedule your posts to publish automatically across connected channels.")}
                        </p>
                        <Link to="/create" className="btn-skew mt-4 inline-flex">
                            <Plus size={14} weight="bold" /> {t("New post")}
                        </Link>
                    </div>
                ) : (
                    /* Posts List */
                    <div className="divide-y divide-border/60">
                        {posts.map((p) => {
                            const brand = brands.find((b) => b.id === p.brand_id);
                            return (
                                <Link
                                    key={p.id}
                                    to={`/posts?post=${p.id}`}
                                    className="group flex items-start gap-3.5 py-3 transition-colors hover:bg-muted/30 px-2 rounded-xl -mx-2"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface text-muted-foreground group-hover:border-border transition-colors">
                                        <Clock size={18} weight="duotone" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary-foreground transition-colors">
                                            {p.title || t("Untitled")}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            {brand && (
                                                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                                                    <span
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: brand.color || '#9ca3af' }}
                                                    />
                                                    {brand.name}
                                                </span>
                                            )}
                                            <span className="text-muted-foreground/40">•</span>
                                            <span className="font-mono text-[11px]">
                                                {formatDateTime(p.scheduled_at, p.timezone)}
                                            </span>
                                        </div>
                                    </div>

                                    <ArrowUpRight
                                        size={14}
                                        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                                    />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
