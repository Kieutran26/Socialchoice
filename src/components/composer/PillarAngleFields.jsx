import { useTranslation } from '@/lib/i18n';
import { Target, Compass } from '@phosphor-icons/react';

export default function PillarAngleFields({ pillars, angles, value, onChange }) {
    const { t } = useTranslation();
    const availableAngles = angles.filter((a) => a.pillar_id === value.pillar_id);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label htmlFor="content-pillar-select" className="label-xs mb-1.5 flex items-center gap-1.5 text-foreground">
                    <Target size={14} className="text-muted-foreground" />
                    <span>{t("Pillar")}</span>
                </label>
                <select
                    id="content-pillar-select"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20 outline-none transition-colors"
                    value={value.pillar_id}
                    onChange={(e) => onChange({ pillar_id: e.target.value, angle_id: '' })}
                >
                    <option value="">{t("Unassigned")}</option>
                    {pillars.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="content-angle-select" className="label-xs mb-1.5 flex items-center gap-1.5 text-foreground">
                    <Compass size={14} className="text-muted-foreground" />
                    <span>{t("Angle")}</span>
                </label>
                <select
                    id="content-angle-select"
                    disabled={!value.pillar_id}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20 outline-none transition-colors disabled:opacity-50 disabled:bg-muted"
                    value={value.angle_id}
                    onChange={(e) => onChange({ angle_id: e.target.value })}
                >
                    <option value="">{t("Unassigned")}</option>
                    {availableAngles.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
