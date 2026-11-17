$ErrorActionPreference='Stop'
Add-Type -Path 'B:\DoAnChuyenNghanh\tmp-run\pbi-sdk\Microsoft.AnalysisServices.Server.Tabular.dll'
$taskServer=New-Object Microsoft.AnalysisServices.Tabular.Server
$taskServer.Connect('localhost:55264')
$taskModel=$taskServer.Databases[0].Model
foreach($taskName in @('Điểm điều chỉnh','Điểm Giữa kỳ','Điểm Cuối kỳ','TL điều chỉnh')) {
 $taskT=$taskModel.Tables.Find($taskName)
 $taskMax=if($taskName -eq 'TL điều chỉnh'){100}else{10}
 $taskT.Partitions[0].Source.Expression="GENERATESERIES(CURRENCY(0), CURRENCY($taskMax), CURRENCY(0.01))"
 $taskT.Columns.Find($taskName).DataType=[Microsoft.AnalysisServices.Tabular.DataType]::Decimal
 $taskT.RequestRefresh([Microsoft.AnalysisServices.Tabular.RefreshType]::Full)
}
$taskModel.RequestRefresh([Microsoft.AnalysisServices.Tabular.RefreshType]::Calculate)
$taskModel.SaveChanges() | Out-Null
$taskPatch=Get-Content 'B:\DoAnChuyenNghanh\powerbi\grade_web_sync_measures.json' -Raw | ConvertFrom-Json
foreach($taskChange in $taskPatch) {if($taskModel.Tables.Find($taskChange.Table).Measures.Find($taskChange.Name).ErrorMessage){throw ('Invalid updated measure: '+$taskChange.Name)}}
$taskServer.Disconnect()
Write-Output 'Exact decimal What-if parameters processed; updated measures validated.'
