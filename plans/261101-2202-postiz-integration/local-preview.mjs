import { DatabaseSync } from 'node:sqlite';
import { createApi } from '../../server/index.js';
const {server,store}=createApi({dbPath:'data/postiz-preview.sqlite',passwordHash:'',publicOrigin:'',backendOrigin:'',siteDirectory:'dist'});
if(!store.all('Brand').length){
 const source=new DatabaseSync('data/socialchoice.sqlite',{readOnly:true});
 const brands=source.prepare("SELECT data FROM records WHERE entity='Brand'").all().map(row=>JSON.parse(row.data)).filter(row=>!row.is_demo && row.status==='active');
 source.close();
 for(const brand of brands)store.write('Brand',{name:brand.name,color:brand.color,timezone:brand.timezone,status:'active'});
 if(!brands.length)store.write('Brand',{name:'Postiz local',status:'active'});
}
server.listen(3001,'127.0.0.1',()=>console.log('Isolated Postiz preview ready at http://127.0.0.1:3001; no existing posts or jobs copied.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
