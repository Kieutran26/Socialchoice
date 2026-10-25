param(
    [ValidateSet('Menu','Init','Policy','Issue','Reissue','Build')][string]$Action='Menu',
    [string]$KeyDirectory,[string]$PrivateKeyPath,[string]$PublicKeyPath,[string]$PolicyPath,
    [string]$RequestPath,[string]$Edition,[string]$Licensee,[string]$OriginalLicensePath,
    [string]$Reason,[string]$OutputPath,[string]$SourcePath,[Security.SecureString]$Passphrase,
    [switch]$PurchaseConfirmed,[switch]$ReplacementConfirmed
)
$ErrorActionPreference='Stop'
$taskInteractive=$Action -eq 'Menu'
$taskBridge=Join-Path $PSScriptRoot 'license-owner-bridge.mjs'
$taskNode=(Get-Command node -ErrorAction Stop).Source
if ([int]((& $taskNode --version).TrimStart('v').Split('.')[0]) -lt 24) { throw 'Can Node.js 24 tro len de dung bo cong cu nay.' }
function Require-Text([string]$Value,[string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        if (-not $taskInteractive) { throw "Thieu tham so: $Label" }
        $Value=Read-Host $Label
    }
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Khong duoc de trong: $Label" }
    return $Value.Trim()
}
function Require-Path([string]$Value,[string]$Label) { return (Require-Text $Value $Label).Trim('"') }
function Confirm-Owner([bool]$Confirmed,[string]$Message) {
    if ($Confirmed) { return }
    if (-not $taskInteractive -or (Read-Host "$Message (go YES de xac nhan)") -cne 'YES') { throw 'Chua xac nhan dieu kien cap phep.' }
}
function Invoke-Issuer([string[]]$Arguments,[switch]$Secret) {
    $taskPrevious=[Environment]::GetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE','Process')
    $taskPointer=[IntPtr]::Zero
    $taskPreviousEncoding=$OutputEncoding
    $OutputEncoding=New-Object Text.UTF8Encoding($false)
    try {
        [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',$null,'Process')
        if ($Secret) {
            $taskSecret=$Passphrase
            if (-not $taskSecret) {
                if (-not $taskInteractive) { throw 'Can SecureString Passphrase; khong truyen mat khau dang text vao dong lenh.' }
                $taskSecret=Read-Host 'Mat khau khoa rieng (it nhat 16 ky tu, khong hien thi)' -AsSecureString
            }
            $taskPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
            $taskPlain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer)
            [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',$taskPlain,'Process')
            $taskPlain=$null
        }
        $taskJson=ConvertTo-Json -InputObject @($Arguments) -Compress
        # Escape non-ASCII JSON characters so legacy pipeline encoding cannot alter customer labels.
        $taskJson=[regex]::Replace($taskJson,'[^\x00-\x7F]',{param($taskMatch) '\u{0:x4}' -f [int][char]$taskMatch.Value})
        $taskJson | & $taskNode $taskBridge
        if ($LASTEXITCODE -ne 0) { throw 'Tac vu that bai. Khong gui file cho khach neu chua kiem tra ket qua.' }
    } finally {
        [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',$taskPrevious,'Process')
        if ($taskPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer) }
        $OutputEncoding=$taskPreviousEncoding
        $taskPlain=$null;$taskSecret=$null
    }
}
function Configure-Policy {
    $taskTemporary=$null
    try {
        $taskInput=$PolicyPath
        if ($taskInteractive) {
            $taskPolicy=[ordered]@{}
            foreach ($taskEdition in @('starter','professional','business')) {
                $taskRights=[ordered]@{}
                foreach ($taskRight in @('ai','media_import','backup_restore')) {
                    $taskChoice=Read-Host "$taskEdition - $taskRight (Y co / N khong)"
                    if ($taskChoice -notin @('Y','N')) { throw 'Phai chon Y hoac N cho tung quyen, khong co mac dinh.' }
                    $taskRights[$taskRight]=$taskChoice -ieq 'Y'
                }
                $taskLimit=Read-Host "$taskEdition - so thuong hieu hoat dong (1-1000000 hoac UNLIMITED)"
                if ($taskLimit -ieq 'UNLIMITED') { $taskRights['max_active_brands']=$null }
                elseif ($taskLimit -match '^\d{1,7}$' -and [int]$taskLimit -ge 1 -and [int]$taskLimit -le 1000000) { $taskRights['max_active_brands']=[int]$taskLimit }
                else { throw 'Gioi han thuong hieu khong hop le.' }
                $taskPolicy[$taskEdition]=$taskRights
            }
            $taskTemporary=[IO.Path]::GetTempFileName();$taskInput=$taskTemporary
            [IO.File]::WriteAllText($taskTemporary,($taskPolicy|ConvertTo-Json -Depth 4),(New-Object Text.UTF8Encoding($false)))
        }
        $taskInput=Require-Path $taskInput 'File policy JSON da chon ro tung quyen'
        $taskOutput=Require-Path $OutputPath 'Luu file policy moi (khong ghi de file cu)'
        Invoke-Issuer -Arguments @('policy','--policy',$taskInput,'--out',$taskOutput)
    } finally { if ($taskTemporary) { Remove-Item -LiteralPath $taskTemporary -ErrorAction SilentlyContinue } }
}
function Invoke-OwnerAction([string]$Selected) {
    switch ($Selected) {
        'Init' {
            Write-Host 'Giu khoa rieng + mat khau o noi an toan, sao luu rieng. Khong dua vao app/installer/Git.'
            $taskDirectory=Require-Path $KeyDirectory 'Thu muc MOI de luu khoa, nam ngoai repo'
            Invoke-Issuer -Arguments @('init','--out',$taskDirectory) -Secret
        }
        'Policy' { Configure-Policy }
        'Issue' {
            Confirm-Owner ([bool]$PurchaseConfirmed) 'Da kiem tra don hang da thanh toan cho may nay? Them may phai mua them license.'
            $taskKey=Require-Path $PrivateKeyPath 'File issuer-private.pem'
            $taskPolicy=Require-Path $PolicyPath 'File policy JSON'
            $taskRequest=Require-Path $RequestPath 'File .scactivation khach gui'
            $taskEdition=Require-Text $Edition 'Goi starter / professional / business'
            $taskOwner=Require-Text $Licensee 'Nhan chu so huu hoac ma don hang (khong can noi dung rieng tu)'
            $taskOutput=Require-Path $OutputPath 'File .sclicense MOI de gui khach'
            Invoke-Issuer -Arguments @('issue','--key',$taskKey,'--policy',$taskPolicy,'--request',$taskRequest,'--edition',$taskEdition,'--licensee',$taskOwner,'--out',$taskOutput) -Secret
        }
        'Reissue' {
            Write-Host 'Offline khong thu hoi tu xa file cu. Khong cap lai de tang so may dung dong thoi.'
            Confirm-Owner ([bool]$ReplacementConfirmed) 'Da xac minh cung may sua/cai lai, khong phai mua them may?'
            $taskKey=Require-Path $PrivateKeyPath 'File issuer-private.pem'
            $taskOriginal=Require-Path $OriginalLicensePath 'File SC2 goc da cap'
            $taskRequest=Require-Path $RequestPath 'File .scactivation hien tai'
            $taskReason=Require-Text $Reason 'Tham chieu ho tro va ly do cap lai (khong ghi thong tin nhay cam)'
            $taskOutput=Require-Path $OutputPath 'File .sclicense thay the MOI'
            Invoke-Issuer -Arguments @('reissue','--key',$taskKey,'--original',$taskOriginal,'--request',$taskRequest,'--reason',$taskReason,'--confirm-replacement','--out',$taskOutput) -Secret
        }
        'Build' {
            $taskSource=$SourcePath
            if (-not $taskSource -and (Test-Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'src-tauri/Cargo.toml'))) { $taskSource=Split-Path -Parent $PSScriptRoot }
            $taskSource=Require-Path $taskSource 'Thu muc source Socialchoice co scripts/desktop.ps1'
            $taskPublic=Require-Path $PublicKeyPath 'File issuer-public.hex (KHONG phai khoa rieng)'
            $taskBuild=Join-Path $taskSource 'scripts/desktop.ps1'
            if (-not (Test-Path -LiteralPath $taskBuild)) { throw 'Khong tim thay source build. Can source, pnpm, Rust va C++ Build Tools.' }
            $taskPreviousSecret=[Environment]::GetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE','Process')
            $taskPreviousKey=[Environment]::GetEnvironmentVariable('SOCIALCHOICE_LICENSE_PUBLIC_KEY','Process')
            try {
                [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',$null,'Process')
                & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $taskBuild -Action build -LicensedBuild -IssuerPublicKeyFile $taskPublic
                if ($LASTEXITCODE -ne 0) { throw 'Build that bai; khong phan phoi ket qua.' }
            } finally {
                [Environment]::SetEnvironmentVariable('SOCIALCHOICE_ISSUER_PASSPHRASE',$taskPreviousSecret,'Process')
                [Environment]::SetEnvironmentVariable('SOCIALCHOICE_LICENSE_PUBLIC_KEY',$taskPreviousKey,'Process')
            }
        }
    }
}
if ($taskInteractive) {
    Write-Host 'SOCIALCHOICE - CONG CU CHU PHAN MEM (Node.js24+)'
    do {
        Write-Host "`n1 Tao khoa | 2 Chon quyen tung goi | 3 Cap license | 4 Cap lai | 5 Build ban ban hang | 0 Thoat"
        $taskChoice=Read-Host 'Chon tac vu'
        $taskSelected=@{'1'='Init';'2'='Policy';'3'='Issue';'4'='Reissue';'5'='Build'}[$taskChoice]
        if ($taskSelected) { try { Invoke-OwnerAction $taskSelected } catch { Write-Host $_.Exception.Message -ForegroundColor Red } }
    } while ($taskChoice -ne '0')
} else { Invoke-OwnerAction $Action }
