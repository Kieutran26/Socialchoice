import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyWebLicense } from '../server/web-license.js';

test('Windows owner menu protects its issuer, refuses replacement, and issues only confirmed web licenses', { skip: process.platform !== 'win32' }, () => {
    const root = mkdtempSync(join(tmpdir(), 'socialchoice-web-owner-')), directory = join(root, 'issuer'), out = join(root, 'fixture.scweblicense');
    const run = args => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/web-license-owner.ps1', '-KeyDirectory', directory, ...args], { encoding: 'utf8', windowsHide: true });
    try {
        const init = run(['-Action', 'Init']); assert.equal(init.status, 0, init.stderr);
        const encrypted = readFileSync(join(directory, 'issuer-private.pem'), 'utf8'); assert.match(encrypted, /BEGIN ENCRYPTED PRIVATE KEY/);
        const acl = spawnSync('powershell.exe', ['-NoProfile', '-Command', "Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1'); $a=Get-Acl -LiteralPath $env:SOCIALCHOICE_TEST_ISSUER; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; [pscustomobject]@{protected=$a.AreAccessRulesProtected;onlyOwner=@($a.Access | Where-Object { $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value }).Count -eq 0} | ConvertTo-Json -Compress"], { encoding: 'utf8', windowsHide: true, env: { ...process.env, SOCIALCHOICE_TEST_ISSUER: join(directory, 'issuer-private.pem') } });
        assert.equal(acl.status, 0, acl.stderr); assert.equal(JSON.parse(acl.stdout).onlyOwner, true);
        assert.ok(readFileSync(join(directory, 'passphrase.dpapi'), 'utf8').trim().length > 80);
        assert.notEqual(run(['-Action', 'Init']).status, 0); assert.equal(readFileSync(join(directory, 'issuer-private.pem'), 'utf8'), encrypted);
        const args = ['-Action', 'Issue', '-Email', 'fixture@example.com', '-Licensee', 'Fixture customer', '-Edition', 'professional', '-OutputPath', out];
        assert.notEqual(run(args).status, 0); assert.equal(existsSync(out), false);
        const issued = run([...args, '-PurchaseConfirmed']); assert.equal(issued.status, 0, issued.stderr);
        assert.doesNotMatch(issued.stdout, /SCW1\./);
        const token = readFileSync(out, 'utf8'), publicKey = readFileSync(join(directory, 'issuer-public.hex'), 'utf8').trim();
        assert.equal(verifyWebLicense(token, publicKey).email, 'fixture@example.com');
        assert.notEqual(run([...args, '-PurchaseConfirmed']).status, 0); assert.equal(readFileSync(out, 'utf8'), token);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
