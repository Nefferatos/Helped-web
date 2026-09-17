<#
.SYNOPSIS
  Rewrites the Helped-web git history to scrub leaked secret values.

.DESCRIPTION
  Steps:
    1. verifies the repo state and that git-filter-repo is available
    2. writes a full backup bundle
    3. rewrites every commit, replacing each leaked value with ***REMOVED***
    4. re-adds the origin remote (git-filter-repo drops remotes)
    5. optionally force-pushes and garbage-collects

  The secret values are NEVER stored in this repo: they are passed in a plain-text
  file that lives OUTSIDE the working tree (one secret per line). That file, and
  the temporary git-filter-repo expressions file, are deleted at the end.

  IMPORTANT: rotate every leaked credential FIRST. Purging history does not
  un-publish a value that bots already harvested.

  NOTE: this file is intentionally ASCII-only so Windows PowerShell 5.1 parses it
  correctly regardless of the console code page.

.EXAMPLE
  # dry run - shows the plan, changes nothing
  powershell -File scripts/purge-secret-history.ps1 -SecretsFile C:\temp\helped-secrets.txt

.EXAMPLE
  # actually rewrite history, then force-push
  powershell -File scripts/purge-secret-history.ps1 -SecretsFile C:\temp\helped-secrets.txt -Execute -Push
#>
[CmdletBinding()]
param(
  [string]$SecretsFile = "$env:TEMP\helped-secrets.txt",
  [string]$BackupDir   = "",
  [string]$Remote      = "origin",
  [string]$Branch      = "main",
  [switch]$Execute,
  [switch]$Push
)

$ErrorActionPreference = "Stop"

