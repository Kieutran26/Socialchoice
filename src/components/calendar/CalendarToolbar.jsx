import { useTranslation } from '@/lib/i18n';
import PostFilters from '../posts/PostFilters';
import { Button } from '../ui/button';
import {
    CaretLeft,
    CaretRight,
    CalendarBlank,
    GitCommit,
    CalendarDots,
    ListDashes,
} from '@phosphor-icons/react';

const VIEW_OPTIONS = [
    { id: 'month', label: 'Tháng', key: 'month', icon: CalendarBlank },
    { id: 'channel', label: 'Theo kênh', key: 'channel', icon: GitCommit },
    { id: 'week', label: 'Tuần', key: 'week', icon: CalendarDots },
    { id: 'list', label: 'Danh sách', key: 'list', icon: ListDashes },
];

export default function CalendarToolbar(
    /** @type {import("../component-types").FilterProps & {view: string, setView: (view: string) => void, label: string, onPrev: () => void, onNext: () => void, onToday: () => void}} */
    { view, setView, label, onPrev, onNext, onToday, ...props }
) {
    const { t } = useTranslation();

    return (
        <div className="space-y-3 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-2xs">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('Previous period')}
                            onClick={onPrev}
                            className="size-8 rounded-lg"
                        >
                            <CaretLeft size={14} weight="bold" />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onToday}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-foreground"
                        >
                            {t('Today')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('Next period')}
                            onClick={onNext}
                            className="size-8 rounded-lg"
                        >
                            <CaretRight size={14} weight="bold" />
                        </Button>
                    </div>

                    <h2 className="text-base font-bold text-foreground ml-1 font-heading">
                        {label}
                    </h2>
                </div>

                {/* View Switcher: Tháng (Option A), Theo kênh (Option C), Tuần, Danh sách */}
                <div className="flex items-center rounded-xl border border-border bg-muted/60 p-0.5 shadow-2xs">
                    {VIEW_OPTIONS.map((v) => {
                        const Icon = v.icon;
                        const isActive = view === v.id;
                        const labelText = t(v.key) || v.label;

                        return (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => setView(v.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-card text-foreground font-bold shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground font-medium'
                                }`}
                            >
                                <Icon size={14} weight={isActive ? 'bold' : 'regular'} />
                                <span className="capitalize">{labelText}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Post Filters Bar */}
            <PostFilters {...props} />
        </div>
    );
}
