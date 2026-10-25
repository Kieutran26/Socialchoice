param(
    [ValidateSet('Menu','Init','Issue')][string]$Action='Menu',
    [string]$KeyDirectory='D:\Socialchoice-Private\web-issuer',
    [string]$Email,[string]$Licensee,[string]$Edition,[string]$OutputPath,
    [switch]$PurchaseConfirmed
)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
$taskInteractive=$Action -eq 'Menu'
$taskCli=Join-Path $PSScriptRoot 'web-license-owner.mjs'
$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')+'\'
$taskDirectory=[IO.Path]::GetFullPath($KeyDirectory).TrimEnd('\')
if ($taskDirectory.StartsWith($taskRepo,[StringComparison]::OrdinalIgnoreCase) -or ($taskDirectory+'\') -eq $taskRepo) { throw 'Keep issuer keys outside the source repository.' }
for ($taskAncestor=$taskDirectory; $taskAncestor; $taskAncestor=Split-Path $taskAncestor -Parent) {
    if ((Test-Path -LiteralPath $taskAncestor) -and ((Get-Item -LiteralPath $taskAncestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Issuer paths cannot contain junctions or symbolic links.' }
}
$taskNode=(Get-Command node -ErrorAction Stop).Source
if ([int]((& $taskNode --version).TrimStart('v').Split('.')[0]) -lt 24) { throw 'Node.js 24 or newer is required.' }
function Read-Required([string]$Value,[string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -and $taskInteractive) { $Value=Read-Host $Label }
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Missing: $Label" }
    return $Value.Trim()
}
function Invoke-PrivateIssuer([string[]]$IssuerArguments,[Security.SecureString]$Secret) {
    $taskPrevious=[Environment]::GetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE','Process')
    $taskPointer=[IntPtr]::Zero
    try {
        $taskPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
        [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',[Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer),'Process')
        & $taskNode $taskCli @IssuerArguments
        if ($LASTEXITCODE -ne 0) { throw 'License operation failed.' }
    } finally {
        [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',$taskPrevious,'Process')
        if ($taskPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer) }
    }
}
if ($taskInteractive) {
    Write-Host 'Socialchoice WEB licenses: 1 = setup issuer, 2 = issue purchased license'
    $taskChoice=Read-Host 'Choose 1 or 2'
    if ($taskChoice -eq '1') { $Action='Init' } elseif ($taskChoice -eq '2') { $Action='Issue' } else { throw 'Invalid choice.' }
}
if ($Action -eq 'Init') {
    if (Test-Path -LiteralPath $taskDirectory) { throw 'Issuer directory already exists; never replace an active issuer.' }
    $taskParent=Split-Path $taskDirectory -Parent
    if (-not (Test-Path -LiteralPath $taskParent)) { New-Item -ItemType Directory -Path $taskParent | Out-Null }
    # Restrict the staging directory before writing any private key material.
    $taskAcl=New-Object Security.AccessControl.DirectorySecurity
    $taskSid=[Security.Principal.WindowsIdentity]::GetCurrent().User
    $taskAcl.SetOwner($taskSid);$taskAcl.SetAccessRuleProtection($true,$false)
    $taskRule=New-Object Security.AccessControl.FileSystemAccessRule($taskSid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $taskAcl.AddAccessRule($taskRule)
    # Do not change permissions on a user-selected existing parent directory.
    $taskStage=Join-Path $taskParent ('.web-issuer-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $taskStage | Out-Null
    Set-Acl -LiteralPath $taskStage -AclObject $taskAcl
    $taskBytes=New-Object byte[] 48
    $taskRng=[Security.Cryptography.RandomNumberGenerator]::Create()
    try { $taskRng.GetBytes($taskBytes) } finally { $taskRng.Dispose() }
    $taskSecure=ConvertTo-SecureString ([Convert]::ToBase64String($taskBytes)) -AsPlainText -Force
    [Array]::Clear($taskBytes,0,$taskBytes.Length)
    $taskNested=Join-Path $taskStage 'issuer'
    Invoke-PrivateIssuer @('init','--out',$taskNested) $taskSecure
    $taskSecure | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $taskNested 'passphrase.dpapi') -Encoding ASCII
    Set-Acl -LiteralPath $taskNested -AclObject $taskAcl
    [IO.Directory]::Move($taskNested,$taskDirectory)
    Remove-Item -LiteralPath $taskStage
    Write-Host "Issuer ready: $taskDirectory"
    Write-Host 'Windows protects its passphrase for this Windows user. Make a full system backup; copying these files to another computer alone cannot recover it.'
} else {
    if (-not $PurchaseConfirmed) {
        if (-not $taskInteractive -or (Read-Host 'Payment verified for this customer? Type YES') -cne 'YES') { throw 'Purchase confirmation is required.' }
    }
    $Email=Read-Required $Email 'Customer email'
    $Licensee=Read-Required $Licensee 'Customer name or order label'
    $Edition=Read-Required $Edition 'starter / professional / business'
    $OutputPath=Read-Required $OutputPath 'New output file ending in .scweblicense'
    $taskSecure=(Get-Content -LiteralPath (Join-Path $taskDirectory 'passphrase.dpapi') -Raw).Trim() | ConvertTo-SecureString
    Invoke-PrivateIssuer @('issue','--key',(Join-Path $taskDirectory 'issuer-private.pem'),'--email',$Email,'--licensee',$Licensee,'--edition',$Edition,'--out',$OutputPath,'--confirm-purchase') $taskSecure
}
