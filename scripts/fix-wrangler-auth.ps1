# Fix Wrangler authentication by removing stale CLOUDFLARE_API_TOKEN
Write-Host "=== Wrangler Auth Fix ===" -ForegroundColor Cyan

# Step 1: Remove from current session
if (Test-Path Env:CLOUDFLARE_API_TOKEN) {
    Remove-Item Env:CLOUDFLARE_API_TOKEN
    Write-Host "[1] Removed CLOUDFLARE_API_TOKEN from current session" -ForegroundColor Green
} else {
    Write-Host "[1] CLOUDFLARE_API_TOKEN not in current session (already clean)" -ForegroundColor Yellow
}

# Step 2: Remove from User environment variables (permanent)
$userVal = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "User")
if ($userVal) {
    [Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $null, "User")
    Write-Host "[2] Removed CLOUDFLARE_API_TOKEN from User environment variables" -ForegroundColor Green
} else {
    Write-Host "[2] CLOUDFLARE_API_TOKEN not in User vars (already clean)" -ForegroundColor Yellow
}

# Step 3: Remove from System environment variables (permanent, requires admin)
$sysVal = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "Machine")
if ($sysVal) {
    try {
        [Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $null, "Machine")
        Write-Host "[3] Removed CLOUDFLARE_API_TOKEN from System environment variables" -ForegroundColor Green
    } catch {
        Write-Host "[3] Could not remove from System vars (need admin). Run as Administrator." -ForegroundColor Red
    }
} else {
    Write-Host "[3] CLOUDFLARE_API_TOKEN not in System vars (already clean)" -ForegroundColor Yellow
}

# Step 4: Verify removal
Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
$remaining = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "User")
$remainingSys = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "Machine")
$remainingSession = if (Test-Path Env:CLOUDFLARE_API_TOKEN) { "STILL SET" } else { "CLEAN" }

Write-Host "  Current session: $remainingSession"
Write-Host ("  User vars:       " + ($(if ($remaining) { "STILL SET" } else { "CLEAN" })))
Write-Host ("  System vars:     " + ($(if ($remainingSys) { "STILL SET" } else { "CLEAN" })))

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Cyan
Write-Host "Now run: npx wrangler whoami"