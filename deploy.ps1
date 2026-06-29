#Requires -Version 5.1
<#
.SYNOPSIS
    Deploy FairMT2 webpage to a FreeBSD VPS via SSH (OpenSSH + key auth).

.DESCRIPTION
    Builds CSS locally, copies project files to the VPS, runs npm install
    on the remote, and restarts the lonlimt2 service.

    Uses the native Windows OpenSSH client (ssh.exe / scp.exe), so it honours
    your ~/.ssh/config: host aliases, ports, usernames, and IdentityFile keys
    are all resolved from there. Authentication is by SSH key (or ssh-agent) —
    no password is passed on the command line.

    Optionally uploads a specific .env.<Env> file as .env on the host.

.EXAMPLE
    # Uses the 'vps-lonli' alias from ~/.ssh/config (host, port, user, key)
    .\deploy.ps1 vps-lonli
    .\deploy.ps1 vps-lonli production

    # Or target a raw host, overriding user / key / port explicitly
    .\deploy.ps1 51.83.160.241:33666 production -User root -IdentityFile ~/.ssh/vps_lonli
#>

param(
    [Parameter(Mandatory, Position = 0, HelpMessage = "SSH host alias (from ~/.ssh/config) or ip[:port]")]
    [string]$Target,

    [Parameter(Position = 1, HelpMessage = "Environment name -- uploads .env.<Env> as .env on the host (e.g. 'local', 'production')")]
    [string]$Env = "",

    [Parameter(HelpMessage = "Override SSH user (default: from ~/.ssh/config or current user)")]
    [string]$User = "",

    [Parameter(HelpMessage = "Override identity (private key) file")]
    [string]$IdentityFile = "",

    [Parameter(HelpMessage = "Override SSH port (default: from ~/.ssh/config or 22)")]
    [string]$Port = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$remoteDir = "/usr/metin2/webpage"

# -- Parse target ----------------------------------------------------------------
# If Target contains ':' treat it as host:port; otherwise it is a bare hostname
# or an ~/.ssh/config Host alias (which supplies port/user/key on its own).

if ($Target -match ':') {
    $parts    = $Target.Split(':', 2)
    $hostName = $parts[0]
    if (-not $Port) { $Port = $parts[1] }
} else {
    $hostName = $Target
}

$dest = if ($User) { "$User@$hostName" } else { $hostName }

# -- Build SSH/SCP option arrays -------------------------------------------------
# ssh uses -p for port, scp uses -P. Auto-accept a new host key on first connect
# but still protect against a changed key.

$sshExtra = @('-o', 'StrictHostKeyChecking=accept-new')
$scpExtra = @('-o', 'StrictHostKeyChecking=accept-new')

if ($Port)         { $sshExtra += @('-p', $Port);          $scpExtra += @('-P', $Port) }
if ($IdentityFile) { $sshExtra += @('-i', $IdentityFile);  $scpExtra += @('-i', $IdentityFile) }

Write-Host ""
Write-Host "==> Deploying to ${dest}$(if($Port){":$Port"}) -> $remoteDir"
if ($Env -ne "") {
    Write-Host "    Env file : .env.$Env  ->  $remoteDir/.env"
} else {
    Write-Host "    Env file : (none -- .env on host left unchanged)"
}
Write-Host ""

# -- Resolve env file ------------------------------------------------------------

$envFile = $null
if ($Env -ne "") {
    $envFile = Join-Path $PSScriptRoot ".env.$Env"
    if (-not (Test-Path $envFile)) {
        Write-Error "Env file not found: $envFile"
        exit 1
    }
}

# -- Check dependencies ----------------------------------------------------------

function Require-Command($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "Missing required tool: '$cmd'. $hint"
        exit 1
    }
}

Require-Command "ssh" "Windows OpenSSH client. Enable it: Settings > Apps > Optional Features > OpenSSH Client"
Require-Command "scp" "Windows OpenSSH client. Enable it: Settings > Apps > Optional Features > OpenSSH Client"
Require-Command "npm" "Install Node.js: https://nodejs.org"

# -- Helper: run a remote command via ssh ----------------------------------------

function Remote($cmd) {
    Write-Host "  [remote] $cmd"
    & ssh @sshExtra $dest $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Remote command failed (exit $LASTEXITCODE): $cmd"
        exit 1
    }
}

# -- Helper: upload local paths via scp ------------------------------------------

function Upload([string[]]$localPaths, $remotePath) {
    foreach ($p in $localPaths) { Write-Host "  [upload] $p -> ${remotePath}" }
    & scp @scpExtra -r @localPaths "${dest}:${remotePath}"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Upload failed."
        exit 1
    }
}

# -- Step 1: Build CSS locally ---------------------------------------------------

Write-Host "--> [1/4] Building CSS locally..."
npm run build:css
if ($LASTEXITCODE -ne 0) {
    Write-Error "CSS build failed. Fix errors before deploying."
    exit 1
}
Write-Host "    CSS built OK"
Write-Host ""

# -- Step 2: Prepare remote directory --------------------------------------------
# Clear the dirs we fully manage so scp recreates them cleanly (avoids scp's
# nested-directory behaviour when a target dir already exists).

Write-Host "--> [2/4] Preparing remote directory..."
Remote "mkdir -p $remoteDir && rm -rf $remoteDir/src $remoteDir/locales $remoteDir/public"
Write-Host ""

# -- Step 3: Copy files ----------------------------------------------------------

Write-Host "--> [3/4] Uploading files..."

$scriptDir = $PSScriptRoot
$sources = @(
    (Join-Path $scriptDir 'src'),
    (Join-Path $scriptDir 'locales'),
    (Join-Path $scriptDir 'public'),
    (Join-Path $scriptDir 'package.json'),
    (Join-Path $scriptDir 'package-lock.json'),
    (Join-Path $scriptDir 'tsconfig.json'),
    (Join-Path $scriptDir 'tailwind.config.js')
)
Upload $sources $remoteDir

if ($envFile) {
    Write-Host "  [upload] .env.$Env -> $remoteDir/.env"
    & scp @scpExtra $envFile "${dest}:${remoteDir}/.env"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Upload failed: $envFile"
        exit 1
    }
}
Write-Host ""

# -- Step 4: Install deps + restart service --------------------------------------

Write-Host "--> [4/4] Installing dependencies and restarting service..."
Remote "cd $remoteDir && npm install --omit=dev"
Remote "service lonlimt2 restart"
Write-Host ""

# -- Done ------------------------------------------------------------------------

Write-Host "==> Deploy complete."
Write-Host "    http://${hostName}:8080"
Write-Host ""
