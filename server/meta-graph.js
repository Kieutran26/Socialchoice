import { createHmac } from 'node:crypto';
import { fail } from './validation.js';
import { createMetricsGraph } from './facebook-metrics-graph.js';
import { discoverGrantedPages } from './meta-page-discovery.js';

export function createMetaGraph(config) {
    async function request(path, params = {}, token, method = 'GET', file, host = 'graph.facebook.com', timeout = 20000) {
        const step = path === 'oauth/access_token' ? (params.grant_type ? 'token_exchange' : 'code_exchange') : ({ me: 'profile', 'me/permissions': 'permissions', 'me/accounts': 'pages' }[path] || 'page_check');
        const reject = (message, status, code, subcode, reason) => {
            throw Object.assign(new Error(message), { status, metaStep: step, metaReason: reason, metaHttpStatus: response?.status, ...(Number.isSafeInteger(code) ? { metaCode: code } : {}), ...(Number.isSafeInteger(subcode) ? { metaSubcode: subcode } : {}) });
        };
        const url = new URL(`https://${host}/${config.version}/${path}`);
        const fields = file ? new FormData() : new URLSearchParams(params);
        if (file) {
            for (const [key, value] of Object.entries(params)) fields.set(key, value);
            fields.set(file.field || 'source', new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.name);
        }
        if (token) fields.set('appsecret_proof', createHmac('sha256', config.appSecret).update(token).digest('hex'));
        if (method === 'GET') url.search = fields.toString();
        let response, data;
        try {
            response = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(timeout), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method !== 'GET' && !file ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(method !== 'GET' ? { body: fields } : {}) });
        } catch (error) { reject('Meta request unavailable. Try again later.', 502, undefined, undefined, ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'network'); }
        // Workers support manual/follow only. Never follow a redirect with credentials.
        if (response.status >= 300 && response.status < 400) reject('Meta returned an unexpected redirect', 502, undefined, undefined, 'redirect');
        try { data = await response.json(); }
        catch { reject('Meta returned an unexpected response', 502, undefined, undefined, 'response_format'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) reject('Meta returned an unexpected response', 502);
        if (!response.ok || data.error) reject(data.error?.code === 190 ? 'Facebook authorization expired. Reconnect Facebook.' : 'Meta denied this request. Check app permissions and access.', [190, 10, 200].includes(data.error?.code) ? 409 : 502, data.error?.code, data.error?.error_subcode, typeof data.error?.message==='string' && data.error.message.includes('pages_read_user_content') ? 'user_content_permission_required' : undefined);
        return data;
    }
    return {
        postMetrics:createMetricsGraph((id,params,token)=>request(id,params,token,'GET',undefined,'graph.facebook.com',8000)),
        async resolveCollaborationPage(target,token) {
            const result=await request(target,{fields:'id,name,category'},token);
            if(!/^\d+$/.test(result.id||'')||typeof result.name!=='string'||typeof result.category!=='string') fail('Meta could not verify this Facebook Page. Use its numeric Page ID.',409);
            return {id:result.id,name:result.name};
        },
        async videoCollaborators(videoId,token) {
            const result=await request(videoId+'/collaborators',{limit:'100',fields:'id,name'},token);
            if(!Array.isArray(result.data)||result.data.some(row=>!/^\d+$/.test(row?.id||''))) fail('Meta returned an unexpected collaborator response',502);
            return {entries:result.data.map(row=>({id:row.id,...(typeof row.name==='string'?{name:row.name}:{}),...(typeof row.status==='string'&&row.status.length<=80?{status:row.status}:{})})),hasMore:!!result.paging?.next};
        },
        async inviteCollaborator(videoId,targetId,token) {
            const result=await request(videoId+'/collaborators',{target_id:targetId},token,'POST');
            if(result.success!==true) fail('Meta did not confirm the collaboration invitation',502);
        },
        async startVideo(pageId,size,token) {
            const result=await request(`${pageId}/videos`,{upload_phase:'start',file_size:String(size)},token,'POST',undefined,'graph-video.facebook.com');
            if(!/^\d+$/.test(result.video_id||'')||!/^\d+$/.test(result.upload_session_id||'')) fail('Meta returned an invalid video session',502);
            return result;
        },
        transferVideo: (pageId,sessionId,start,file,token) => request(`${pageId}/videos`,{upload_phase:'transfer',upload_session_id:sessionId,start_offset:String(start)},token,'POST',{...file,field:'video_file_chunk'},'graph-video.facebook.com'),
        async finishVideo(pageId,sessionId,caption,token) {
            const result=await request(`${pageId}/videos`,{upload_phase:'finish',upload_session_id:sessionId,description:caption,published:'true'},token,'POST',undefined,'graph-video.facebook.com');
            if(result.success!==true) fail('Meta did not confirm video finalization',502);
        },
        async videoStatus(pageId,videoId,token) {
            const result=await request(videoId,{fields:'id,status,published,from,post_id'},token);
            if(result.id!==videoId||!result.status||typeof result.status!=='object') fail('Meta returned an invalid video status',502);
            const state=result.status.video_status;
            if(state==='error'||result.status.processing_phase?.status==='error'||result.status.publishing_phase?.status==='error') return {state:'failed'};
            if(state==='ready'&&result.published===true) {
                const postId=typeof result.post_id==='string'&&new RegExp(`^${pageId}_[0-9]+$`).test(result.post_id)?result.post_id:null;
                if(result.from?.id!==pageId&&!postId) fail('Facebook video Page identity mismatch',409);
                return {state:'published',result:{id:postId||videoId,url:`https://www.facebook.com/watch/?v=${videoId}`}};
            }
            return {state:'processing'};
        },
        async uploadPhoto(pageId, file, token) {
            const result = await request(`${pageId}/photos`, { published: 'false' }, token, 'POST', file);
            if (typeof result.id !== 'string' || !/^\d+$/.test(result.id)) fail('Facebook returned no confirmed photo ID', 502);
            return result.id;
        },
        async publishText(pageId, caption, token, photos = []) {
            const result = await request(`${pageId}/feed`, { message: caption, published: 'true', ...(photos.length ? { attached_media: JSON.stringify(photos.map(id => ({ media_fbid: id }))) } : {}) }, token, 'POST');
            if (typeof result.id !== 'string' || !new RegExp(`^${pageId}_[0-9]+$`).test(result.id)) fail('Facebook returned no confirmed post ID', 502);
            return { id: result.id, url: `https://www.facebook.com/${result.id}` };
        },
        async publishComment(targetId, message, token, photoId) {
            const result = await request(`${targetId}/comments`, { ...(message ? { message } : {}), ...(photoId ? { attachment_id: photoId } : {}) }, token, 'POST');
            if (typeof result.id !== 'string' || !result.id.trim()) fail('Facebook returned no confirmed comment ID', 502);
            return { id: result.id };
        },
        async exchange(code) {
            const short = await request('oauth/access_token', { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code }, undefined, 'POST');
            if (typeof short.access_token !== 'string' || !short.access_token) fail('Meta returned no access token', 502);
            const long = await request('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: short.access_token }, undefined, 'POST');
            if (typeof long.access_token !== 'string' || !long.access_token) fail('Meta returned no access token', 502);
            return long.access_token;
        },
        async discover(token, platform = 'facebook') {
            const profile = await request('me', { fields: 'id,name' }, token);
            const permissions = await request('me/permissions', {}, token);
            if (!/^\d+$/.test(profile.id) || typeof profile.name !== 'string' || !Array.isArray(permissions.data) || permissions.data.some(p => !p || typeof p.permission !== 'string' || typeof p.status !== 'string')) fail('Meta returned an unexpected response', 502);
            const scopes = permissions.data.filter(p => p.status === 'granted').map(p => p.permission);
            if (!scopes.includes('pages_show_list')) fail('Facebook Page permission was not granted', 409);
            if (platform === 'instagram' && !['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'].every(scope => scopes.includes(scope))) fail('Instagram publishing permissions were not granted', 409);
            const pages = []; let after;
            for (let i = 0; i < 50; i++) {
                const result = await request('me/accounts', { fields: platform === 'instagram' ? 'id,name,access_token,tasks,instagram_business_account{id,username}' : 'id,name,access_token,tasks', limit: '100', ...(after ? { after } : {}) }, token);
                if (!Array.isArray(result.data) || result.data.some(p => !p || typeof p.id !== 'string' || !/^\d+$/.test(p.id) || typeof p.name !== 'string' || (p.access_token !== undefined && typeof p.access_token !== 'string') || (p.tasks !== undefined && (!Array.isArray(p.tasks) || p.tasks.some(task => typeof task !== 'string'))))) fail('Meta returned an unexpected response', 502);
                pages.push(...result.data.filter(p => typeof p.access_token === 'string' && p.access_token));
                if (!result.paging?.next) {
                    if (!pages.length && platform === 'facebook') pages.push(...await discoverGrantedPages(request, config, token, profile, 'id,name,access_token'));
                    if (platform !== 'instagram') return { profile, scopes, pages };
                    const accounts = [];
                    for (const page of pages) {
                        const ig = page.instagram_business_account;
                        if (!ig) continue;
                        if (!/^\d+$/.test(ig.id || '') || typeof ig.username !== 'string' || !ig.username || ig.username.length > 100) fail('Meta returned an invalid linked Instagram account', 502);
                        if (!accounts.some(a => a.id === ig.id)) accounts.push({ id: ig.id, name: ig.username, username: ig.username, pageId: page.id, pageName: page.name, access_token: page.access_token, tasks: page.tasks || [] });
                    }
                    return { profile, scopes, pages: accounts };
                }
                const next = result.paging.cursors?.after;
                if (!next || next === after) fail('Meta Page list pagination incomplete', 502);
                after = next;
            }
            fail('Meta Page list exceeds supported size', 502);
        },
        async checkInstagram(id, pageId, token) {
            if (!/^\d+$/.test(pageId || '')) fail('Instagram Page linkage unavailable. Reconnect Instagram.', 409);
            const page = await request(pageId, { fields: 'id,instagram_business_account{id,username}' }, token);
            if (page.id !== pageId || page.instagram_business_account?.id !== id) fail('Instagram Page linkage changed. Reconnect Instagram.', 409);
            const result = await request(id, { fields: 'id,username' }, token);
            if (result.id !== id || typeof result.username !== 'string' || !result.username) fail('Instagram identity mismatch', 409);
            return { id, name: result.username, username: result.username };
        },
        async check(pageId, token) {
            const result = await request(pageId, { fields: 'id,name' }, token);
            if (result.id !== pageId) fail('Facebook Page identity mismatch', 409);
            return result;
        },
    };
}
