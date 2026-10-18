import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
export default function DemoModeSwitch() { const { t } = useTranslation();
    const { demoMode, switchMode, seeding } = useWorkspace();
    return <div className="space-y-2"><p className="label-xs">{demoMode ? t("Sample workspace — simulated data, never live publishing.") : t("Local workspace — saved planning data, no social connection.")}</p>
        <Button variant="ghost" type="button" className="h-auto rounded-lg border px-3 py-2 text-xs" disabled={seeding} onClick={() => switchMode(!demoMode)}>{demoMode ? t("Return to real workspace") : t("Explore labeled sample data")}</Button>
    </div>;
}
