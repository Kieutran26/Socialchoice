export const definitiveVideoRejection = error => [100,190,10,200].includes(error.metaCode) && error.metaHttpStatus>=400 && error.metaHttpStatus<500;
const uncertain='Facebook delivery is unconfirmed. Check the Page before creating another post; this attempt will not be resent.';
export function videoOffsets(value,size,expectedStart) {
    const parse = raw => typeof raw==='number'?raw:/^\d+$/.test(raw||'')?Number(raw):NaN;
    const start=parse(value.start_offset),end=parse(value.end_offset);
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>size||end-start>8*1024*1024||start!==expectedStart||(start===end&&start!==size)) throw new Error('Invalid Meta video offsets');
    return {start,end};
}

export function createVideoDelivery(store,vault,graph,finish,wake) {
    return async function run() {
        const pending=store.pendingAttempts().filter(attempt=>attempt.media?.[0]?.file_type==='video');
        for(const candidate of pending) {
            if(candidate.nextVideoCheck>Date.now()) continue;
            if(candidate.busy) {
                if(Date.now()-candidate.startedAt>60000) {
                    if(candidate.videoStage==='processing') store.transaction(()=>{const current=store.attempt(candidate.id);if(current.status==='processing'&&current.startedAt===candidate.startedAt)store.saveAttempt({...current,busy:false,nextVideoCheck:Date.now()+100,startedAt:Date.now()});});
                    else finish(candidate,'unknown',uncertain);
                }
                continue;
            }
            const attempt=store.transaction(()=>{const current=store.attempt(candidate.id);if(current.status!=='processing'||current.busy)return null;const next={...current,busy:true,startedAt:Date.now(),videoStage:current.videoStage||'start'};store.saveAttempt(next);return next;});
            if(!attempt) continue;
            await wake(Date.now()+61000);
            let token;
            try {const account=store.get('SocialAccount',attempt.accountId);if(account.credential_id!==attempt.credentialId||account.connection_status!=='connected')throw new Error('Changed authorization');token=vault.read(attempt.credentialId).token;}
            catch {finish(attempt,'failed','Facebook authorization changed during publishing. Reconnect and review a new post.');continue;}
            const video=attempt.media[0];let patch;
            try {
                if(attempt.videoStage==='start') {
                    const session=await graph.startVideo(attempt.pageId,video.size_bytes,token);
                    const offsets=videoOffsets(session,video.size_bytes,0);
                    patch={videoId:session.video_id,videoSession:session.upload_session_id,videoStart:offsets.start,videoEnd:offsets.end,videoStage:'transfer'};
                } else if(attempt.videoStage==='transfer') {
                    const bytes=store.images.readSlice(video.storage_id,attempt.videoStart,attempt.videoEnd);
                    const response=await graph.transferVideo(attempt.pageId,attempt.videoSession,attempt.videoStart,{bytes,name:video.name,type:'video/mp4'},token);
                    const offsets=videoOffsets(response,video.size_bytes,attempt.videoEnd);
                    patch={videoStart:offsets.start,videoEnd:offsets.end,videoStage:offsets.start===video.size_bytes?'finish':'transfer'};
                } else if(attempt.videoStage==='finish') {
                    // Finalization might succeed despite transport failure; query this ID, never resend.
                    try {await graph.finishVideo(attempt.pageId,attempt.videoSession,attempt.caption,token);} catch(error) {if(definitiveVideoRejection(error))throw error;}
                    patch={videoStage:'processing',videoProcessingSince:Date.now(),nextVideoCheck:Date.now()+3000};
                } else {
                    const status=await graph.videoStatus(attempt.pageId,attempt.videoId,token);
                    if(status.state==='published') {finish(attempt,'published','',status.result);continue;}
                    if(status.state==='failed') {finish(attempt,'failed','Facebook could not process this video. Check its format and Page access.');continue;}
                    if(Date.now()-attempt.videoProcessingSince>30*60*1000) {finish(attempt,'unknown',uncertain);continue;}
                    patch={nextVideoCheck:Date.now()+10000};
                }
            } catch(error) {
                if(attempt.videoStage==='processing'&&![190,10,200].includes(error.metaCode)&&Date.now()-attempt.videoProcessingSince<30*60*1000) patch={nextVideoCheck:Date.now()+15000};
                else {const denied=definitiveVideoRejection(error);finish(attempt,denied?'failed':'unknown',denied?'Facebook denied publishing. Reconnect and check Page/app publishing permissions.':uncertain);continue;}
            }
            store.transaction(()=>{const current=store.attempt(attempt.id);if(current.status!=='processing'||current.startedAt!==attempt.startedAt)return;store.saveAttempt({...current,...patch,busy:false,startedAt:Date.now()});});
            break;
        }
    };
}
