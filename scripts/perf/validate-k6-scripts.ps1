Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$k6Scripts = Get-ChildItem -Path $scriptDir -Filter "k6-*.js" | Sort-Object Name

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required for syntax validation. Install Node or run k6 inspect manually."
}

foreach ($script in $k6Scripts) {
    Push-Location $repoRoot
    try {
        node --check $script.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "node --check failed for $($script.FullName)"
        }
    } finally {
        Pop-Location
    }

    $content = Get-Content -Path $script.FullName -Raw
    if ($content -match 'K6_PASSWORD\s*\|\|\s*"[^"]+"' -or $content -match "K6_PASSWORD\s*\|\|\s*'[^']+'") {
        throw "Hardcoded K6_PASSWORD fallback found in $($script.Name)"
    }
    if ($content -match 'K6_USERNAME\s*\|\|\s*"admin"' -or $content -match "K6_USERNAME\s*\|\|\s*'admin'") {
        throw "Hardcoded admin K6_USERNAME fallback found in $($script.Name)"
    }
}

Write-Host "Validated $($k6Scripts.Count) k6 script(s)."
