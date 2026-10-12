$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath '.env.meta') { throw '.env.meta already exists. Edit it locally and preserve the encryption key.' }
$metaAppId = Read-Host 'Meta App ID'
$metaVersion = Read-Host 'Supported Graph API version from Meta dashboard (vXX.0)'
$metaCallback = Read-Host 'Valid OAuth Redirect URI (Enter for http://127.0.0.1:3001/api/meta/callback)'
if (-not $metaCallback) { $metaCallback = 'http://127.0.0.1:3001/api/meta/callback' }
$metaLoginId = Read-Host 'Facebook Login for Business configuration ID (Enter if not used)'
$metaSecret = Read-Host 'Meta App Secret (not a Facebook password)' -AsSecureString
$metaPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($metaSecret)
$previousOutputEncoding = $OutputEncoding
try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $metaPlaintext = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($metaPointer)
    @{ appId = $metaAppId; version = $metaVersion; redirectUri = $metaCallback; loginConfigId = $metaLoginId; appSecret = $metaPlaintext } | ConvertTo-Json -Compress | node server/setup-meta.js
    if ($LASTEXITCODE -ne 0) { throw 'Meta setup failed' }
} finally {
    $OutputEncoding = $previousOutputEncoding
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($metaPointer)
    $metaPlaintext = $null
    $metaSecret.Dispose()
}
