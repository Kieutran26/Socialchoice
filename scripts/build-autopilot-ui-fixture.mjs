import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// Separate visual fixture. No credentials, backend data, or provider calls.
const directory=resolve('.test-tools/autopilot-staging/preview-src');
mkdirSync(directory,{recursive:true});
writeFileSync(join(directory,'index.html'),'<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Autopilot UI acceptance fixture</title></head><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>');
writeFileSync(join(directory,'main.jsx'),`import React from 'react';
import {createRoot} from 'react-dom/client';
import AutopilotLibrary from '@/components/media/AutopilotLibrary';
import {appClient} from '@/api/app-client';
import '@/index.css';
const sources=[{id:'fixture-storage',name:'Tài sản chiến dịch tháng 11',kind:'r2',folder:'campaigns/',status:'connected',last_synced_at:'2026-10-31T10:00:00Z'},{id:'fixture-drive',name:'Google Drive cần kết nối',kind:'drive',folder:'fixture-folder',status:'disconnected'}];
const assets=[{id:'fixture-image',source_id:'fixture-storage',name:'Bo-nhan-dien-chien-dich-thang-11-phien-ban-duyet-noi-dung-cho-mang-xa-hoi.png',mime:'image/png',size:1048576,availability:'available',analysis_status:'analyzed',review:'pending',analysis:{summary:'Ảnh minh họa phục vụ nghiệm thu giao diện. Dữ liệu trong màn hình này là dữ liệu mô phỏng.',tags:['Chiến dịch','Nội dung','Thương hiệu'],ocr:'SOCIALCHOICE',suggested_uses:['Bài giới thiệu thương hiệu','Ảnh cho lịch nội dung'],warnings:['Cần người dùng kiểm tra trước khi sử dụng.'],provider:'fixture',model:'no-provider-call',analyzed_at:'2026-10-31T10:00:00Z'}},{id:'fixture-video',source_id:'fixture-storage',name:'video-gioi-thieu.mp4',mime:'video/mp4',size:7340032,availability:'available',analysis_status:'not_analyzed',review:'pending'}];
const jobs=[{id:'fixture-job',kind:'sync',status:'done'}];
appClient.autopilot.call=async(operation,input={})=>{
 if(operation==='status')return{enabled:true,ready:true,driveReady:false,storageReady:true,backgroundReady:true,storagePrefix:'fixture/'};
 if(operation==='list'){const filtered=assets.filter(a=>[a.name,a.analysis?.summary,...(a.analysis?.tags||[])].join(' ').toLowerCase().includes((input.search||'').toLowerCase()));return{sources:structuredClone(sources),assets:structuredClone(filtered),total:filtered.length,nextOffset:null,jobs:structuredClone(jobs)};}
 if(operation==='createSource'){const source={...input,id:crypto.randomUUID(),status:input.kind==='r2'?'connected':'disconnected'};sources.push(source);return source;}
 if(operation==='review'){const asset=assets.find(a=>a.id===input.id);asset.review=input.review;return asset;}
 if(operation==='disconnect'){sources.find(s=>s.id===input.id).status='disconnected';assets.filter(a=>a.source_id===input.id).forEach(a=>a.availability='disconnected');return{disconnected:true};}
 if(operation==='connect'){sources.find(s=>s.id===input.id).status='connected';return{connected:true};}
 if(operation==='analyze'||operation==='sync'||operation==='retry'){const job={id:crypto.randomUUID(),kind:operation==='sync'?'sync':'analyze',status:'queued',backgroundQueued:true};jobs.push(job);return job;}
 if(operation==='run'){const job=jobs.find(j=>j.status==='queued');if(job)job.status='done';return{idle:!job};}
 throw Error('Fixture operation unavailable');
};
function App(){const [mobile,setMobile]=React.useState(false);const embedded=new URLSearchParams(location.search).has('frame');if(mobile&&!embedded)return <main className="p-4"><button className="btn-skew mb-4" onClick={()=>setMobile(false)}>Xem bản desktop</button><iframe title="Mobile preview" src="/__preview/?frame=1" width="390" height="1400" style={{border:'1px solid #ccc',maxWidth:'100%'}}/></main>;return <main className="mx-auto max-w-[1200px] p-5 lg:p-8">{!embedded&&<button className="btn-skew mb-4" onClick={()=>setMobile(true)}>Xem bản mobile (390px)</button>}<h1 className="text-2xl mb-3">Autopilot — nghiệm thu giao diện</h1><p role="status" className="panel p-4 mb-5">MÔ PHỎNG GIAO DIỆN · Chỉ dùng dữ liệu thử · Không gọi Drive, AI hoặc đăng bài. Luồng R2/Queue thật được nghiệm thu riêng qua API.</p><AutopilotLibrary brandId="fixture-brand"/></main>};
createRoot(document.getElementById('root')).render(<App/>);
`);
await build({configFile:false,root:directory,base:'/__preview/',plugins:[react()],resolve:{alias:{'@':resolve('src')}},css:{postcss:resolve('.')},build:{outDir:resolve('.test-tools/autopilot-staging/preview-dist'),emptyOutDir:true}});
