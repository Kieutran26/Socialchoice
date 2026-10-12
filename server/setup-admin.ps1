$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath '.env.admin') { throw '.env.admin already exists; keep a protected backup before replacing it.' }
$adminSecret = Read-Host 'New Socialchoice password (15-256 characters, not your Facebook password)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
$previousOutputEncoding = $OutputEncoding
try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $adminPlaintext = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    $adminPlaintext | node server/setup-admin.js
    if ($LASTEXITCODE -ne 0) { throw 'Admin setup failed' }
} finally {
    $OutputEncoding = $previousOutputEncoding
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    $adminPlaintext = $null
    $adminSecret.Dispose()
}
