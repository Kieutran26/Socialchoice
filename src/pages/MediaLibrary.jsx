import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { FolderOpen, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import { useCallback, useEffect } from 'react';
import MediaUploader from '@/components/composer/MediaUploader';
import { referencedMediaIds } from '@/lib/publishing-content';
import { formatBytes, formatDay } from '@/lib/format';

export default function MediaLibrary() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [uploadBrand, setUploadBrand] = useState(selectedBrandId === 'all' ? '' : selectedBrandId);
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all');
    const [preview, setPreview] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const query = { ...scope };
        if (type !== 'all') query.file_type = type;
        if (search.trim()) query.name = { $regex: search.trim(), $options: 'i' };
        const page = await appClient.entities.MediaAsset.filter(query, { sort: '-created_date', limit: 100 });
        setAssets(page.items);
        setLoading(false);
    }, [scope, type, search]);

    useEffect(() => {
        const timer = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [load, search]);

    const remove = async () => {
        const references = { Post: 0, PostTemplate: 0 };
        for (const entity of ['Post', 'PostTemplate']) {
            let cursor;
            do {
                const page = await appClient.entities[entity].filter({ brand_id: deleteTarget.brand_id, is_demo: !!deleteTarget.is_demo }, { limit: 250, cursor, fields: ['media_ids', 'platform_media_ids'] });
                references[entity] += page.items.filter(record => referencedMediaIds(record).includes(deleteTarget.id)).length;
                cursor = page.has_more ? page.next_cursor : null;
            } while (cursor);
        }
        if (references.Post || references.PostTemplate) {
            toast({
                variant: 'destructive',
                title: t('This file is still in use'),
                description: t('{posts} posts and {templates} templates reference it. Detach it first.', { posts: references.Post, templates: references.PostTemplate }),
            });
            setDeleteTarget(null);
            return;
        }
        await appClient.entities.MediaAsset.delete(deleteTarget.id);
        toast({ title: t("Media deleted") });
        setDeleteTarget(null);
        load();
    };

    return (
        <>
            <PageHeader
                title={t("Media Library")}
                description={t("Private images and MP4 videos stored in this workspace.")}
            />
            <section className="panel p-4 mb-5"><Label className="label-xs block mb-2">{t('Brand for uploaded images')}</Label><select className="border rounded-lg p-2 mb-3 text-sm" aria-label={t('Brand for uploaded images')} value={uploadBrand} onChange={event => setUploadBrand(event.target.value)} disabled={demoMode}><option value="">{t('Choose brand')}</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><MediaUploader allowLibrary={false} assets={[]} onChange={() => load()} brandId={uploadBrand} demoMode={demoMode} /></section>

            <div className="panel mb-5 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1">
                        <Label className="label-xs mb-1.5 block">{t("Search by file name")}</Label>
                        <div className="relative">
                            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t("Search media")}
                                className="rounded-lg pl-9"
                            />
                        </div>
                    </div>
                    <div className="min-w-[150px]">
                        <Label className="label-xs mb-1.5 block">{t("Type")}</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("Images and video")}</SelectItem>
                                <SelectItem value="image">{t("Images only")}</SelectItem>
                                <SelectItem value="video">{t("Video only")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <span className="label-xs">{assets.length} {t("files")}</span>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((key) => (
                        <Skeleton key={key} className="h-[200px] rounded-2xl" />
                    ))}
                </div>
            ) : !assets.length ? (
                <EmptyState
                    icon={FolderOpen}
                    title={t("No media yet")}
                    description={t("Choose a brand above and upload images. They remain private until you approve a Facebook post.")}
                >
                </EmptyState>
            ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {assets.map((asset) => (
                        <div key={asset.id} className="panel overflow-hidden">
                            <Button variant="ghost" type="button" onClick={() => setPreview(asset)} className="h-auto block w-full p-0">
                                {asset.file_type === 'video' ? (
                                    <video src={asset.file_url} className="h-[150px] w-full object-cover" muted />
                                ) : (
                                    <Image src={asset.file_url} alt={asset.name} className="h-[150px] w-full" fittingType="fill" />
                                )}
                            </Button>
                            <div className="px-3 py-2.5">
                                <p className="truncate text-[12px] font-medium">{asset.name}</p>
                                <p className="label-xs mt-0.5">
                                    {t(asset.file_type)} · {formatBytes(asset.size_bytes)} · {formatDay(asset.created_date)}
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    {asset.is_demo ? <StatusBadge tone="info">{t("Demo")}</StatusBadge> : <span />}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 rounded-md text-[12px] text-dangerFg hover:text-dangerFg"
                                        onClick={() => setDeleteTarget(asset)}
                                    >
                                        <Trash size={13} className="mr-1" /> {t("Delete")} </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={!!preview} onOpenChange={(value) => !value && setPreview(null)}>
                <DialogContent className="rounded-2xl sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle className="text-[16px]">{preview?.name}</DialogTitle>
                    </DialogHeader>
                    {preview?.file_type === 'video' ? (
                        <video src={preview.file_url} controls className="max-h-[420px] w-full rounded-xl bg-muted" />
                    ) : (
                        <Image
                            src={preview?.file_url}
                            alt={preview?.name}
                            className="max-h-[420px] w-full rounded-xl"
                            fittingType="fit"
                        />
                    )}
                    <p className="label-xs">
                        {formatBytes(preview?.size_bytes)} {t("· uploaded")} {formatDay(preview?.created_date)}
                    </p>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t("Delete this file?")}
                description={t("It is removed from the library. Posts that reference it are checked before this happens.")}
                confirmLabel={t("Delete file")}
                destructive
                onConfirm={remove}
            />
        </>
    );
}

