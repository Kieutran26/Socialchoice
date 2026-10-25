import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync,writeFileSync,symlinkSync,unlinkSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { createPublicKey,verify } from 'node:crypto';
import { DOMAIN,initializeIssuer,issueLicense,validatePolicy,reissueLicense,verifyLicense } from './license-issuer.mjs';

test('encrypted issuer signs every edition and refuses unsafe or ambiguous issuance',()=>{
    const root=mkdtempSync(join(tmpdir(),'socialchoice-issuer-'));const passphrase='disposable-test-password';
    try {
        const issuer=initializeIssuer(join(root,'issuer'),passphrase);
        const privateKeyPath=join(issuer.directory,'issuer-private.pem');
        assert.match(readFileSync(privateKeyPath,'utf8'),/ENCRYPTED PRIVATE KEY/);
        assert.throws(()=>initializeIssuer(issuer.directory,passphrase));
        assert.throws(()=>initializeIssuer(resolve('..hidden-issuer-test'),passphrase),/outside/);
        if(process.platform==='win32'){
            const link=join(root,'source-junction');symlinkSync(resolve('.'),link,'junction');
            try{assert.throws(()=>initializeIssuer(join(link,'blocked-owner-keys'),passphrase),/junction|outside/);assert.equal(existsSync(join(link,'blocked-owner-keys')),false);}finally{unlinkSync(link);}
        }
        const rights={ai:true,media_import:true,backup_restore:true,max_active_brands:null};
        const policy=Object.fromEntries(['starter','professional','business'].map(edition=>[edition,{...rights}]));
        assert.throws(()=>validatePolicy({...policy,starter:{...rights,ai:null}}),/true\/false/);
        const options={privateKeyPath,passphrase,policy,licensedTo:'Test owner',machineId:'SCM1-'+ 'A'.repeat(64)};
        for(const edition of Object.keys(policy)) {
            const result=issueLicense({...options,edition});const [,payload,signature]=result.token.split('.');
            const publicKey=createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:Buffer.from(issuer.public_key,'hex').toString('base64url')},format:'jwk'});
            assert.equal(verify(null,Buffer.concat([DOMAIN,Buffer.from(payload,'base64url')]),publicKey,Buffer.from(signature,'base64url')),true);
            assert.equal(result.claims.edition,edition);
        }
        assert.throws(()=>issueLicense({...options,edition:'starter',passphrase:'incorrect-password-long'}));
        assert.throws(()=>issueLicense({...options,edition:'starter',machineId:undefined}),/machine ID/);
        assert.throws(()=>issueLicense({...options,edition:'starter',licensedTo:'bad\u0085owner'}),/owner/);
        assert.throws(()=>issueLicense({...options,edition:'starter',unbound:true}),/no longer/);
        const output=join(root,'customer.sclicense');const original=issueLicense({...options,edition:'starter',output});
        const replacement={privateKeyPath,passphrase,originalLicensePath:output,machineId:'SCM1-'+ 'B'.repeat(64),reason:'Verified motherboard repair',replacementConfirmed:true};
        const reissued=reissueLicense(replacement);assert.equal(reissued.claims.license_id,original.claims.license_id);assert.equal(reissued.claims.machine_id,replacement.machineId);assert.equal(reissued.claims.reissued_from_machine_id,options.machineId);assert.deepEqual(reissued.claims.rights,original.claims.rights);assert.equal(reissued.claims.edition,original.claims.edition);assert.equal(reissued.claims.licensed_to,original.claims.licensed_to);
        const publicKey=createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:Buffer.from(issuer.public_key,'hex').toString('base64url')},format:'jwk'});assert.equal(verifyLicense(reissued.token,publicKey).machine_id,replacement.machineId);
        assert.throws(()=>reissueLicense({...replacement,replacementConfirmed:false}),/Confirm/);
        assert.throws(()=>reissueLicense({...replacement,reason:''}),/reason/);
        const forged=join(root,'forged.sclicense');writeFileSync(forged,original.token.slice(0,-5)+'AAAAA');assert.throws(()=>reissueLicense({...replacement,originalLicensePath:forged}),/signature/);
        const another=initializeIssuer(join(root,'another'),passphrase);assert.throws(()=>reissueLicense({...replacement,privateKeyPath:join(another.directory,'issuer-private.pem')}),/issuer/);
        assert.throws(()=>issueLicense({...options,edition:'starter',output}),/exist/i);
    } finally {rmSync(root,{recursive:true,force:true});}
});
