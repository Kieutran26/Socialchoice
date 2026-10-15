import { createHmac } from 'node:crypto';
import { fail } from './validation.js';

export function instagramContainerState(value,id) {
    if(value.id!==id||!['IN_PROGRESS','FINISHED','ERROR','EXPIRED','PUBLISHED'].includes(value.status_code)) fail('Instagram returned an invalid container status',502);
    return value.status_code;
}
export function instagramPublishedMedia(value,id,profileId) {
    let url;try {url=new URL(value.permalink);} catch {fail('Instagram did not confirm a publication link',502);}
    if(value.id!==id||value.owner?.id!==profileId||url.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(url.hostname)||url.username||url.password||!/^\/(p|reel)\/[^/]+\/?$/.test(url.pathname)) fail('Instagram publication identity mismatch',409);
    return {id,url:url.href};
}
export function createInstagramGraph(config) {
    async function request(path,params,token,method='GET') {
        const url=new URL(`https://graph.facebook.com/${config.version}/${path}`);
        const fields=new URLSearchParams({...params,appsecret_proof:createHmac('sha256',config.appSecret).update(token).digest('hex')});
        if(method==='GET')url.search=fields.toString();
        let response,data;
        try {response=await fetch(url,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(method==='POST'?{body:fields}:{})});data=await response.json();}
        catch {fail('Instagram request unavailable or unconfirmed',502);}
        if(!response.ok||data.error||response.status>=300&&response.status<400) throw Object.assign(new Error('Instagram denied or could not confirm this request'),{metaCode:data.error?.code,metaHttpStatus:response.status});
        if(!data||typeof data!=='object'||Array.isArray(data))fail('Instagram returned an invalid response',502);
        return data;
    }
    const confirmedId=value=>{if(!/^\d+$/.test(value.id||''))fail('Instagram returned no confirmed ID',502);return value.id;};
    return {
        async check(pageId,profileId,token) {
            const page=await request(pageId,{fields:'id,instagram_business_account{id,username}'},token);
            if(page.id!==pageId||page.instagram_business_account?.id!==profileId)fail('The Facebook-linked Instagram profile changed. Reconnect and review again.',409);
        },
        async create(profileId,asset,url,caption,token) {
            return confirmedId(await request(`${profileId}/media`,asset.file_type==='video'?{media_type:'REELS',video_url:url,caption}:{image_url:url,caption},token,'POST'));
        },
        async status(id,token) {return instagramContainerState(await request(id,{fields:'id,status_code'},token),id);},
        async publish(profileId,id,token) {return confirmedId(await request(`${profileId}/media_publish`,{creation_id:id},token,'POST'));},
        async verify(profileId,id,token) {return instagramPublishedMedia(await request(id,{fields:'id,permalink,owner'},token),id,profileId);},
    };
}
