const uncertain='Threads delivery is unconfirmed. Check the profile before creating another post; this attempt will not be resent.';
export const definitiveThreadsRejection=error=>[100,190,10,200].includes(error.metaCode)&&error.metaHttpStatus>=400&&error.metaHttpStatus<500;
export function threadsReadStage(stage) {return ['processing','verify'].includes(stage);}
export function createThreadsDelivery(store,vault,graph,mediaAccess,finish,wake) {
    return async function runThreads() {
        for(const candidate of store.pendingAttempts().filter(value=>value.platform==='threads')) {
            if(candidate.nextVideoCheck>Date.now())continue;
            if(candidate.busy) {
                if(Date.now()-candidate.startedAt>60000) {
                    if(threadsReadStage(candidate.threadsStage))store.transaction(()=>{const current=store.attempt(candidate.id);if(current.status==='processing'&&current.startedAt===candidate.startedAt)store.saveAttempt({...current,busy:false,nextVideoCheck:Date.now()+100,startedAt:Date.now()});});
                    else finish(candidate,'unknown',uncertain);
                }
                continue;
            }
            const attempt=store.transaction(()=>{const current=store.attempt(candidate.id);if(current.status!=='processing'||current.busy)return null;const next={...current,busy:true,startedAt:Date.now(),threadsStage:current.threadsStage||'create'};store.saveAttempt(next);return next;});
            if(!attempt)continue;
            await wake(Date.now()+61000);
            if(threadsReadStage(attempt.threadsStage)&&Date.now()-(attempt.threadsVerificationSince||attempt.threadsProcessingSince||attempt.startedAt)>30*60000){finish(attempt,'unknown',uncertain);continue;}
            let patch;
            try {
                const account=store.get('SocialAccount',attempt.accountId),credential=vault.read(attempt.credentialId);
                if(account.platform!=='threads'||account.external_id!==attempt.pageId||account.credential_id!==attempt.credentialId||account.connection_status!=='connected'||credential.platform!=='threads'||credential.profileId!==attempt.pageId||!Number.isFinite(credential.expiresAt)||credential.expiresAt<=Date.now()||!['threads_basic','threads_content_publish'].every(scope=>credential.scopes?.includes(scope)&&account.scopes?.includes(scope))) {finish(attempt,attempt.threadsStage==='verify'?'unknown':'failed',attempt.threadsStage==='verify'?uncertain:'Threads authorization changed. Reconnect and review again.');continue;}
                const profile=await graph.profile(credential.token); if(profile.id!==attempt.pageId) {finish(attempt,attempt.threadsStage==='verify'?'unknown':'failed',attempt.threadsStage==='verify'?uncertain:'Threads authorization changed. Reconnect and review again.');continue;}
                if(attempt.threadsStage==='create') {
                    const containerId=await graph.create(attempt.pageId,attempt.media[0]||null,attempt.media[0]?mediaAccess.url(attempt,attempt.media[0]):null,attempt.caption,credential.token);
                    patch={threadsContainerId:containerId,threadsStage:'processing',threadsProcessingSince:Date.now(),nextVideoCheck:Date.now()+3000};
                } else if(attempt.threadsStage==='processing') {
                    const state=await graph.status(attempt.threadsContainerId,credential.token);
                    if(['ERROR','EXPIRED'].includes(state)){finish(attempt,'failed','Threads could not process the media. Check its format and profile access.');continue;}
                    if(state==='PUBLISHED'){finish(attempt,'unknown',uncertain);continue;}
                    if(state==='FINISHED')patch={threadsStage:'publish',nextVideoCheck:Date.now()+100};
                    else if(Date.now()-attempt.threadsProcessingSince>30*60000){finish(attempt,'unknown',uncertain);continue;}
                    else patch={nextVideoCheck:Date.now()+10000};
                } else if(attempt.threadsStage==='publish') {
                    const mediaId=await graph.publish(attempt.pageId,attempt.threadsContainerId,credential.token);
                    patch={threadsMediaId:mediaId,threadsStage:'verify',threadsVerificationSince:Date.now(),nextVideoCheck:Date.now()+100};
                } else if(attempt.threadsStage==='verify') {
                    const result=await graph.verify(attempt.pageId,attempt.threadsMediaId,credential.token);
                    finish(attempt,'published','',result);continue;
                } else {finish(attempt,'unknown',uncertain);continue;}
            } catch(error) {
                const since=attempt.threadsVerificationSince||attempt.threadsProcessingSince||attempt.startedAt;
                if(threadsReadStage(attempt.threadsStage)&&!definitiveThreadsRejection(error)&&Date.now()-since<30*60000)patch={nextVideoCheck:Date.now()+15000};
                else {const denied=attempt.threadsStage!=='verify' && (definitiveThreadsRejection(error)||error.status===409);finish(attempt,denied?'failed':'unknown',denied?'Threads denied publishing or the linked profile changed. Reconnect and check permissions.':uncertain);continue;}
            }
            store.transaction(()=>{const current=store.attempt(attempt.id);if(current.status!=='processing'||current.startedAt!==attempt.startedAt)return;store.saveAttempt({...current,...patch,busy:false,startedAt:Date.now()});});
            break;
        }
    };
}
