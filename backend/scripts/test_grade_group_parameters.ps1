$ErrorActionPreference='Stop'
Add-Type -Path 'B:\DoAnChuyenNghanh\tmp-run\pbi-sdk\Microsoft.PowerBI.AdomdClient.dll'
$taskConn=New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection('Data Source=localhost:55264');$taskConn.Open()
$taskCmd=$taskConn.CreateCommand()
$taskCmd.CommandText="EVALUATE CALCULATETABLE(ROW(""GK"",[Điểm Giữa kỳ Value],""CK"",[Điểm Cuối kỳ Value]),TREATAS({5.6},'Điểm Giữa kỳ'[Điểm Giữa kỳ]),TREATAS({3.6},'Điểm Cuối kỳ'[Điểm Cuối kỳ]))"
$taskReader=$taskCmd.ExecuteReader();while($taskReader.Read()){Write-Output ("GK="+$taskReader.GetValue(0)+" CK="+$taskReader.GetValue(1))};$taskReader.Close();$taskConn.Close()
