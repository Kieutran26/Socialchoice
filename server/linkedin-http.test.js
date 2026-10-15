import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { createHttpHandler } from './http-handler.js';
import { handleWebRequest } from './web-request-adapter.js';
import { createInstagramMediaAccess } from './instagram-media-access.js';
import { createMetaVault } from './meta-vault.js';
import { createLinkedinConnection } from './linkedin-connection.js';

test('Linkedin HTTP routes require admin session and expose truthful unconfigured status', async () => {
    const store=createStore(':memory:'),auth=createAdminAuth(hashPassword('synthetic http admin password'),true);
    const config={ready:false,missing:['appId','appSecret','redirectUri','key']};
    const handler=createHttpHandler({store,auth,meta:{},linkedin:createLinkedinConnection(store,auth,config),publisher:null,metaSettings:{ready:false},linkedinSettings:config,publicOrigin:'https://app.example',allowedHosts:new Set(['backend.example'])});
    const call=(path,options={})=>handleWebRequest(new Request(`https://backend.example/api/linkedin/${path}`,options),handler);
    let cookie;auth.login({headers:{}},{setHeader(_,value){cookie=value.split(';')[0];}},'synthetic http admin password');
    const headers={'X-Socialchoice-Client':'local-ui',Cookie:cookie,'Content-Type':'application/json'};
    try {
        assert.equal((await call('status',{headers:{'X-Socialchoice-Client':'local-ui'}})).status,401);
        const status=await call('status',{headers});assert.equal(status.status,200);assert.equal((await status.json()).ready,false);
        const profile=await call('profile',{headers});assert.deepEqual(await profile.json(),{profile:null,pending:false});
        assert.equal((await call('start',{method:'POST',headers,body:JSON.stringify({args:['synthetic-brand']})})).status,409);
        assert.equal((await call('callback?state=invalid&code=synthetic',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,409);
        assert.equal((await call('import',{method:'POST',headers,body:JSON.stringify({args:['789']})})).status,409);
    }finally{store.close();}
});

