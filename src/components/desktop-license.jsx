import { useEffect,useState } from 'react';
import { licenseRequest } from '@/api/desktop/license';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function DesktopLicense() {
    const { t }=useTranslation();const [status,setStatus]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[token,setToken]=useState(''),[remove,setRemove]=useState(false),[notice,setNotice]=useState('');
    useEffect(()=>{let active=true;licenseRequest('status').then(value=>{if(active)setStatus(value);}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[]);
    async function run(action) {
        setBusy(true);setError('');setNotice('');try{const result=await licenseRequest(action,action==='activate'?{token}:{});if(!result.cancelled){if(action==='export-request'){setNotice('Activation request saved. Send this file and your order reference to the software owner.');return;}setStatus(result);setToken('');setRemove(false);window.dispatchEvent(new Event('socialchoice:license'));}}
        catch(error){setError(error.message);}finally{setBusy(false);}
    }
    const license=status?.license;
    return <section className="panel p-5"><h2 className="text-[15px] mb-3">{t('License and edition')}</h2>
        {status?.mode==='prototype'?<p className="text-sm">{t('Prototype build: issuer not configured; no commercial limits are applied.')}</p>:status?.activated?<div className="space-y-2 text-sm"><p>{t('Edition')}: {license.edition}</p><p>{t('Licensed to')}: {license.licensed_to}</p><p>{t('License ID')}: {license.license_id}</p><p>{t('Perpetual offline license')}</p><p>{t('Active brand limit')}: {license.rights.max_active_brands??t('Unlimited')}</p><p>AI: {t(license.rights.ai?'Included':'Not included')} · {t('Media import')}: {t(license.rights.media_import?'Included':'Not included')} · {t('Backup restore')}: {t(license.rights.backup_restore?'Included':'Not included')}</p></div>:<p className="text-sm">{t(status?.message||'Reading and backup export remain available. Activate a license to edit.')}</p>}
        {status&&<p className="text-sm mt-3">{t('One license covers one computer. An additional computer requires another license.')}</p>}
        {status?.machine_error&&<p role="alert" className="text-dangerFg text-sm mt-3">{t(status.machine_error)}</p>}
        {status?.machine_id&&<div className="mt-4"><label htmlFor="license-machine" className="label-xs">{t('Machine ID (send this code to receive your license)')}</label><input id="license-machine" className="w-full mt-2 border rounded-lg p-2 bg-background text-sm" readOnly value={status.machine_id} /></div>}
        <Button variant="outline" className="mt-3" disabled={busy||!status?.machine_id} onClick={()=>run('export-request')}>{t('Export activation request')}</Button>
        {notice&&<p role="status" className="text-sm mt-3">{t(notice)}</p>}
        {status?.mode==='licensed'&&<div className="mt-4 space-y-3"><label htmlFor="license-token" className="text-sm">{t('Paste license token or import the license file')}</label><Textarea id="license-token" rows={3} maxLength={16384} value={token} disabled={busy} onChange={event=>setToken(event.target.value)} /><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy||!token.trim()} onClick={()=>run('activate')}>{t('Activate license')}</Button><Button variant="outline" disabled={busy} onClick={()=>run('import')}>{t('Import license file')}</Button><Button variant="outline" disabled={busy} onClick={()=>setRemove(true)}>{t('Remove license')}</Button></div></div>}
        <Button variant="ghost" className="mt-3" disabled={busy} onClick={()=>run('status')}>{t('Refresh license status')}</Button>
        {busy&&<p role="status" className="label-xs mt-3">{t('Working…')}</p>}{error&&<p role="alert" className="text-dangerFg text-sm mt-3">{t(error)}</p>}
        <ConfirmDialog open={remove} onOpenChange={setRemove} title={t('Remove license?')} description={t('Workspace data stays on this computer. Editing may require activation again. Reading and backup export remain available.')} confirmLabel={t('Remove license')} destructive onConfirm={()=>run('clear')} />
    </section>;
}
