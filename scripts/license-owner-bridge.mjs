import { readSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Windows PowerShell 5 loses embedded quotes in native arguments. Read structured UTF-8
// on stdin, then let Node marshal the argument array without involving a shell.
try {
    const buffer=Buffer.alloc(128*1024+1);let length=0,count;
    while(length<buffer.length&&(count=readSync(0,buffer,length,buffer.length-length,null))>0)length+=count;
    if(length>128*1024)throw new Error('Owner request is too large.');
    const args=JSON.parse(buffer.subarray(0,length).toString('utf8'));
    if(!Array.isArray(args)||args.length<1||args.length>32||args.some(value=>typeof value!=='string'||value.length>32768)||!['init','policy','issue','reissue'].includes(args[0]))throw new Error('Invalid owner action arguments.');
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./license-issuer.mjs',import.meta.url)),...args],{shell:false,stdio:'inherit',windowsHide:true});
    if(result.error)throw new Error('Unable to start the license issuer.');process.exitCode=result.status??1;
} catch(error){console.error('Owner: '+error.message);process.exitCode=1;}
