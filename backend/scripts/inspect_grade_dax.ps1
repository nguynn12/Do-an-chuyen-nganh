$ErrorActionPreference = "Stop"
$taskBin = Split-Path (Get-Process msmdsrv).Path
Add-Type -Path "B:\DoAnChuyenNghanh\tmp-run\pbi-sdk\Microsoft.PowerBI.AdomdClient.dll"
$taskPort = (Get-Content -LiteralPath 'C:\Users\Maxsys\Microsoft\Power BI Desktop Store App\AnalysisServicesWorkspaces\AnalysisServicesWorkspace_32f5bbf2-52a1-4310-a690-2e0630a5a916\Data\msmdsrv.port.txt' -Raw).Replace([string][char]0,'').Trim()
$taskConn = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection("Data Source=localhost:$taskPort")
$taskConn.Open()
$taskCmd = $taskConn.CreateCommand()
$taskCmd.CommandText = 'SELECT [Name], [Expression] FROM $SYSTEM.TMSCHEMA_MEASURES'
$taskReader=$taskCmd.ExecuteReader()
$taskRows=@()
while ($taskReader.Read()) { $taskRows += [pscustomobject]@{Name=$taskReader.GetValue(0);Expression=$taskReader.GetValue(1)} }
$taskReader.Close()
$taskRows | Where-Object { $_.Name -match 'đầu điểm|Chuyên cần|chuyên cần|sau điều chỉnh|điều chỉnh|Giữa kỳ động|Cuối kỳ động' } | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 'B:\DoAnChuyenNghanh\tmp-run\grade-measures.json'
Write-Output "Read $($taskRows.Count) measures; grade expressions saved."
$taskConn.Close()

