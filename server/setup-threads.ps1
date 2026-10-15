$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath '.env.threads') { throw 'Existing Threads configuration is preserved. Edit it privately if needed.' }
$threadsAppId = Read-Host 'Threads App ID (distinct from Facebook App ID)'
$threadsCallback = Read-Host 'Threads callback URI (Enter for https://socialchoice.vercel.app/api/threads/callback)'
if (-not $threadsCallback) { $threadsCallback = 'https://socialchoice.vercel.app/api/threads/callback' }
$threadsSecret = Read-Host 'Threads App Secret (hidden, never enter it in chat)' -AsSecureString
$threadsPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($threadsSecret)
$previousOutputEncoding = $OutputEncoding
try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $threadsPlaintext = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($threadsPointer)
    @{ appId=$threadsAppId; appSecret=$threadsPlaintext; redirectUri=$threadsCallback } | ConvertTo-Json -Compress | node server/setup-threads.js
    if ($LASTEXITCODE -ne 0) { throw 'Threads setup failed' }
} finally {
    $OutputEncoding=$previousOutputEncoding
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($threadsPointer)
    $threadsPlaintext=$null
    $threadsSecret.Dispose()
}
