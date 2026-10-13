import {createServer} from 'node:http';
import {createStore} from '../../server/store.js';
import {createHttpHandler} from '../../server/http-handler.js';
import {createAdminAuth} from '../../server/admin-auth.js';
import {serveSite} from '../../server/static-site.js';
const store=createStore(':memory:');
const brand=store.write('Brand',{name:'LOCAL TEST — Synthetic analytics'}),empty=store.write('Brand',{name:'LOCAL TEST — Empty brand'});
const account=store.verifiedAccount({name:'LOCAL TEST Page',brand_id:brand.id,platform:'facebook',account_type:'page',external_id:'123456',connection_status:'disconnected'});
for(const [index,name] of ['Education','Entertainment'].entries()){
 const pillar=store.write('ContentPillar',{name,brand_id:brand.id});
 const post=store.write('Post',{title:'LOCAL TEST Synthetic publication '+index,caption:'Local fixture only',brand_id:brand.id,account_ids:[account.id],pillar_id:pillar.id});
 const attempt={id:'local-analytics-'+index,postId:post.id,accountId:account.id,pageId:account.external_id,pageName:account.name,status:'published',externalId:'123456_'+(1000+index),url:'https://www.facebook.com/123456_'+(1000+index),finishedAt:Date.now()-86400000};store.saveAttempt(attempt);
 store.metrics.save(attempt.id,{lastAttemptAt:0,reactions:{value:index?0:5,updatedAt:Date.now()-3600000},comments:{value:0,updatedAt:Date.now()-3600000},shares:{value:index?null:2,updatedAt:index?null:Date.now()-3600000}});
}
const config={ready:true,key:'00'.repeat(32),appSecret:'local-fixture',version:'v26.0'};
// Disconnected fixture account makes refresh fail before any Graph read.
const handler=createHttpHandler({store,auth:createAdminAuth(''),meta:{},publisher:null,metaSettings:config,frontendPort:3101,allowedHosts:new Set(['127.0.0.1','localhost']),serveStatic:(req,res)=>serveSite(req,res,'dist')});
const server=createServer(handler);server.listen(3101,'127.0.0.1',()=>console.log('Analytics memory fixture PID '+process.pid+' port3101; no Graph calls'));
process.on('SIGTERM',()=>server.close());process.on('SIGINT',()=>server.close());server.on('close',()=>store.close());