function Fail($message) { Write-Host "[FAIL] $message" -ForegroundColor Red; exit 1 }
function Step($message) { Write-Host "`n== $message" -ForegroundColor Cyan }
function Warn($message) { Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Ok($message)   { Write-Host "[ OK ] $message" -ForegroundColor Green }

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { Fail "Not inside a git repository." }
$repoRoot = $repoRoot.Trim()
Set-Location $repoRoot
if (-not $BackupDir) { $BackupDir = Join-Path (Split-Path $repoRoot -Parent) "helped-web-backup" }

Step "Pre-flight checks"

if (-not (Test-Path $SecretsFile)) {
  Write-Host ""
  Write-Host "Create the secrets file first - one leaked value per line, for example:" -ForegroundColor Yellow
  Write-Host "  $SecretsFile"
  Write-Host ""
  Write-Host "  (the full service_role JWT you are rotating)"
  Write-Host "  (the full Anthropic key - starts with sk-ant-api03-)"
  Write-Host "  (the Cline / OpenAI-compatible key - starts with sk_)"
  Write-Host "  (the older Cline key - starts with sk_)"
  Write-Host "  (one line per Make webhook URL, https://hook.eu1.make.com/xxxxxxxx)"
  Write-Host ""
  Write-Host "Keep that file OUTSIDE the repo. Re-run when it exists." -ForegroundColor Yellow
  exit 1
}

$secrets = Get-Content $SecretsFile | ForEach-Object { $_.Trim() } |
  Where-Object { $_ -and -not $_.StartsWith("#") } | Select-Object -Unique

if ($secrets.Count -eq 0) { Fail "No secrets found in $SecretsFile" }

$secretsFull = (Resolve-Path $SecretsFile).Path
if ($secretsFull.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Fail "Refusing to continue: the secrets file must live OUTSIDE the repo ($repoRoot)."
}

$dirty = (git status --porcelain)
if ($dirty) {
  if ($Execute) {
    Fail "Working tree is not clean. Commit or stash your changes first (they are part of the rewrite)."
  }
  Warn "Working tree has uncommitted changes - fine for a dry run, but commit them before -Execute."
}

$filterRepo = Get-Command git-filter-repo -ErrorAction SilentlyContinue
if (-not $filterRepo) {
  Warn "git-filter-repo was not found on PATH."
  Write-Host "   Install it with one of:" -ForegroundColor Yellow
  Write-Host "     pip install git-filter-repo"
  Write-Host "     winget install --id Python.Python.3    (then: pip install git-filter-repo)"
  Write-Host "     scoop install git-filter-repo"
  if ($Execute) { Fail "git-filter-repo is required for -Execute." }
}

Ok "$($secrets.Count) secret value(s) loaded from $secretsFull"

Step "Plan"
Write-Host "  Repo:        $repoRoot"
Write-Host "  Commits:     $(git rev-list --all --count) (all branches)"
Write-Host "  Replacement: each value above becomes ***REMOVED***"
Write-Host "  Remote:      $Remote   Branch: $Branch"
Write-Host "  Backup dir:  $BackupDir"

if (-not $Execute) {
  Warn "DRY RUN - nothing was changed. Re-run with -Execute (and -Push) to apply."
  exit 0
}
Step "Backing up"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundle = Join-Path $BackupDir "helped-web-$stamp.bundle"
git bundle create $bundle --all
if ($LASTEXITCODE -ne 0) { Fail "Backup bundle failed - aborting without changing anything." }
Ok "Backup written: $bundle"
Warn "For extra safety, also run: git clone --mirror (repo url) $BackupDir\mirror.git"

$expressions = Join-Path $env:TEMP "helped-filter-repo-$stamp.txt"
Set-Content -Path $expressions -Encoding UTF8 -Value (
  $secrets | ForEach-Object { "literal:$_==>***REMOVED***" }
)
Ok "Expressions file (outside the repo): $expressions"

Step "Rewriting history"
git filter-repo --replace-text $expressions --force
if ($LASTEXITCODE -ne 0) { Fail "git-filter-repo failed. Restore with: git clone $bundle restored" }
Ok "History rewritten."

Step "Restoring the remote"
if (git remote | Where-Object { $_ -eq $Remote }) {
  Ok "$Remote already present"
} else {
  $url = "https://github.com/Nefferatos/Helped-web.git"
  git remote add $Remote $url
  Ok "Re-added $Remote = $url"
}

Step "Verifying history is clean"
$stillPresent = 0
foreach ($secret in $secrets) {
  $hits = git log --all --oneline -S $secret
  if ($hits) {
    $stillPresent++
    $preview = $secret.Substring(0, [Math]::Min(12, $secret.Length))
    Warn "Still present in history: $preview..."
  }
}
if ($stillPresent -eq 0) {
  Ok "No leaked value found anywhere in history."
} else {
  Warn "$stillPresent value(s) still present - check tags and other branches."
}

if ($Push) {
  Step "Force-pushing (rewrites the published history)"
  git push --force $Remote "refs/heads/${Branch}:refs/heads/${Branch}"
  if ($LASTEXITCODE -ne 0) { Fail "Push failed. Local history is already rewritten - push again when ready." }
  git push --force $Remote --tags 2>$null
  Ok "Pushed to $Remote/$Branch"

  Step "Garbage collecting"
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
  Ok "Local reflog cleared and unreachable objects pruned."
  Warn "Everyone with a clone MUST delete it and re-clone - their copy still has the secrets."
  Warn "On GitHub, old commits can stay reachable through cached views; clear them in Settings or ask GitHub Support."
} else {
  Warn "History is rewritten LOCALLY only. Re-run with -Push to publish it."
}

Step "Cleanup"
Remove-Item -Force $expressions -ErrorAction SilentlyContinue
Ok "Deleted the temporary expressions file (it contained the secrets)."
Warn "Delete $secretsFull as soon as the rotation is finished."

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Rotate EVERY credential you listed - Supabase service_role first."
Write-Host "  2. Make sure the repo is private and push protection is enabled."
Write-Host "  3. Have collaborators re-clone; then re-run: npm run secrets:scan"