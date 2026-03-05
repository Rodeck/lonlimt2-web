#Requires -Version 5.1
<#
.SYNOPSIS
    Deploy LonliMT2 webpage to a FreeBSD VPS via SSH.

.DESCRIPTION
    Builds CSS locally, copies project files to the VPS, runs npm install
    on the remote, and restarts the lonlimt2 service.

.EXAMPLE
    .\deploy.ps1 1.2.3.4:22 root:mypassword
#>

param(
    [Parameter(Mandatory, Position = 0, HelpMessage = "VPS address as ip:port")]
    [string]$Target,

    [Parameter(Mandatory, Position = 1, HelpMessage = "Credentials as user:password")]
    [string]$Credentials
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Parse arguments ────────────────────────────────────────────────────────────

$targetParts = $Target.Split(':', 2)
$vpsIp       = $targetParts[0]
$vpsPort     = if ($targetParts.Length -gt 1) { $targetParts[1] } else { "22" }

$credParts   = $Credentials.Split(':', 2)
$vpsUser     = $credParts[0]
$vpsPassword = $credParts[1]

$remoteDir   = "/usr/metin2/webpage"

Write-Host ""
Write-Host "==> Deploying to ${vpsUser}@${vpsIp}:${vpsPort} -> $remoteDir"
Write-Host ""

# ── Check dependencies ─────────────────────────────────────────────────────────

function Require-Command($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "Missing required tool: '$cmd'. $hint"
        exit 1
    }
}

Require-Command "plink" "Install PuTTY: https://www.putty.org  (ensure plink.exe is in PATH)"
Require-Command "pscp"  "Install PuTTY: https://www.putty.org  (ensure pscp.exe is in PATH)"
Require-Command "npm"   "Install Node.js: https://nodejs.org"

# ── Helper: run a remote command via plink ─────────────────────────────────────

function Remote($cmd) {
    Write-Host "  [remote] $cmd"
    $result = & plink -ssh -P $vpsPort -l $vpsUser -pw $vpsPassword -batch $vpsIp $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Remote command failed (exit $LASTEXITCODE): $cmd"
        exit 1
    }
    return $result
}

# ── Helper: upload a local path via pscp ──────────────────────────────────────

function Upload($localPath, $remotePath) {
    Write-Host "  [upload] $localPath -> $remotePath"
    & pscp -P $vpsPort -pw $vpsPassword -r -q $localPath "${vpsUser}@${vpsIp}:${remotePath}"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Upload failed: $localPath"
        exit 1
    }
}

# ── Helper: accept host key on first connect (PuTTY < 0.81 workaround) ────────

function Accept-HostKey() {
    Write-Host "--> [0/5] Caching host key..."
    # Pipe "y" to plink without -batch so it can prompt and cache the key in registry
    $proc = Start-Process -FilePath "plink" `
        -ArgumentList "-ssh -P $vpsPort -l $vpsUser -pw $vpsPassword $vpsIp exit" `
        -RedirectStandardInput "$env:TEMP\plink_yes.txt" `
        -RedirectStandardOutput "$env:TEMP\plink_out.txt" `
        -RedirectStandardError  "$env:TEMP\plink_err.txt" `
        -NoNewWindow -PassThru -Wait
    # Ignore exit code — just needed to cache the key
    Write-Host "    Host key cached."
    Write-Host ""
}

# ── Step 0: Cache host key (first-run, safe to repeat) ───────────────────────

"y" | Out-File -Encoding ascii "$env:TEMP\plink_yes.txt"
Accept-HostKey

# ── Step 1: Build CSS locally ──────────────────────────────────────────────────

Write-Host "--> [1/5] Building CSS locally..."
npm run build:css
if ($LASTEXITCODE -ne 0) {
    Write-Error "CSS build failed. Fix errors before deploying."
    exit 1
}
Write-Host "    CSS built OK"
Write-Host ""

# ── Step 2: Ensure remote directory exists ────────────────────────────────────

Write-Host "--> [2/5] Preparing remote directory..."
Remote "mkdir -p $remoteDir/public/css $remoteDir/public/images $remoteDir/locales $remoteDir/src"
Write-Host ""

# ── Step 3: Copy files ─────────────────────────────────────────────────────────

Write-Host "--> [3/5] Uploading files..."

$scriptDir = $PSScriptRoot

Upload "$scriptDir\src\"             "$remoteDir/src"
Upload "$scriptDir\locales\"         "$remoteDir/locales"
Upload "$scriptDir\public\"          "$remoteDir/public"
Upload "$scriptDir\package.json"     "$remoteDir/"
Upload "$scriptDir\package-lock.json" "$remoteDir/"
Upload "$scriptDir\tsconfig.json"    "$remoteDir/"
Upload "$scriptDir\tailwind.config.js" "$remoteDir/"

Write-Host ""

# ── Step 4: Install dependencies on remote ────────────────────────────────────

Write-Host "--> [4/5] Running npm install on remote..."
Remote "cd $remoteDir && npm install --omit=dev 2>&1"
Write-Host ""

# ── Step 5: Restart service ───────────────────────────────────────────────────

Write-Host "--> [5/5] Restarting lonlimt2 service..."
Remote "service lonlimt2 restart"
Write-Host ""

# ── Done ───────────────────────────────────────────────────────────────────────

Write-Host "==> Deploy complete."
Write-Host "    http://${vpsIp}:8080"
Write-Host ""
