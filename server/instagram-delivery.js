const uncertain='Instagram delivery is unconfirmed. Check the profile before creating another post; this attempt will not be resent.';
export const definitiveInstagramRejection=error=>[100,190,10,200].includes(error.metaCode)&&error.metaHttpStatus>=400&&error.metaHttpStatus<500;
export function instagramReadStage(stage) {return ['processing','verify'].includes(stage);}
export function createInstagramDelivery(store,vault,graph,mediaAccess,finish,wake) {
    return async function runInstagram() {
        for(const candidate of store.pendingAttempts().filter(value=>value.platform==='instagram')) {
            if(candidate.nextVideoCheck>Date.now())continue;
            if(candidate.busy) {
                if(Date.now()-candidate.startedAt>60000) {
                    if(instagramReadStage(candidate.instagramStage))store.transaction(()=>{const current=store.attempt(candidate.id);if(current.status==='processing'&&current.startedAt===candidate.startedAt)store.saveAttempt({...current,busy:false,nextVideoCheck:Date.now()+100,startedAt:Date.now()});});
                    else finish(candidate,'unknown',uncertain);
                }
                continue;
            }
            const attempt=store.transaction(()=>{const current=store.attempt(candidate.id);if(current.status!=='processing'||current.busy)return null;const next={...current,busy:true,startedAt:Date.now(),instagramStage:current.instagramStage||'create'};store.saveAttempt(next);return next;});
            if(!attempt)continue;
            await wake(Date.now()+61000);
            let patch;
            try {
                const account=store.get('SocialAccount',attempt.accountId),credential=vault.read(attempt.credentialId);
                if(account.platform!=='instagram'||account.external_id!==attempt.pageId||account.credential_id!==attempt.credentialId||account.connection_status!=='connected'||credential.pageId!==attempt.facebookPageId||!['instagram_basic','instagram_content_publish'].every(scope=>credential.scopes?.includes(scope))) {finish(attempt,attempt.instagramStage==='verify'?'unknown':'failed',attempt.instagramStage==='verify'?uncertain:'Instagram authorization changed. Reconnect and review again.');continue;}
                await graph.check(attempt.facebookPageId,attempt.pageId,credential.token);
                if(attempt.instagramStage==='create') {
                    const containerId=await graph.create(attempt.pageId,attempt.media[0],mediaAccess.url(attempt,attempt.media[0]),attempt.caption,credential.token);
                    patch={instagramContainerId:containerId,instagramStage:'processing',instagramProcessingSince:Date.now(),nextVideoCheck:Date.now()+3000};
                } else if(attempt.instagramStage==='processing') {
                    const state=await graph.status(attempt.instagramContainerId,credential.token);
                    if(['ERROR','EXPIRED'].includes(state)){finish(attempt,'failed','Instagram could not process the media. Check its format and profile access.');continue;}
                    if(state==='PUBLISHED'){finish(attempt,'unknown',uncertain);continue;}
                    if(state==='FINISHED')patch={instagramStage:'publish',nextVideoCheck:Date.now()+100};
                    else if(Date.now()-attempt.instagramProcessingSince>30*60000){finish(attempt,'unknown',uncertain);continue;}
                    else patch={nextVideoCheck:Date.now()+10000};
                } else if(attempt.instagramStage==='publish') {
                    const mediaId=await graph.publish(attempt.pageId,attempt.instagramContainerId,credential.token);
                    patch={instagramMediaId:mediaId,instagramStage:'verify',instagramVerificationSince:Date.now(),nextVideoCheck:Date.now()+100};
                } else if(attempt.instagramStage==='verify') {
                    const result=await graph.verify(attempt.pageId,attempt.instagramMediaId,credential.token);
                    finish(attempt,'published','',result);continue;
                } else {finish(attempt,'unknown',uncertain);continue;}
            } catch(error) {
                const since=attempt.instagramVerificationSince||attempt.instagramProcessingSince||attempt.startedAt;
                if(instagramReadStage(attempt.instagramStage)&&!definitiveInstagramRejection(error)&&Date.now()-since<30*60000)patch={nextVideoCheck:Date.now()+15000};
                else {const denied=attempt.instagramStage!=='verify' && (definitiveInstagramRejection(error)||error.status===409);finish(attempt,denied?'failed':'unknown',denied?'Instagram denied publishing or the linked profile changed. Reconnect and check permissions.':uncertain);continue;}
            }
            store.transaction(()=>{const current=store.attempt(attempt.id);if(current.status!=='processing'||current.startedAt!==attempt.startedAt)return;store.saveAttempt({...current,...patch,busy:false,startedAt:Date.now()});});
            break;
        }
    };
}
