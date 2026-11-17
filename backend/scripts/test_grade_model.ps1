$ErrorActionPreference='Stop'
Add-Type -Path 'B:\DoAnChuyenNghanh\tmp-run\pbi-sdk\Microsoft.PowerBI.AdomdClient.dll'
$taskConn=New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection('Data Source=localhost:55264')
$taskConn.Open()
foreach($taskPoint in @(6,6.5)) {
 $taskCmd=$taskConn.CreateCommand()
 $taskCmd.CommandText=@"
EVALUATE CALCULATETABLE(ROW("CC",[Điểm chuyên cần dự kiến động],"ContribCC",[Điểm Chuyên cần sau điều chỉnh],"Final",[Điểm tổng kết dự kiến]),TREATAS({11},'lms_datawarehouse dim_course'[Course_Key]),TREATAS({"sv2310012"},'lms_datawarehouse dim_user'[Username]),TREATAS({13},'Đầu điểm điều chỉnh động'[Item_Key]),TREATAS({$taskPoint},'Điểm điều chỉnh'[Điểm điều chỉnh]),TREATAS({20},'TL điều chỉnh'[TL điều chỉnh]))
"@
 $taskReader=$taskCmd.ExecuteReader()
 while($taskReader.Read()){Write-Output ("Point=$taskPoint; CC="+$taskReader.GetValue(0)+"; ContributionCC="+$taskReader.GetValue(1)+"; Final="+$taskReader.GetValue(2))}
 $taskReader.Close()
}
$taskConn.Close()
