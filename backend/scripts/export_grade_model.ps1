$ErrorActionPreference='Stop'
Add-Type -Path 'B:\DoAnChuyenNghanh\tmp-run\pbi-sdk\Microsoft.AnalysisServices.Server.Tabular.dll'
$taskServer=New-Object Microsoft.AnalysisServices.Tabular.Server
$taskServer.Connect('localhost:55264')
$taskFolder='B:\DoAnChuyenNghanh\powerbi\grade_web_sync\LMS_Analytics.SemanticModel\definition'
New-Item -ItemType Directory -Path $taskFolder -Force | Out-Null
[Microsoft.AnalysisServices.Tabular.TmdlSerializer]::SerializeModelToFolder($taskServer.Databases[0].Model,$taskFolder)
$taskServer.Disconnect()
Write-Output 'Updated semantic model exported to TMDL.'
