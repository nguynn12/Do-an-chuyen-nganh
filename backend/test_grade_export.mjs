import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {buildClassGradeWorkbook} from './src/GiangVien/services/gradeExportService.js';

const course={Course_Key:11,Moodle_Course_ID:104,Course_Code:'AI401',Course_Name:'Trí tuệ nhân tạo'};
const students=[{User_Key:1,Username:'sv230001',Full_Name:'Điểm không'},
  {User_Key:2,Username:'sv230002',Full_Name:'Chưa chốt'},
  {User_Key:3,Username:'sv230003',Full_Name:'Điểm tổng kết cũ'},
  {User_Key:4,Username:'sv230004',Full_Name:'=SUM(1,2)'}];
const weights=[{Component_Name:'Chuyên cần',Overall_Weight:15},{Component_Name:'Giữa kỳ',Overall_Weight:70},{Component_Name:'Cuối kỳ',Overall_Weight:15}];
const records=[];
for(const user of [1,3])for(const code of ['chuyen_can','giua_ky','cuoi_ky','final'])records.push({User_Key:user,Group_Code:code,Score:user===1?0:code==='final'?8:6,Is_Confirmed:1,Updated_At:new Date()});
records.push({User_Key:2,Group_Code:'chuyen_can',Score:9,Is_Confirmed:0});
let count=0,queryIndex=0;
const db={async query(sql,args){assert.match(sql.trim(),/^SELECT/);count++;
  if(queryIndex++===0){assert.equal(args[0],11);assert.equal(args[1],'sv23%');return [students];}
  return [sql.includes('dim_teacher_grade_component')?weights:records];}};
const {workbook,studentCount,finalized}=await buildClassGradeWorkbook(db,course,'K47');
assert.equal(studentCount,4);assert.equal(finalized,1);
const bytes=await workbook.xlsx.writeBuffer();
const loaded=new ExcelJS.Workbook();await loaded.xlsx.load(bytes);
const sheet=loaded.getWorksheet('Bang diem');
assert.equal(sheet.getCell('D4').value,'Chuyên cần (15%)');
assert.equal(sheet.getCell('E4').value,'Giữa kỳ (70%)');
assert.equal(sheet.getCell('D5').value,0);assert.equal(sheet.getCell('G5').value,0);
assert.equal(sheet.getCell('G5').numFmt,'0.00');
assert.equal(sheet.getCell('D6').value,null);assert.equal(sheet.getCell('G6').value,null);
assert.equal(sheet.getCell('D7').value,6);assert.equal(sheet.getCell('G7').value,null);
assert.equal(sheet.getCell('C8').type,ExcelJS.ValueType.String);assert.equal(sheet.getCell('C8').value,'=SUM(1,2)');
assert.equal(sheet.views[0].ySplit,4);assert.ok(loaded.getWorksheet('Huong dan'));
assert.equal(count,3);
await assert.rejects(()=>buildClassGradeWorkbook(db,course,'INVALID'),error=>error.status===400);
await assert.rejects(()=>buildClassGradeWorkbook({query:async()=>[[]]},course,'K47'),error=>error.status===404);
console.log('PASS: XLSX round trip; exact weights; numeric zero; unconfirmed/stale finals blank; names are strings, not formulas; selected cohort; read-only queries; invalid/empty cohort.');

if(process.argv.includes('--http')) {
  const base='http://127.0.0.1:3000/api';
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'gv_tranminhb',password:'123456'})});
  assert.equal(login.status,200);const auth=await login.json();
  const path='/courses/104/grades/export?cohort=K47';
  assert.equal((await fetch(base+path)).status,401);
  const headers={Authorization:`Bearer ${auth.token}`};
  const response=await fetch(base+path,{headers});
  assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes('spreadsheetml'));
  assert.match(response.headers.get('content-disposition'),/Bang_diem_AI401_K47\.xlsx/);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const exported=new ExcelJS.Workbook();await exported.xlsx.load(Buffer.from(await response.arrayBuffer()));
  const roster=await (await fetch(base+'/courses/104/students?cohort=K47',{headers})).json();
  assert.equal(exported.getWorksheet('Bang diem').rowCount-4,roster.data.length);
  assert.equal((await fetch(base+'/courses/99999999/grades/export?cohort=K47',{headers})).status,403);
  assert.equal((await fetch(base+'/courses/104/grades/export?cohort=INVALID',{headers})).status,400);
  console.log(`PASS: live Excel endpoint (${roster.data.length} students), attachment headers, auth/ownership/cohort validation; no grades modified.`);
}
