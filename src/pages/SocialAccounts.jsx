import { requireNoTemplateReferences } from '@/lib/post-templates';
import AddChannelDialog, { hasConnectionReturn } from '@/components/accounts/add-channel-dialog';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { PlugsConnected, Plus, Trash, Plugs, WarningCircle } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AddAccountDialog from '@/components/accounts/AddAccountDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONNECTION_LABEL, CONNECTION_TONE, PLATFORM_LABEL } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

export default function SocialAccounts() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [addOpen, setAddOpen] = useState(false);
    const [channelOpen,setChannelOpen]=useState(hasConnectionReturn);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [fixTarget, setFixTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const page = await appClient.entities.SocialAccount.filter(scope, { sort: 'name', limit: 300 });
        setAccounts(page.items);
        setLoading(false);
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const add = async (values) => {
        await appClient.entities.SocialAccount.create({ ...values, is_demo: demoMode });
        toast({ title: t("Destination reference added"), description: t("Planning only. OAuth and publishing are not configured.") });
        setAddOpen(false);
        load();
    };

    const setBrand = async (account, brand_id) => {
        await appClient.entities.SocialAccount.update(account.id, { brand_id });
        toast({ title: t("Brand updated") });
        load();
    };

    const disconnect = async (account) => {
        if (account.credential_id) await (account.platform==='linkedin'?appClient.linkedin:account.platform==='tiktok'?appClient.tiktok:account.platform==='threads'?appClient.threads:appClient.meta).disconnect(account.id);
        else await appClient.entities.SocialAccount.update(account.id, { connection_status: 'disconnected' });
        toast({ title: t("{value1} disconnected", {value1: account.name}), description: t("No new jobs will start for this account. An already started request may still complete.") });
        load();
    };

    const remove = async () => {
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'account_ids', deleteTarget, t);
        const jobs = await appClient.entities.PublishJob.count({ social_account_id: deleteTarget.id });
        if (jobs > 0) {
            toast({
                variant: 'destructive',
                title: t("This destination has publishing history"),
                description: t("Disconnect it instead — published records stay intact."),
            });
            setDeleteTarget(null);
            return;
        }
        await appClient.entities.SocialAccount.delete(deleteTarget.id);
        toast({ title: t("Destination removed") });
        setDeleteTarget(null);
        load();
    };

    const byBrand = brands.map((brand) => ({
        brand,
        items: accounts.filter((account) => account.brand_id === brand.id),
    }));
    const ungrouped = accounts.filter((account) => !brands.some((brand) => brand.id === account.brand_id));

    return (
        <>
            <PageHeader
                title={t("Social Accounts")}
                description={t('Manage connected Facebook, Instagram, Threads, TikTok and LinkedIn accounts by brand.')}
                actions={
                    <button type="button" className="btn-skew" onClick={() => setChannelOpen(true)}>
                        <Plus size={16} weight="duotone" /> {t("Add channel")} </button>
                }
            />

            <div className="space-y-5">
                {loading ? (
                    <Skeleton className="h-[320px] rounded-2xl" />
                ) : !accounts.length ? (
                    <EmptyState
                        icon={PlugsConnected}
                        title={t("No destinations yet")}
                        description={t("Connect your social accounts and group them by brand. Accounts appear here after you approve the connection.")}
                    >
                        <Button variant="outline" type="button" className="" onClick={() => setChannelOpen(true)}>
                            <Plus size={15} weight="bold" /> {t("Add channel")} </Button>
                    </EmptyState>
                ) : (
                    <>
                        {[...byBrand, { brand: null, items: ungrouped }]
                            .filter((group) => group.items.length)
                            .map((group) => (
                                <section key={group.brand?.id || 'ungrouped'} className="panel p-5">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: group.brand?.color || '#EAEAEA' }} />
                                        <h2 className="text-[15px]">{group.brand?.name || t("No brand assigned")}</h2>
                                        <span className="label-xs">
                                            · {group.items.length} {t("destination")}{group.items.length === 1 ? '' : t("s")}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {group.items.map((account) => (
                                            <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                                <div className="min-w-[200px] flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[13px] font-medium">{account.name}</p>
                                                        <StatusBadge tone={CONNECTION_TONE[account.connection_status]}>
                                                            {CONNECTION_LABEL[account.connection_status]}
                                                        </StatusBadge>
                                                        {account.connection_status === 'connected' ? null : (
                                                            <span className="label-xs">
                                                                <WarningCircle size={12} className="mr-1 inline" /> {t("not delivering")} </span>
                                                        )}
                                                    </div>
                                                    <p className="label-xs mt-1">
                                                        {PLATFORM_LABEL[account.platform] || account.platform} · {account.username || t('no handle')}
                                                        {account.followers ? t(" · {value1} followers", {value1: formatNumber(account.followers)}) : ''}
                                                        {account.external_id ? ` · ID ${account.external_id}` : ''}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Select value={account.brand_id} onValueChange={(value) => setBrand(account, value)}>
                                                        <SelectTrigger className="h-8 w-[170px] rounded-lg text-[12px]">
                                                            <SelectValue placeholder={t("Assign brand")} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {brands.map((brand) => (
                                                                <SelectItem key={brand.id} value={brand.id}>
                                                                    {brand.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {account.connection_status !== 'demo' ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 rounded-lg text-[12px]"
                                                                onClick={() => {
                                                                    if (!account.credential_id) return setFixTarget(account);
                                                                    (account.platform==='linkedin'?appClient.linkedin.start(account.brand_id):account.platform==='tiktok'?appClient.tiktok.start(account.brand_id):account.platform==='threads'?appClient.threads.start(account.brand_id):appClient.meta.start(account.brand_id, account.platform)).then(result => window.location.assign(result.url)).catch(e => toast({ variant: 'destructive', title: t(e.message) }));
                                                                }}
                                                            > {t("Fix connection")} </Button>
                                                            {account.credential_id && <Button variant="outline" size="sm" onClick={async () => {
                                                                try { await (account.platform==='linkedin'?appClient.linkedin:account.platform==='tiktok'?appClient.tiktok:account.platform==='threads'?appClient.threads:appClient.meta).check(account.id); toast({ title: t(account.platform==='linkedin'?'LinkedIn access verified':account.platform==='tiktok'?'TikTok access verified':account.platform==='threads'?'Threads access verified':account.platform === 'instagram' ? 'Instagram access verified' : 'Facebook Page access verified') }); }
                                                                catch (e) { toast({ variant: 'destructive', title: t(e.message) }); }
                                                                finally { load(); }
                                                            }}>{t(account.platform==='linkedin'?'Check LinkedIn access':account.platform==='tiktok'?'Check TikTok access':account.platform==='threads'?'Check Threads access':account.platform === 'instagram' ? 'Check Instagram access' : 'Check Facebook access')}</Button>}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 rounded-lg text-[12px]"
                                                                disabled={account.connection_status === 'disconnected'}
                                                                onClick={() => disconnect(account)}
                                                            >
                                                                <Plugs size={13} className="mr-1.5" /> {t("Disconnect")} </Button>
                                                        </>
                                                    ) : (
                                                        <span className="label-xs">{t("Sample destination")}</span>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[12px] text-dangerFg hover:text-dangerFg"
                                                        onClick={() => setDeleteTarget(account)}
                                                    >
                                                        <Trash size={13} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                    </>
                )}
            </div>

            <AddChannelDialog open={channelOpen} onOpenChange={setChannelOpen} brands={brands} defaultBrandId={selectedBrandId === 'all' ? '' : selectedBrandId} demoMode={demoMode} onChanged={load} onAddManually={() => {setChannelOpen(false);setAddOpen(true);}} />

            <AddAccountDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                brands={brands}
                defaultBrandId={selectedBrandId === 'all' ? '' : selectedBrandId}
                onSubmit={add}
            />

            <AddAccountDialog
                open={!!fixTarget}
                onOpenChange={(value) => !value && setFixTarget(null)}
                brands={brands}
                defaultBrandId={fixTarget?.brand_id}
                initial={fixTarget}
                title={t("Reconnect this destination")}
                description={t("Confirm the Page details and mark it for reconnection. No fake reconnect happens: it stays in configuration required until the Meta connection is enabled for this workspace.")}
                submitLabel={t('Mark for reconnection')}
                onSubmit={async (values) => {
                    await appClient.entities.SocialAccount.update(fixTarget.id, {
                        connection_status: 'configuration_required',
                        name: values.name,
                        username: values.username,
                        external_id: values.external_id,
                        brand_id: values.brand_id,
                        followers: values.followers,
                    });
                    toast({
                        title: t("Destination marked for reconnection"),
                        description: t("It stays in configuration required until the Meta connection is enabled for this workspace."),
                    });
                    setFixTarget(null);
                    load();
                }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t("Remove {value1}?", {value1: deleteTarget?.name})}
                description={t("Only destinations without publishing history can be removed. Otherwise disconnect instead.")}
                confirmLabel={t("Remove destination")}
                destructive
                onConfirm={remove}
            />
        </>
    );
}
