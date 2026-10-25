param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'build', 'test')]
    [string]$Action,
    [switch]$SmokeBuild,
    [switch]$LicensedBuild,
    [string]$IssuerPublicKeyFile,
    [string]$AuthBrokerOrigin
)
$ErrorActionPreference = 'Stop'
if ($AuthBrokerOrigin) {
    $taskBrokerUri = $null
    if (-not [Uri]::TryCreate($AuthBrokerOrigin, [UriKind]::Absolute, [ref]$taskBrokerUri) -or $taskBrokerUri.Scheme -ne 'https' -or $taskBrokerUri.Authority -ne $taskBrokerUri.Host -or $taskBrokerUri.UserInfo -or $taskBrokerUri.Query -or $taskBrokerUri.Fragment -or $taskBrokerUri.AbsolutePath -ne '/' -or $AuthBrokerOrigin -ne ('https://' + $taskBrokerUri.Host)) { throw 'AuthBrokerOrigin must be the exact HTTPS origin, without a path or trailing slash.' }
    $env:SOCIALCHOICE_AUTH_BROKER_ORIGIN = $AuthBrokerOrigin
} else { Remove-Item Env:SOCIALCHOICE_AUTH_BROKER_ORIGIN -ErrorAction SilentlyContinue }
if ($LicensedBuild -and ($Action -ne 'build' -or $SmokeBuild)) { throw 'LicensedBuild is only valid for a commercial build, separate from SmokeBuild.' }
if ($LicensedBuild -and -not $IssuerPublicKeyFile) { throw 'A licensed build requires an explicit IssuerPublicKeyFile; inherited environment trust is insufficient.' }
if ($IssuerPublicKeyFile) {
    if (-not $LicensedBuild) { throw 'IssuerPublicKeyFile requires LicensedBuild.' }
    $taskPublicKey = (Get-Content -LiteralPath $IssuerPublicKeyFile -Raw).Trim()
    if ($taskPublicKey -notmatch '^[0-9a-fA-F]{64}$') { throw 'The issuer public key file must contain exactly 64 hexadecimal characters.' }
    if ($env:SOCIALCHOICE_LICENSE_PUBLIC_KEY -and $env:SOCIALCHOICE_LICENSE_PUBLIC_KEY -ne $taskPublicKey) { throw 'The selected public key differs from the existing build environment. Clear the old key first.' }
    $env:SOCIALCHOICE_LICENSE_PUBLIC_KEY = $taskPublicKey
}
if ($LicensedBuild -and $env:SOCIALCHOICE_LICENSE_PUBLIC_KEY -notmatch '^[0-9a-fA-F]{64}$') { throw 'A licensed build requires SOCIALCHOICE_LICENSE_PUBLIC_KEY from the owner issuer. Never pass private keys to the build.' }
# Only an explicit commercial or smoke build may inherit trust; tests inject their own policies.
if ($Action -eq 'test' -or (-not $LicensedBuild -and -not $SmokeBuild)) { Remove-Item Env:SOCIALCHOICE_LICENSE_PUBLIC_KEY -ErrorAction SilentlyContinue }
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path (Join-Path $taskCargoBin 'cargo.exe')) { $env:PATH = $taskCargoBin + ';' + $env:PATH }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Install the Rust MSVC toolchain first. See docs/desktop-prototype.md.' }

$taskVswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path $taskVswhere)) { throw 'Install Microsoft C++ Build Tools and Windows SDK first.' }
$taskVsRoot = & $taskVswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $taskVsRoot) { throw 'MSVC x64 compiler is missing. See docs/desktop-prototype.md.' }
$taskDevCmd = Join-Path $taskVsRoot 'Common7\Tools\VsDevCmd.bat'
$taskEnvironment = & cmd.exe /d /c "`"$taskDevCmd`" -no_logo -arch=amd64 -host_arch=amd64 >nul && set"
if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize the Windows compiler environment.' }
foreach ($taskLine in $taskEnvironment) {
    $taskPair = $taskLine -split '=', 2
    if ($taskPair.Count -eq 2 -and $taskPair[0] -in @('PATH', 'LIB', 'LIBPATH', 'INCLUDE', 'WindowsSdkDir', 'WindowsSDKVersion', 'VCToolsInstallDir', 'VSCMD_ARG_TGT_ARCH')) {
        [Environment]::SetEnvironmentVariable($taskPair[0], $taskPair[1], 'Process')
    }
}
Push-Location $taskRoot
try {
    if ($Action -eq 'test') { & cargo test --manifest-path src-tauri/Cargo.toml --locked }
    elseif ($LicensedBuild) { & pnpm exec tauri build --config src-tauri/tauri.licensed.conf.json }
    elseif ($SmokeBuild) { & pnpm exec tauri build --config src-tauri/tauri.smoke.conf.json --no-bundle }
    else { & pnpm exec tauri $Action }
    $taskExit = $LASTEXITCODE
} finally { Pop-Location }
exit $taskExit
