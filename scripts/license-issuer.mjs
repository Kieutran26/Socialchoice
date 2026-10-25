import { generateKeyPairSync,createPrivateKey,createPublicKey,sign,verify,randomUUID } from 'node:crypto';
import { mkdirSync,writeFileSync,readFileSync,statSync,lstatSync,realpathSync } from 'node:fs';
import { resolve,relative,dirname,basename,isAbsolute,sep } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';

import {resolveMachineId,validateMachineId} from './license-activation-request.mjs';

export const DOMAIN=Buffer.from('Socialchoice offline license v2\0');
const editions=['starter','professional','business'];
const rightsKeys=['ai','media_import','backup_restore','max_active_brands'];
function password(value){if(typeof value!=='string'||value.length<16)throw new Error('Set an issuer passphrase of at least 16 characters through SOCIALCHOICE_ISSUER_PASSPHRASE.');}
function owner(value){return typeof value==='string'&&!!value.trim()&&[...value].length<=160&&!/\p{Cc}/u.test(value);}
const machine=validateMachineId;
export function validatePolicy(policy){
    if(!policy||typeof policy!=='object'||Array.isArray(policy)||Object.keys(policy).length!==3||editions.some(edition=>!Object.hasOwn(policy,edition)))throw new Error('Policy must define exactly starter, professional and business.');
    for(const edition of editions){const rights=policy[edition];if(!rights||Object.keys(rights).length!==4||rightsKeys.some(key=>!Object.hasOwn(rights,key)))throw new Error('Every edition must explicitly define all four rights fields.');
        if(rightsKeys.slice(0,3).some(key=>typeof rights[key]!=='boolean'))throw new Error('Choose true/false for every feature; policy template placeholders cannot be issued.');
        const limit=rights.max_active_brands;if(limit!==null&&(!Number.isInteger(limit)||limit<1||limit>1000000))throw new Error('Brand limit must be null (unlimited) or an integer 1–1000000.');
    }return policy;
}
export function initializeIssuer(directory,passphrase){
    password(passphrase);const target=resolve(directory),repo=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
    for(let ancestor=target;;ancestor=dirname(ancestor)){
        try{if(lstatSync(ancestor).isSymbolicLink())throw new Error('Issuer paths cannot contain symbolic links or junctions.');}
        catch(error){if(error.code!=='ENOENT')throw error;}
        if(dirname(ancestor)===ancestor)break;
    }
    const rel=relative(repo,resolve(realpathSync(dirname(target)),basename(target)));
    if(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep))throw new Error('Store issuer private keys outside the source repository.');
    const {publicKey,privateKey}=generateKeyPairSync('ed25519');
    const pem=privateKey.export({type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase});
    mkdirSync(target);writeFileSync(resolve(target,'issuer-private.pem'),pem,{flag:'wx',mode:0o600});
    const hex=Buffer.from(publicKey.export({format:'jwk'}).x,'base64url').toString('hex');
    writeFileSync(resolve(target,'issuer-public.hex'),hex+'\n',{flag:'wx'});return {public_key:hex,directory:target};
}
function issuer(options){password(options.passphrase);const key=createPrivateKey({key:readFileSync(options.privateKeyPath),passphrase:options.passphrase});if(key.asymmetricKeyType!=='ed25519')throw new Error('Issuer key must be Ed25519.');return key;}
function writeLicense(key,claims,output){
    const payload=Buffer.from(JSON.stringify(claims));const signature=sign(null,Buffer.concat([DOMAIN,payload]),key);
    const token='SC2.'+payload.toString('base64url')+'.'+signature.toString('base64url');
    if(output)writeFileSync(resolve(output),token+'\n',{flag:'wx',mode:0o600});return {token,claims,public_key:Buffer.from(createPublicKey(key).export({format:'jwk'}).x,'base64url').toString('hex')};
}
export function issueLicense(options){
    if(Object.hasOwn(options,'unbound')||Object.hasOwn(options,'installationId'))throw new Error('Unbound and installation licenses are no longer supported. Use a machine ID.');
    const {policy,edition,licensedTo,output}=options;validatePolicy(policy);const machineId=resolveMachineId(options);
    if(!editions.includes(edition))throw new Error('Choose starter, professional or business.');
    if(!owner(licensedTo))throw new Error('Provide a valid license owner label.');
    const claims={schema:2,product:'socialchoice-desktop',license_id:randomUUID(),licensed_to:licensedTo.trim(),edition,issued_at:new Date().toISOString(),machine_id:machineId,reissued_from_machine_id:null,reissue_reason:null,rights:policy[edition]};
    return writeLicense(issuer(options),claims,output);
}
export function verifyLicense(token,publicKey){
    if(typeof token!=='string'||token.length>16384)throw new Error('Invalid original license.');
    const parts=token.trim().split('.');if(parts.length!==3||parts[0]!=='SC2'||parts.slice(1).some(part=>!/^[\w-]+$/.test(part)))throw new Error('Only signed machine-bound SC2 licenses can be reissued.');
    const payload=Buffer.from(parts[1],'base64url'),signature=Buffer.from(parts[2],'base64url');
    if(payload.length>8192||signature.length!==64||!verify(null,Buffer.concat([DOMAIN,payload]),publicKey,signature))throw new Error('Original license signature is invalid or belongs to another issuer.');
    const claims=JSON.parse(payload.toString('utf8'));const fields=['schema','product','license_id','licensed_to','edition','issued_at','machine_id','rights','reissued_from_machine_id','reissue_reason'];
    if(!claims||Object.keys(claims).some(field=>!fields.includes(field))||claims.schema!==2||claims.product!=='socialchoice-desktop'||!editions.includes(claims.edition)||!owner(claims.licensed_to)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(claims.license_id)||!Number.isFinite(Date.parse(claims.issued_at)))throw new Error('Invalid original license claims.');
    machine(claims.machine_id);if(claims.reissued_from_machine_id!=null)machine(claims.reissued_from_machine_id);
    if(claims.reissue_reason!=null&&!reasonValid(claims.reissue_reason))throw new Error('Invalid original reissue reason.');
    validatePolicy(Object.fromEntries(editions.map(edition=>[edition,claims.rights])));return claims;
}
function reasonValid(reason){return typeof reason==='string'&&!!reason.trim()&&[...reason].length<=240&&!/\p{Cc}/u.test(reason);}
export function reissueLicense(options){
    const {originalLicensePath,reason,replacementConfirmed,output}=options;const machineId=resolveMachineId(options);
    if(replacementConfirmed!==true||!reasonValid(reason))throw new Error('Confirm a verified repair/reinstall replacement and supply a support reason. Additional computers require new purchases.');
    const key=issuer(options);if(statSync(originalLicensePath).size>16384)throw new Error('Original license file is too large.');
    const original=verifyLicense(readFileSync(originalLicensePath,'utf8'),createPublicKey(key));
    return writeLicense(key,{...original,machine_id:machineId,issued_at:new Date().toISOString(),reissued_from_machine_id:original.machine_id,reissue_reason:reason.trim()},output);
}
function cli(){
    const [command,...args]=process.argv.slice(2),flags={};
    for(let index=0;index<args.length;index++){const name=args[index];if(!name.startsWith('--')||Object.hasOwn(flags,name))throw new Error('Invalid or duplicate issuer option.');if(name==='--confirm-replacement')flags[name]=true;else{if(!args[index+1]||args[index+1].startsWith('--'))throw new Error('Missing option value.');flags[name]=args[++index];}}
    const permitted=command==='init'||command==='policy-template'?['--out']:command==='policy'?['--policy','--out']:command==='reissue'?['--key','--original','--machine-id','--request','--reason','--confirm-replacement','--out']:['--key','--policy','--edition','--licensee','--out','--machine-id','--request'];
    if(Object.keys(flags).some(key=>!permitted.includes(key)))throw new Error('Unknown issuer option.');if(!flags['--out'])throw new Error('Provide --out.');
    if(command==='init'){console.log(JSON.stringify(initializeIssuer(flags['--out'],process.env.SOCIALCHOICE_ISSUER_PASSPHRASE)));return;}
    if(command==='policy'){const policy=validatePolicy(JSON.parse(readFileSync(flags['--policy'],'utf8').replace(/^\uFEFF/u,'')));writeFileSync(resolve(flags['--out']),JSON.stringify(policy,null,2)+'\n',{flag:'wx'});console.log('Policy saved. No license was issued.');return;}
    if(command==='policy-template'){const template=Object.fromEntries(editions.map(edition=>[edition,{ai:null,media_import:null,backup_restore:null,max_active_brands:null}]));writeFileSync(resolve(flags['--out']),JSON.stringify(template,null,2)+'\n',{flag:'wx'});console.log('Template created. Set all feature fields to true/false before issuing.');return;}
    const common={privateKeyPath:flags['--key'],passphrase:process.env.SOCIALCHOICE_ISSUER_PASSPHRASE,output:flags['--out'],machineId:flags['--machine-id'],requestPath:flags['--request']};let result;
    if(command==='reissue'&&flags['--original'])result=reissueLicense({...common,originalLicensePath:flags['--original'],reason:flags['--reason'],replacementConfirmed:flags['--confirm-replacement']});
    else if(command==='issue'&&flags['--policy'])result=issueLicense({...common,policy:JSON.parse(readFileSync(flags['--policy'],'utf8')),edition:flags['--edition'],licensedTo:flags['--licensee']});
    else throw new Error('Use init, policy-template, issue with --machine-id, or reissue with --original --machine-id --reason --confirm-replacement.');
    console.log(JSON.stringify({license_id:result.claims.license_id,edition:result.claims.edition,output:resolve(flags['--out'])}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{cli();}catch(error){console.error('Issuer: '+error.message);process.exitCode=1;}}
