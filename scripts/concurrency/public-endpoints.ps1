param(
  [string]$BackendUrl = "http://localhost:8080",
  [int]$Concurrency = 20
)

$jobs = @()
for ($i = 0; $i -lt $Concurrency; $i++) {
  $jobs += Start-Job -ScriptBlock {
    param($Url)
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15
      [pscustomobject]@{ Status = $response.StatusCode; Success = $true }
    } catch {
      [pscustomobject]@{ Status = $_.Exception.Response.StatusCode.value__; Success = $false }
    }
  } -ArgumentList "$BackendUrl/api/public/home-overview"
}

$results = $jobs | Receive-Job -Wait -AutoRemoveJob
$results | Group-Object Status | Select-Object Name, Count | Format-Table -AutoSize
if (($results | Where-Object { -not $_.Success }).Count -gt 0) {
  exit 1
}
