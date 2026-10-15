import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { threadsConfig } from './threads-config.js';

// Owner enters the product secret privately; never pass it as a command argument.
try {
    if(existsSync('.env.threads'))throw new Error('Existing configuration must be preserved');
    let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>16384)throw new Error('Input too large');}
    const value=JSON.parse(input);
    const env={THREADS_APP_ID:value.appId,THREADS_APP_SECRET:value.appSecret,THREADS_REDIRECT_URI:value.redirectUri};
    const existing=existsSync('.env.meta')?parseEnv(readFileSync('.env.meta','utf8')):{};
    if(Object.values(env).some(item=>typeof item!=='string'||!item||/[\r\n"'\s#]/.test(item))||!threadsConfig({...existing,...env,META_TOKEN_ENCRYPTION_KEY:process.env.META_TOKEN_ENCRYPTION_KEY||existing.META_TOKEN_ENCRYPTION_KEY}).ready)throw new Error('Invalid configuration');
    writeFileSync('.env.threads',Object.entries(env).map(([name,item])=>`${name}=${item}`).join('\n')+'\n',{flag:'wx',mode:0o600});
    console.log('Threads configuration saved privately. Existing encryption key preserved. No account connection is claimed.');
} catch {
    console.error('Threads setup failed. Check product credentials, callback and existing encryption key. No secret values are displayed.');process.exitCode=1;
}
