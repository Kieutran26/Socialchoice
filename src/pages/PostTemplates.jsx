import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CopySimple, NotePencil, PencilSimple, Trash } from '@phosphor-icons/react';
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
    const { t } = useTranslation(), { scope, brands } = useWorkspace(), { toast } = useToast();
    const navigate = useNavigate(), request = useRef(0);
    const [rows, setRows] = useState([]), [search, setSearch] = useState(''), [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
    const [rename, setRename] = useState(null), [name, setName] = useState(''), [remove, setRemove] = useState(null);
    useEffect(() => {
        const id = ++request.current; let active = true;
        setRows([]); setCursor(null); setLoading(true); setError(''); setRename(null); setRemove(null);
        appClient.entities.PostTemplate.filter({ ...scope, ...(search.trim() ? { name: { $regex: search.trim() } } : {}) }, { sort: '-updated_date', limit: 50 })
            .then(page => { if (active && request.current === id) { setRows(page.items); setCursor(page.next_cursor); } })
            .catch(failure => { if (active) setError(failure.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; request.current++; };
    }, [scope, search, refresh]);
    async function more() {
        const id = request.current; setLoading(true);
        try {
            const page = await appClient.entities.PostTemplate.filter({ ...scope, ...(search.trim() ? { name: { $regex: search.trim() } } : {}) }, { sort: '-updated_date', limit: 50, cursor });
            if (id === request.current) { setRows(current => [...current, ...page.items]); setCursor(page.next_cursor); }
        } catch (failure) { if (id === request.current) setError(failure.message); }
        finally { if (id === request.current) setLoading(false); }
    }
    async function startFromTemplate(template) {
        setBusy(true); setError('');
        try {
            const { post, warnings } = await appClient.templates.createDraft(template.id);
            toast({ title: t('Draft created from template'), description: warnings?.length ? warnings.map(warning => t(warning)).join(' ') : t('Review the accounts, media and a new publishing time before publishing.') });
            navigate('/create?edit=' + post.id);
        } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
    }
    async function saveName(event) {
        event.preventDefault(); setBusy(true); setError('');
        try { await appClient.entities.PostTemplate.update(rename.id, { name: name.trim() }); setRename(null); setRefresh(value => value + 1); }
        catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
    }
    return <>
        <PageHeader title={t('Post templates')} description={t('Reuse brand content as a new draft. Templates never keep publishing schedules or TikTok choices.')} actions={<Link to="/create" className="btn-skew"><NotePencil size={16} weight="duotone" />{t('Compose a template')}</Link>} />
        <label className="block text-xs mb-5 max-w-md">{t('Search templates')}<Input className="mt-2" value={search} onChange={event => setSearch(event.target.value)} /></label>
        {error && <div role="alert" className="mb-4 space-y-2"><p className="text-sm text-dangerFg">{t(error)}</p><Button variant="outline" disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>{t('Try again')}</Button></div>}
        {loading && !rows.length ? <p role="status" className="label-xs">{t('Loading…')}</p> : !rows.length ? (!error && <EmptyState icon={CopySimple} title={t(search.trim() ? 'No matching templates' : 'No templates yet')} description={t(search.trim() ? 'Try a different template name.' : 'Open Create Post, compose reusable content and choose Save as template.')} />) :
            <div className="space-y-3">{rows.map(template => <article key={template.id} className="panel p-5 min-w-0">
                <h2 className="text-[15px] break-words">{template.name}</h2>
                <p className="label-xs mt-1">{brands.find(brand => brand.id === template.brand_id)?.name || t('Brand')} · {t('{count} media files', { count: referencedMediaIds(template).length })}</p>
                <p className="text-sm whitespace-pre-wrap break-words mt-3 line-clamp-3">{template.caption || t('No caption')}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" disabled={busy} onClick={() => startFromTemplate(template)}>{t('Use template')}</Button>
                    <Button variant="ghost" disabled={busy} onClick={() => { setRename(template); setName(template.name); setError(''); }}><PencilSimple size={16} weight="duotone" />{t('Rename')}</Button>
                    <Button variant="ghost" disabled={busy} className="text-dangerFg" onClick={() => setRemove(template)}><Trash size={16} weight="duotone" />{t('Delete')}</Button>
                </div>
            </article>)}</div>}
        {cursor && <Button variant="outline" className="mt-4" disabled={loading || busy} onClick={more}>{t('Load more')}</Button>}
        <Dialog open={!!rename} onOpenChange={value => !value && !busy && setRename(null)}><DialogContent><DialogHeader><DialogTitle>{t('Rename template')}</DialogTitle></DialogHeader><form onSubmit={saveName} className="space-y-4"><label className="block text-xs">{t('Template name')}<Input className="mt-2" required maxLength={160} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setRename(null)}>{t('Cancel')}</Button><button type="submit" className="btn-skew" disabled={busy || !name.trim()}>{t(busy ? 'Saving…' : 'Save')}</button></div></form></DialogContent></Dialog>
        <ConfirmDialog open={!!remove} onOpenChange={value => !value && setRemove(null)} title={t('Delete template?')} description={t('This removes the template only. Existing drafts, published posts and media files remain.')} confirmLabel="Delete template" destructive onConfirm={async () => { await appClient.entities.PostTemplate.delete(remove.id); setRemove(null); setRefresh(value => value + 1); }} />
    </>;
}
