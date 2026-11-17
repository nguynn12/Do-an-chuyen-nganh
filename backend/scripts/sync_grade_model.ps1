$ErrorActionPreference='Stop'
$taskRoot='B:\DoAnChuyenNghanh'
$taskBackup=Join-Path $taskRoot ('backups\grade-sync-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $taskBackup -Force | Out-Null
Copy-Item -LiteralPath "$taskRoot\powerbi\LMS_Analytics.pbix" -Destination "$taskBackup\LMS_Analytics.pbix"
Add-Type -Path "$taskRoot\tmp-run\pbi-sdk\Microsoft.AnalysisServices.Server.Tabular.dll"
$taskServer=New-Object Microsoft.AnalysisServices.Tabular.Server
$taskServer.Connect('localhost:55264')
$taskDatabase=$taskServer.Databases[0]
$taskModel=$taskDatabase.Model
[Microsoft.AnalysisServices.Tabular.JsonSerializer]::SerializeDatabase($taskDatabase) | Set-Content -Encoding utf8 "$taskBackup\model-before.bim"
$taskPatch=Get-Content "$taskRoot\powerbi\grade_web_sync_measures.json" -Raw | ConvertFrom-Json
$taskTable=$taskModel.Tables.Find('Web Grade Override')
if (!$taskTable) {
 $taskTable=New-Object Microsoft.AnalysisServices.Tabular.Table
 $taskTable.Name='Web Grade Override'
 foreach ($taskName in @('Course_Key','User_Key','Item_Key','Score_10')) {
  $taskColumn=New-Object Microsoft.AnalysisServices.Tabular.DataColumn
  $taskColumn.Name=$taskName
  $taskColumn.SourceColumn=$taskName
  $taskColumn.DataType=if($taskName -eq 'Score_10'){[Microsoft.AnalysisServices.Tabular.DataType]::Double}else{[Microsoft.AnalysisServices.Tabular.DataType]::Int64}
  $taskTable.Columns.Add($taskColumn)
 }
 $taskPartition=New-Object Microsoft.AnalysisServices.Tabular.Partition
 $taskPartition.Name='Web Grade Override'
 $taskPartition.Mode=[Microsoft.AnalysisServices.Tabular.ModeType]::Import
 $taskSource=New-Object Microsoft.AnalysisServices.Tabular.MPartitionSource
 $taskSource.Expression='let Source = MySQL.Database("localhost", "lms_datawarehouse", [ReturnSingleDatabase=true]), Saved = Source{[Schema="lms_datawarehouse",Item="web_grade_item_override"]}[Data] in Saved'
 $taskPartition.Source=$taskSource
 $taskTable.Partitions.Add($taskPartition)
 $taskModel.Tables.Add($taskTable)
}
foreach($taskChange in $taskPatch) {
 $taskOwner=$taskModel.Tables.Find($taskChange.Table)
 if(!$taskOwner) {throw "Measure owner table missing"}
 $taskMeasure=$taskOwner.Measures.Find($taskChange.Name)
 if(!$taskMeasure) { $taskMeasure=New-Object Microsoft.AnalysisServices.Tabular.Measure; $taskMeasure.Name=$taskChange.Name; $taskOwner.Measures.Add($taskMeasure) }
 $taskMeasure.Expression=$taskChange.Expression
}
$taskModel.SaveChanges() | Out-Null
foreach($taskName in @('Web Grade Override','lms_datawarehouse dim_teacher_grade_item','lms_datawarehouse dim_teacher_grade_component','lms_datawarehouse fact_teacher_grade_score')) {
 $taskModel.Tables.Find($taskName).RequestRefresh([Microsoft.AnalysisServices.Tabular.RefreshType]::Full)
}
$taskModel.RequestRefresh([Microsoft.AnalysisServices.Tabular.RefreshType]::Calculate)
$taskModel.SaveChanges() | Out-Null
$taskBad=@();foreach($taskT in $taskModel.Tables){foreach($taskM in $taskT.Measures){if($taskM.ErrorMessage){$taskBad+=$taskM.Name}}}
if($taskBad.Count){throw ('Invalid measures: '+($taskBad -join ','))}
Write-Output "Model updated and processed; backup: $taskBackup"
$taskServer.Disconnect()
