import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createPublicKey } from 'node:crypto';
import { readActivationRequest,resolveMachineId } from './license-activation-request.mjs';
import { issueLicense,verifyLicense } from './license-issuer.mjs';

function request(machine='A'){return {format:'socialchoice-activation-request',version:1,product:'socialchoice-desktop',app_version:'0.7.0',machine_id:'SCM1-'+machine.repeat(64)};}
test('activation requests are bounded routing information and cannot supply entitlement fields',()=>{
    const root=mkdtempSync(join(tmpdir(),'socialchoice-request-'));const file=join(root,'request.scactivation');
    try {
        writeFileSync(file,JSON.stringify(request()));assert.equal(readActivationRequest(file).machine_id,request().machine_id);
        assert.equal(resolveMachineId({requestPath:file}),request().machine_id);
        assert.throws(()=>resolveMachineId({requestPath:file,machineId:request().machine_id}),/exactly one/);
        for(const value of [{...request(),rights:{ai:true}},{...request(),product:'other'},{...request(),version:2},{...request(),machine_id:'invalid'},{...request(),app_version:'bad'},null,[]]){
            writeFileSync(file,JSON.stringify(value));assert.throws(()=>readActivationRequest(file));
        }
        writeFileSync(file,'x'.repeat(4097));assert.throws(()=>readActivationRequest(file),/large/);
        writeFileSync(file,'{');assert.throws(()=>readActivationRequest(file),/JSON/);
    }finally{rmSync(root,{recursive:true,force:true});}
});

test('Windows owner actions create encrypted keys, verify requests and preserve passphrase environment',{skip:process.platform!=='win32'},()=>{
    const root=mkdtempSync(join(tmpdir(),'socialchoice-owner-'));const owner=resolve('scripts/socialchoice-license-owner.ps1');
    const passphrase='disposable-owner-test-password',sentinel='inherited-fixture-secret';
    const runner=join(root,'run.ps1');writeFileSync(runner,`
param([string]$Data)
$taskData=Get-Content -LiteralPath $Data -Raw -Encoding UTF8|ConvertFrom-Json
$env:SOCIALCHOICE_ISSUER_PASSPHRASE='${sentinel}'
$taskOptions=@{}
foreach($taskItem in $taskData.options.PSObject.Properties){$taskOptions[$taskItem.Name]=$taskItem.Value}
$taskSecure=New-Object Security.SecureString
foreach($taskCharacter in $taskData.passphrase.ToCharArray()){$taskSecure.AppendChar($taskCharacter)}
$taskOptions['Passphrase']=$taskSecure
$taskExit=0
try{& $taskData.owner @taskOptions}catch{Write-Output $_.Exception.Message;$taskExit=1}
if($env:SOCIALCHOICE_ISSUER_PASSPHRASE -cne '${sentinel}'){Write-Output 'ENVIRONMENT NOT RESTORED';exit 99}
exit $taskExit
`);
    let sequence=0;
    function action(options,success=true,password=passphrase){
        const data=join(root,`options-${++sequence}.json`);writeFileSync(data,JSON.stringify({owner,passphrase:password,options}));
        const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',runner,'-Data',data],{encoding:'utf8',timeout:20000,windowsHide:true});
        assert.ifError(result.error);const output=result.stdout+result.stderr;
        assert.ok(!output.includes(password)&&!output.includes(sentinel),'Secret appeared in output');
        assert.notEqual(result.status,99,output);if(success)assert.equal(result.status,0,output);else assert.notEqual(result.status,0,output);return output;
    }
    try{
        const keys=join(root,'keys');action({Action:'Init',KeyDirectory:keys});
        const privateKeyPath=join(keys,'issuer-private.pem');assert.match(readFileSync(privateKeyPath,'utf8'),/ENCRYPTED PRIVATE KEY/);
        const policy=Object.fromEntries(['starter','professional','business'].map(edition=>[edition,{ai:false,media_import:true,backup_restore:true,max_active_brands:2}]));
        const input=join(root,'input.json'),policyPath=join(root,'policy.json'),requestPath=join(root,'customer.scactivation'),outputPath=join(root,'issued.sclicense');
        writeFileSync(input,JSON.stringify(policy));writeFileSync(requestPath,JSON.stringify(request()));
        action({Action:'Policy',PolicyPath:input,OutputPath:policyPath});assert.deepEqual(JSON.parse(readFileSync(policyPath)),policy);
        const options={Action:'Issue',PrivateKeyPath:privateKeyPath,PolicyPath:policyPath,RequestPath:requestPath,Edition:'starter',Licensee:'Đơn hàng "quoted" & fixture',OutputPath:outputPath};
        action(options,false);assert.equal(existsSync(outputPath),false);action({...options,PurchaseConfirmed:true});
        const original=readFileSync(outputPath,'utf8');action({...options,PurchaseConfirmed:true},false);assert.equal(readFileSync(outputPath,'utf8'),original);
        const publicKey=createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:Buffer.from(readFileSync(join(keys,'issuer-public.hex'),'utf8').trim(),'hex').toString('base64url')},format:'jwk'});
        const claims=verifyLicense(original,publicKey);assert.equal(claims.licensed_to,options.Licensee);assert.equal(claims.machine_id,request().machine_id);assert.deepEqual(claims.rights,policy.starter);
        writeFileSync(requestPath,JSON.stringify(request('B')));const replacement=join(root,'replacement.sclicense');
        const reissue={Action:'Reissue',PrivateKeyPath:privateKeyPath,OriginalLicensePath:outputPath,RequestPath:requestPath,Reason:'Verified repair fixture',OutputPath:replacement};
        action(reissue,false);action({...reissue,ReplacementConfirmed:true});
        const replaced=verifyLicense(readFileSync(replacement,'utf8'),publicKey);assert.equal(replaced.license_id,claims.license_id);assert.equal(replaced.machine_id,request('B').machine_id);assert.deepEqual(replaced.rights,claims.rights);
        action({...options,PurchaseConfirmed:true,OutputPath:join(root,'bad.sclicense')},false,'wrong-password-long-enough');
        const ambient=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/desktop.ps1'),'-Action','build','-LicensedBuild'],{env:{...process.env,SOCIALCHOICE_LICENSE_PUBLIC_KEY:readFileSync(join(keys,'issuer-public.hex'),'utf8').trim()},encoding:'utf8',timeout:10000,windowsHide:true});
        assert.notEqual(ambient.status,0);assert.match(ambient.stderr+ambient.stdout,/explicit IssuerPublicKeyFile/);
        const malformedKey=join(root,'bad-public.hex');writeFileSync(malformedKey,'not-a-public-key');
        action({Action:'Build',SourcePath:resolve('.'),PublicKeyPath:malformedKey},false);
        assert.throws(()=>issueLicense({requestPath,machineId:request().machine_id,policy,edition:'starter',licensedTo:'fixture'}),/exactly one/);
    }finally{rmSync(root,{recursive:true,force:true});}
});

test('commercial build is explicit and has a separate application identity',()=>{
    const normal=JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json',import.meta.url)));
    const licensed=JSON.parse(readFileSync(new URL('../src-tauri/tauri.licensed.conf.json',import.meta.url)));
    assert.equal(licensed.productName,'Socialchoice');assert.equal(licensed.identifier,'com.socialchoice.desktop');assert.notEqual(licensed.identifier,normal.identifier);
});
