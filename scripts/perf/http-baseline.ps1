param(
  [string]$BackendUrl = "http://localhost:8080",
  [int]$Rounds = 10
)

$targets = @(
  "$BackendUrl/api/public/home-overview",
  "$BackendUrl/api/posts?page=1&limit=10"
)

foreach ($target in $targets) {
  $times = @()
  for ($i = 0; $i -lt $Rounds; $i++) {
    $duration = Measure-Command {
      Invoke-WebRequest -Uri $target -UseBasicParsing -TimeoutSec 15 | Out-Null
    }
    $times += [math]::Round($duration.TotalMilliseconds, 2)
  }

  [pscustomobject]@{
    Url = $target
    Rounds = $Rounds
    MinMs = ($times | Measure-Object -Minimum).Minimum
    MaxMs = ($times | Measure-Object -Maximum).Maximum
    AvgMs = [math]::Round(($times | Measure-Object -Average).Average, 2)
  }
}
