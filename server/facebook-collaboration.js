import { randomUUID } from 'node:crypto';
import { createMetaGraph } from './meta-graph.js';
import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';

export function collaboratorTarget(input) {
    if(typeof input!=='string') fail('Enter a Facebook Page ID or link');
    let value=input.trim();
    if(value.startsWith('https://')) {
        let url;try{url=new URL(value);}catch{fail('Enter a Facebook Page ID or link');}
        if(!['facebook.com','www.facebook.com'].includes(url.hostname)) fail('Enter a Facebook Page ID or link');
        value=url.pathname==='/profile.php'?url.searchParams.get('id'):url.pathname.replace(/^\/+|\/+$/g,'');
    }
    if(!/^[A-Za-z0-9](?:[A-Za-z0-9.]{0,98}[A-Za-z0-9])?$/.test(value||'')) fail('Enter a Facebook Page ID or link');
    return value;
}

export function createFacebookCollaboration(store,config) {
    const graph=config.ready?createMetaGraph(config):null,vault=config.ready?createMetaVault(store,config.key):null;
    function context(postId) {
        if(!graph) fail('Configure Meta before publishing',409);
        const attempt=store.attemptForPost(postId);
        if(!attempt||attempt.status!=='published'||attempt.media?.[0]?.file_type!=='video'||!/^\d+$/.test(attempt.videoId||'')) fail('Collaboration requires a confirmed published Facebook video',409);
        const account=store.get('SocialAccount',attempt.accountId);
        if(account.connection_status!=='connected'||account.credential_id!==attempt.credentialId) fail('Reconnect Facebook before publishing',409);
        return {attempt,token:vault.read(attempt.credentialId).token};
    }
    const summary=value=>({id:value.id,postId:value.postId,videoId:value.videoId,pageName:value.pageName,targetId:value.targetId,targetName:value.targetName,status:value.status,message:value.message,expiresAt:value.expiresAt});
    return {
        list(postId) {context(postId);return store.collaborations(postId).map(value=>summary(value.status==='sending'?{...value,status:'unknown',message:'Invitation outcome is unconfirmed. Do not resend.'}:value));},
        async remote(postId) {const {attempt,token}=context(postId);return graph.videoCollaborators(attempt.videoId,token);},
        async prepare(postId,input) {
            const {attempt,token}=context(postId),target=await graph.resolveCollaborationPage(collaboratorTarget(input),token);
            if(target.id===attempt.pageId) fail('Choose another Facebook Page',409);
            return store.transaction(()=>{
                const existing=store.collaborations(postId).find(value=>value.targetId===target.id);
                if(existing&&(existing.status!=='prepared'||existing.expiresAt>Date.now())) return summary(existing);
                const value={id:randomUUID(),postId,videoId:attempt.videoId,pageName:attempt.pageName,credentialId:attempt.credentialId,targetId:target.id,targetName:target.name,status:'prepared',expiresAt:Date.now()+600000};
                store.saveCollaboration(value);return summary(value);
            });
        },
        async invite(id) {
            const stored=store.collaboration(id),{attempt,token}=context(stored.postId);
            const claimed=store.transaction(()=>{
                const current=store.collaboration(id);if(current.status!=='prepared')return null;
                if(current.expiresAt<=Date.now())fail('Invitation review expired. Review again.',409);
                if(current.videoId!==attempt.videoId||current.credentialId!==attempt.credentialId)fail('Facebook authorization changed. Review again.',409);
                const value={...current,status:'sending'};store.saveCollaboration(value);return value;
            });
            if(!claimed)return this.list(stored.postId).find(value=>value.id===id);
            let status='submitted',message='Facebook acknowledged the invitation. Recipient acceptance is not confirmed.';
            try{await graph.inviteCollaborator(claimed.videoId,claimed.targetId,token);}
            catch(error){const denied=[100,190,10,200].includes(error.metaCode)&&error.metaHttpStatus>=400&&error.metaHttpStatus<500;status=denied?'failed':'unknown';message=denied?'Facebook denied the collaboration invitation. Check Page eligibility and permissions.':'Invitation outcome is unconfirmed. Do not resend.';}
            return store.transaction(()=>{const value={...store.collaboration(id),status,message};store.saveCollaboration(value);return summary(value);});
        },
    };
}
