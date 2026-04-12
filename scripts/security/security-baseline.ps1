param(
  [string]$BackendUrl = "http://localhost:8080"
)

$cases = @(
  @{ Name = "unauthorized-admin"; Url = "$BackendUrl/api/admin/stats"; Headers = @{}; Expected = @(401, 403) },
  @{ Name = "invalid-jwt"; Url = "$BackendUrl/api/messages/unread-count"; Headers = @{ Authorization = "Bearer invalid-token" }; Expected = @(401, 403) }
)

$results = foreach ($case in $cases) {
  try {
    $response = Invoke-WebRequest -Uri $case.Url -UseBasicParsing -Headers $case.Headers -TimeoutSec 15
    $actual = $response.StatusCode
  } catch {
    $actual = $_.Exception.Response.StatusCode.value__
  }

  [pscustomobject]@{
    Name = $case.Name
    Expected = ($case.Expected -join "/")
    Actual = $actual
    Passed = ($case.Expected -contains $actual)
  }
}

$results | Format-Table -AutoSize
if ($results.Passed -contains $false) {
  exit 1
}
