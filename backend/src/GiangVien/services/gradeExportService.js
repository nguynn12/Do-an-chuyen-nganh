import ExcelJS from 'exceljs';

const components = [
  ['chuyen_can', 'Chuyên cần'], ['giua_ky', 'Giữa kỳ'], ['cuoi_ky', 'Cuối kỳ'],
];
const patterns = { K45:'sv21%', K46:'sv22%', K47:'sv23%', K48:'sv24%', ALL:'%' };

export async function buildClassGradeWorkbook(db, course, cohort = 'K47') {
  cohort = String(cohort).trim().toUpperCase();
  if (!Object.hasOwn(patterns, cohort)) throw Object.assign(new Error('Khóa sinh viên không hợp lệ.'), {status:400});
  const [students] = await db.query(`SELECT DISTINCT u.User_Key,u.Username,u.Full_Name
    FROM Fact_Enrolment e JOIN Dim_User u ON u.User_Key=e.User_Key
    WHERE e.Course_Key=? AND LOWER(e.Status)='active' AND LOWER(u.Primary_Role)='student'
      AND u.Is_Active=1 AND u.Username LIKE ? ORDER BY u.Full_Name,u.User_Key`, [course.Course_Key,patterns[cohort]]);
  if (!students.length) throw Object.assign(new Error('Không có sinh viên trong khóa đã chọn để xuất bảng điểm.'), {status:404});
  const [weights] = await db.query(`SELECT Component_Name,Overall_Weight FROM dim_teacher_grade_component
    WHERE Course_Key=? AND Is_Active=1 ORDER BY Display_Order,Component_Key`, [course.Course_Key]);
  const [confirmations] = await db.query(`SELECT User_Key,Group_Code,Score,Is_Confirmed,Updated_At
    FROM web_grade_confirmation WHERE Course_Key=?`, [course.Course_Key]);
  const configured = components.map(([,name]) => weights.filter(row=>row.Component_Name===name));
  const validWeights = configured.every(rows=>rows.length===1) && Math.abs(configured.reduce((sum,rows)=>sum+Number(rows[0]?.Overall_Weight || 0),0)-100)<0.001;
  const byUser = new Map();
  for (const row of confirmations) {
    if (!byUser.has(row.User_Key)) byUser.set(row.User_Key, new Map());
    byUser.get(row.User_Key).set(row.Group_Code,row);
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DLU LMS'; workbook.created = new Date();
  const sheet = workbook.addWorksheet('Bang diem', {views:[{state:'frozen',ySplit:4}]});
  sheet.columns = [{width:7},{width:19},{width:30},{width:20},{width:20},{width:20},{width:19},{width:29},{width:25}];
  sheet.mergeCells('A1:I1'); sheet.getCell('A1').value = `BẢNG ĐIỂM ${course.Course_Code || ''} — ${course.Course_Name || ''}`;
  sheet.getCell('A1').font = {bold:true,size:16,color:{argb:'FF17634A'}}; sheet.getRow(1).height=28;
  sheet.mergeCells('A2:I2'); sheet.getCell('A2').value = `Khóa: ${cohort} · ${students.length} sinh viên · Điểm thang 10 · Xuất lúc ${new Date().toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})}`;
  sheet.mergeCells('A3:I3'); sheet.getCell('A3').value = 'Chỉ xuất điểm đã xác nhận lưu trên máy chủ. Ô trống là chưa xác nhận; file này chưa gửi lên LMS.';
  sheet.getCell('A3').font = {italic:true,color:{argb:'FF64748B'}};
  const headers = ['STT','MSSV','Họ và tên',...components.map(([,name],index)=>`${name}${configured[index].length===1 ? ` (${Number(configured[index][0].Overall_Weight)}%)` : ''}`),'Điểm tổng kết','Trạng thái','Cập nhật tổng kết'];
  sheet.addRow(headers);
  sheet.getRow(4).height=30;
  sheet.getRow(4).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17634A'}};cell.alignment={vertical:'middle',wrapText:true};});
  let finalized=0;
  students.forEach((student,index)=>{
    const saved = byUser.get(student.User_Key) || new Map();
    const scores = components.map(([code])=>{
      const row=saved.get(code); const score=row?.Score == null ? NaN : Number(row.Score);
      return row?.Is_Confirmed && Number.isFinite(score) && score>=0 && score<=10 ? score : null;
    });
    const final=saved.get('final');
    const calculated=validWeights && scores.every(score=>score!==null) ? Math.round(scores.reduce((sum,score,i)=>sum+score*Number(configured[i][0].Overall_Weight)/100,0)*100)/100 : null;
    const confirmed=!!final?.Is_Confirmed && calculated!==null && Number.isFinite(Number(final.Score)) && Math.abs(Number(final.Score)-calculated)<0.005;
    if (confirmed) finalized++;
    const row=sheet.addRow([index+1,student.Username,student.Full_Name,...scores,
      confirmed ? Number(final.Score) : null, confirmed ? 'Đã chốt tổng kết' : 'Chưa chốt tổng kết',
      confirmed ? new Date(final.Updated_At).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}) : null]);
    for(let column=4;column<=7;column++)row.getCell(column).numFmt='0.00';
    row.height=23;
    if(index%2===0)row.eachCell({includeEmpty:true},cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F9F4'}};});
  });
  sheet.autoFilter={from:{row:4,column:1},to:{row:4,column:9}};
  sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:4'};
  const notes=workbook.addWorksheet('Huong dan'); notes.columns=[{width:110}];
  for(const text of [`Đã chốt: ${finalized}/${students.length} sinh viên.`,
    'Bảng điểm xuất toàn bộ sinh viên đang học trong khóa đã chọn, không phụ thuộc ô tìm kiếm trên giao diện.',
    'Điểm chưa xác nhận hoặc thay đổi chưa lưu sẽ không được đưa vào file. Ô trống không có nghĩa là điểm 0.',
    'Điểm tổng kết chỉ xuất khi ba nhóm đã xác nhận, tổng trọng số bằng 100% và điểm tổng kết đã lưu khớp phép tính.',
    'File này phục vụ kiểm tra/lưu trữ. Chưa phải xác nhận đã gửi điểm lên LMS; định dạng nhập LMS phải theo cấu hình của trường.']) notes.addRow([text]);
  return {workbook,cohort,studentCount:students.length,finalized};
}
