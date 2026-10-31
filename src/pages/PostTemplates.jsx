import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    CopySimple,
    NotePencil,
    PencilSimple,
    Trash,
    Plus,
    MagnifyingGlass,
    Images,
    Play,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { referencedMediaIds } from '@/lib/publishing-content';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PostTemplates() {
    const { t } = useTranslation();
    const { scope, brands } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const request = useRef(0);

    const [rows, setRows] = useState([]);
    const [mediaMap, setMediaMap] = useState({});
    const [search, setSearch] = useState('');
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [rename, setRename] = useState(null);
    const [name, setName] = useState('');
    const [remove, setRemove] = useState(null);

    useEffect(() => {
        const id = ++request.current;
        let active = true;
        setRows([]);
        setCursor(null);
        setLoading(true);
        setError('');
        setRename(null);
        setRemove(null);

        appClient.entities.PostTemplate.filter(
            { ...scope, ...(search.trim() ? { name: { $regex: search.trim() } } : {}) },
            { sort: '-updated_date', limit: 50 }
        )
            .then((page) => {
                if (active && request.current === id) {
                    setRows(page.items);
                    setCursor(page.next_cursor);
                }
            })
            .catch((failure) => {
                if (active) setError(failure.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            request.current++;
        };
    }, [scope, search, refresh]);

    // Load media for templates
    useEffect(() => {
        const ids = [...new Set(rows.flatMap((item) => referencedMediaIds(item)))];
        if (!ids.length) {
            setMediaMap({});
            return;
        }
        let active = true;
        appClient.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 100 })
            .then((page) => {
                if (!active) return;
                const map = {};
                page.items?.forEach((m) => {
                    map[m.id] = m;
                });
                setMediaMap(map);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [rows]);

    async function more() {
        const id = request.current;
        setLoading(true);
        try {
            const page = await appClient.entities.PostTemplate.filter(
                { ...scope, ...(search.trim() ? { name: { $regex: search.trim() } } : {}) },
                { sort: '-updated_date', limit: 50, cursor }
            );
            if (id === request.current) {
                setRows((current) => [...current, ...page.items]);
                setCursor(page.next_cursor);
            }
        } catch (failure) {
            if (id === request.current) setError(failure.message);
        } finally {
            if (id === request.current) setLoading(false);
        }
    }

    async function startFromTemplate(template) {
        setBusy(true);
        setError('');
        try {
            const { post, warnings } = await appClient.templates.createDraft(template.id);
            toast({
                title: t('Draft created from template'),
                description: warnings?.length
                    ? warnings.map((warning) => t(warning)).join(' ')
                    : t('Review the accounts, media and a new publishing time before publishing.'),
            });
            navigate('/create?edit=' + post.id);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    async function saveName(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await appClient.entities.PostTemplate.update(rename.id, { name: name.trim() });
            setRename(null);
            setRefresh((value) => value + 1);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader
                title={t('Post templates')}
                description={t(
                    'Reuse brand content as a new draft. Templates never keep publishing schedules or TikTok choices.'
                )}
                actions={
                    <Link to="/templates/create" className="btn-skew">
                        <NotePencil size={16} weight="duotone" />
                        {t('Compose a template')}
                    </Link>
                }
            />

            {/* Search Bar */}
            <div className="relative mb-5 max-w-md">
                <MagnifyingGlass
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                    className="pl-9 h-10 rounded-xl bg-white text-xs border-border"
                    placeholder={t('Search templates…')}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            {error && (
                <div role="alert" className="mb-4 space-y-2 panel p-4 border-dangerBg">
                    <p className="text-sm text-dangerFg">{t(error)}</p>
                    <Button variant="outline" size="sm" disabled={loading || busy} onClick={() => setRefresh((v) => v + 1)}>
                        {t('Try again')}
                    </Button>
                </div>
            )}

            {loading && !rows.length ? (
                <div className="panel p-8 text-center text-xs text-muted-foreground">
                    {t('Loading…')}
                </div>
            ) : !rows.length ? (
                !error && (
                    <EmptyState
                        icon={CopySimple}
                        title={t(search.trim() ? 'No matching templates' : 'No templates yet')}
                        description={t(
                            search.trim()
                                ? 'Try a different template name.'
                                : 'Compose reusable content and save it as a template to speed up creating future posts.'
                        )}
                    >
                        <Button asChild className="btn-skew mt-3">
                            <Link to="/templates/create">
                                <Plus size={16} weight="bold" /> {t('Compose a template')}
                            </Link>
                        </Button>
                    </EmptyState>
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rows.map((template) => {
                        const brand = brands.find((b) => b.id === template.brand_id);
                        const mediaIds = referencedMediaIds(template);
                        const firstMedia = mediaIds.length ? mediaMap[mediaIds[0]] : null;
                        const isVideo = firstMedia?.file_type === 'video';

                        return (
                            <article
                                key={template.id}
                                className="panel p-5 min-w-0 bg-card border border-border rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    {/* Header: Title + Brand */}
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h2 className="font-heading font-semibold text-[15px] text-foreground break-words line-clamp-1">
                                            {template.name}
                                        </h2>
                                        {brand && (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground shrink-0 rounded-md bg-muted/60 px-2 py-0.5">
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: brand.color || '#9ca3af' }}
                                                />
                                                <span className="truncate max-w-[100px]">{brand.name}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Media preview if attached */}
                                    {firstMedia && (
                                        <div className="relative h-32 w-full rounded-xl overflow-hidden border border-border/80 bg-muted/60 my-3">
                                            {isVideo ? (
                                                <div className="relative w-full h-full">
                                                    <video
                                                        src={firstMedia.file_url}
                                                        className="w-full h-full object-cover"
                                                        preload="metadata"
                                                    />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                                        <Play size={16} weight="fill" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={firstMedia.file_url}
                                                    alt={template.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            {mediaIds.length > 1 && (
                                                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                                    <Images size={11} weight="bold" />
                                                    <span>{mediaIds.length}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Caption Preview */}
                                    <p className="text-xs text-foreground/85 whitespace-pre-wrap break-words line-clamp-3 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/40 my-2">
                                        {template.caption || <span className="italic text-muted-foreground">{t('No caption')}</span>}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50 mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg text-xs gap-1.5"
                                        disabled={busy}
                                        onClick={() => startFromTemplate(template)}
                                    >
                                        <CopySimple size={14} weight="duotone" />
                                        <span>{t('Use template')}</span>
                                    </Button>

                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg text-xs gap-1.5"
                                        disabled={busy}
                                    >
                                        <Link to={`/templates/create?edit=${template.id}`}>
                                            <PencilSimple size={14} weight="duotone" />
                                            <span>{t('Edit template')}</span>
                                        </Link>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                                        disabled={busy}
                                        onClick={() => {
                                            setRename(template);
                                            setName(template.name);
                                            setError('');
                                        }}
                                    >
                                        {t('Rename')}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 rounded-lg text-xs text-dangerFg hover:text-dangerFg ml-auto"
                                        disabled={busy}
                                        onClick={() => setRemove(template)}
                                    >
                                        <Trash size={14} weight="duotone" />
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {cursor && (
                <Button variant="outline" className="mt-4 rounded-xl text-xs" disabled={loading || busy} onClick={more}>
                    {t('Load more')}
                </Button>
            )}

            {/* Rename Modal */}
            <Dialog open={!!rename} onOpenChange={(value) => !value && !busy && setRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Rename template')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveName} className="space-y-4">
                        <label className="block text-xs">
                            {t('Template name')}
                            <Input
                                className="mt-2 rounded-xl text-xs"
                                required
                                maxLength={160}
                                disabled={busy}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                            />
                        </label>
                        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" disabled={busy} onClick={() => setRename(null)}>
                                {t('Cancel')}
                            </Button>
                            <button type="submit" className="btn-skew" disabled={busy || !name.trim()}>
                                {t(busy ? 'Saving…' : 'Save')}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!remove}
                onOpenChange={(value) => !value && setRemove(null)}
                title={t('Delete template?')}
                description={t(
                    'This removes the template only. Existing drafts, published posts and media files remain.'
                )}
                confirmLabel="Delete template"
                destructive
                onConfirm={async () => {
                    await appClient.entities.PostTemplate.delete(remove.id);
                    setRemove(null);
                    setRefresh((value) => value + 1);
                }}
            />
        </>
    );
}
