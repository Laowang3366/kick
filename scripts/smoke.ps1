param(
  [string]$FrontendUrl = "http://localhost:5173",
  [string]$BackendUrl = "http://localhost:8080"
)

$checks = @(
  @{ Name = "frontend"; Url = $FrontendUrl },
  @{ Name = "home-overview"; Url = "$BackendUrl/api/public/home-overview" }
)

$results = foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 15
    [pscustomobject]@{
      Name = $check.Name
      Url = $check.Url
      Status = $response.StatusCode
      Success = $true
    }
  } catch {
    [pscustomobject]@{
      Name = $check.Name
      Url = $check.Url
      Status = "-"
      Success = $false
    }
  }
}

$results | Format-Table -AutoSize
if ($results.Success -contains $false) {
  exit 1
}
