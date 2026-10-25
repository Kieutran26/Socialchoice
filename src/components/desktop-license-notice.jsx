import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { licenseRequest } from '@/api/desktop/license';
import { useTranslation } from '@/lib/i18n';
export default function DesktopLicenseNotice(){
    const {t}=useTranslation();const [status,setStatus]=useState(null),[error,setError]=useState('');
    useEffect(()=>{let active=true;const load=()=>licenseRequest('status').then(value=>{if(active){setStatus(value);setError('');}}).catch(error=>{if(active)setError(error.message);});load();window.addEventListener('socialchoice:license',load);return()=>{active=false;window.removeEventListener('socialchoice:license',load);};},[]);
    if(!error&&(!status||status.mode==='prototype'||status.activated))return null;
    return <div role="status" className="panel mb-5 p-4 text-sm"><p>{t(error||status.message)}</p><Link to="/settings" className="underline mt-2 inline-block">{t('License and edition')}</Link></div>;
}
