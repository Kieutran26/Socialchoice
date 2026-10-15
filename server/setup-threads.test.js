import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('Threads setup preserves encryption key, hides product secret and refuses overwrite or invalid callback',()=>{
    const directory=mkdtempSync(join(tmpdir(),'socialchoice-threads-setup-')),script=resolve('server/setup-threads.js');
    const key='a'.repeat(64),meta=`META_TOKEN_ENCRYPTION_KEY=${key}\nMETA_APP_ID=321\n`,secret='synthetic-private-threads-secret';
    const input={appId:'123',appSecret:secret,redirectUri:'http://127.0.0.1:3001/api/threads/callback'};
    const run=value=>spawnSync(process.execPath,[script],{cwd:directory,input:JSON.stringify(value),encoding:'utf8',env:{...process.env,META_TOKEN_ENCRYPTION_KEY:'',SOCIALCHOICE_PUBLIC_ORIGIN:''}});
    try{
        writeFileSync(join(directory,'.env.meta'),meta);
        const invalid=run({...input,redirectUri:'http://example.com/api/threads/callback'});assert.notEqual(invalid.status,0);assert.equal(existsSync(join(directory,'.env.threads')),false);assert.equal((invalid.stdout+invalid.stderr).includes(secret),false);
        const first=run(input);assert.equal(first.status,0);assert.equal((first.stdout+first.stderr).includes(secret),false);
        const saved=readFileSync(join(directory,'.env.threads'),'utf8');assert.match(saved,/THREADS_APP_ID=123/);assert.equal(saved.includes('META_TOKEN_ENCRYPTION_KEY'),false);assert.equal(readFileSync(join(directory,'.env.meta'),'utf8'),meta);
        const second=run({...input,appId:'999'});assert.notEqual(second.status,0);assert.equal(readFileSync(join(directory,'.env.threads'),'utf8'),saved);assert.equal(readFileSync(join(directory,'.env.meta'),'utf8'),meta);assert.equal((second.stdout+second.stderr).includes(secret),false);
    }finally{rmSync(directory,{recursive:true});}
});
