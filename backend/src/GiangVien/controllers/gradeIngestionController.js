import pool from '../../config/database.js';
import ExcelJS from 'exceljs';
import {Readable} from 'node:stream';
import {createHash,randomInt} from 'node:crypto';
import {GROUP_NAMES,gradeError,decodeSnapshot,roundGrade,syncLmsGrades,bumpGradeRevision,gradeRevision} from '../services/gradeIngestionService.js';

const sourceId=()=>-randomInt(1,281474976710655);
const respondError=(res,e)=>{console.error('[Grade ingestion]',e.message);res.status(e.status||500).json({success:false,message:e.status?e.message:'Không xử lý được nguồn điểm. Vui lòng thử lại.'});};
async function targetItem(db,course,itemKey) {
  if(!Number.isSafeInteger(itemKey) || itemKey<=0) throw gradeError('Mã đầu điểm không hợp lệ.');
  const [rows]=await db.query(`SELECT i.*,c.Component_Name FROM dim_teacher_grade_item i JOIN dim_teacher_grade_component c ON c.Component_Key=i.Component_Key WHERE i.Course_Key=? AND i.Item_Key=? AND i.Is_Active=1 AND c.Is_Active=1`,[course,itemKey]);
  const item=rows[0];
  const groupKey=Object.keys(GROUP_NAMES).find(k=>GROUP_NAMES[k]===item?.Component_Name);
  if(!item || !groupKey) throw gradeError('Đầu điểm không thuộc môn/nhóm đang chọn.',403);
  return {...item,groupKey};
}

export async function getLmsGradeItems(req,res) {
  try {
    const [items]=await pool.query(`SELECT gi.id AS id,gi.itemname AS name,gi.itemmodule AS module,gi.grademax AS maxScore,COUNT(CASE WHEN gg.finalgrade IS NOT NULL THEN 1 END) AS gradedCount
      FROM lms_moodle_source.mdl_grade_items gi LEFT JOIN lms_moodle_source.mdl_grade_grades gg ON gg.itemid=gi.id
      WHERE gi.courseid=? AND gi.itemtype IN ('mod','manual') AND gi.grademax>0 GROUP BY gi.id,gi.itemname,gi.itemmodule,gi.grademax ORDER BY gi.itemname,gi.id`,[req.course.Moodle_Course_ID]);
    res.json({success:true,items,...await gradeRevision(pool,req.course.Course_Key)});
  } catch(e) {respondError(res,e);}
}
export async function syncCourseLmsGrades(req,res) {
  try {res.json({success:true,...await syncLmsGrades(req.course)});} catch(e) {respondError(res,e);}
}

export async function createIngestItem(req,res) {
  const db=await pool.getConnection();
  try {
    const {groupKey,name}=req.body,course=req.course.Course_Key;
    if(!Object.hasOwn(GROUP_NAMES,groupKey) || typeof name!=='string' || !name.trim() || name.length>255) throw gradeError('Chọn nhóm và nhập tên đầu điểm (tối đa 255 ký tự).');
    await db.beginTransaction();await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course]);
    const [components]=await db.query('SELECT Component_Key FROM dim_teacher_grade_component WHERE Course_Key=? AND Component_Name=? AND Is_Active=1 LIMIT 1',[course,GROUP_NAMES[groupKey]]);
    let component=components[0]?.Component_Key;
    if(!component) {
      const [created]=await db.query('INSERT INTO dim_teacher_grade_component (Source_Component_ID,Course_Key,Component_Name,Overall_Weight,Display_Order) VALUES (?,?,?,?,?)',[sourceId(),course,GROUP_NAMES[groupKey],({chuyen_can:10,giua_ky:40,cuoi_ky:50})[groupKey],Object.keys(GROUP_NAMES).indexOf(groupKey)+1]);component=created.insertId;
    }
    const [created]=await db.query("INSERT INTO dim_teacher_grade_item (Source_Item_ID,Component_Key,Course_Key,Item_Name,Source_Type,Internal_Weight,Max_Score,Display_Order) VALUES (?,?,?,?,'EXTERNAL',0,10,999)",[sourceId(),component,course,name.trim()]);
    await db.query("UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND Group_Code IN (?,'final')",[course,groupKey]);
    await bumpGradeRevision(db,course);await db.commit();res.status(201).json({success:true,itemKey:created.insertId});
  } catch(e) {await db.rollback();respondError(res,e);} finally {db.release();}
}

export async function linkLmsGradeItem(req,res) {
  const db=await pool.getConnection();
  try {
    const course=req.course.Course_Key,lmsItem=Number(req.body.lmsItemId),key=Number(req.params.itemKey);
    if(!Number.isSafeInteger(lmsItem) || lmsItem<=0 || !Number.isSafeInteger(key) || key<=0) throw gradeError('Mã đầu điểm không hợp lệ.');
    await db.beginTransaction();
    await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course]);
    const item=await targetItem(db,course,key);
    const [source]=await db.query("SELECT id,grademax FROM lms_moodle_source.mdl_grade_items WHERE id=? AND courseid=? AND itemtype IN ('mod','manual') AND grademax>0",[lmsItem,req.course.Moodle_Course_ID]);
    if(!source.length) throw gradeError('Bài kiểm tra LMS không thuộc môn này.',403);
    await db.query("UPDATE dim_teacher_grade_item SET Source_Type='LMS_GRADE',LMS_Grade_Item_ID=?,Max_Score=? WHERE Item_Key=?",[lmsItem,source[0].grademax,key]);
    // Linking is an explicit class-wide decision to use this source for this item.
    const [snapshots]=await db.query('SELECT User_Key,Snapshot FROM web_grade_confirmation WHERE Course_Key=? AND Group_Code=? FOR UPDATE',[course,item.groupKey]);
    const id=`item_${key}`;
    for(const row of snapshots) {
      const snapshot=decodeSnapshot(row.Snapshot);delete snapshot.scores?.[id];
      snapshot.manualItemIds=(snapshot.manualItemIds||[]).filter(k=>k!==id);
      snapshot.origins={...snapshot.origins,[id]:'LMS'};
      await db.query('UPDATE web_grade_confirmation SET Snapshot=?,Is_Confirmed=0 WHERE Course_Key=? AND User_Key=? AND Group_Code=?',[JSON.stringify(snapshot),course,row.User_Key,item.groupKey]);
    }
    await db.query("UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND Group_Code='final'",[course]);
    const result=await syncLmsGrades(req.course,{connection:db});
    await bumpGradeRevision(db,course);
    const state=await gradeRevision(db,course);
    await db.commit();res.json({success:true,...result,...state});
  } catch(e) {await db.rollback();respondError(res,e);} finally {db.release();}
}

const normalizeHeader=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('đ','d').replaceAll('Đ','D').replace(/[^a-z0-9]/gi,'').toLowerCase();
function cellValue(cell) {
  if(cell.value && typeof cell.value==='object' && ('formula' in cell.value || 'sharedFormula' in cell.value)) throw gradeError('Không nhận ô công thức Excel; hãy dán giá trị điểm trước khi nhập.');
  return cell.text?.trim() || '';
}
function numeric(text) {
  if(!/^\d+(?:[.,]\d+)?$/.test(String(text).trim())) return NaN;
  return Number(String(text).trim().replace(',','.'));
}
export async function parseGradeImport(buffer,filename,students) {
  if(!buffer?.length || buffer.length>2*1024*1024) throw gradeError('File phải có dữ liệu và không vượt quá 2MB.');
  const workbook=new ExcelJS.Workbook();
  if(/\.xlsx$/i.test(filename)) await workbook.xlsx.load(buffer);
  else if(/\.csv$/i.test(filename)) {
    const header=buffer.toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/)[0];
    const delimiter=header.includes(';')?';':header.includes('\t')?'\t':',';
    await workbook.csv.read(Readable.from([buffer]),{map:value=>value,parserOptions:{delimiter}});
  } else throw gradeError('Chỉ hỗ trợ file .xlsx hoặc .csv.');
  const sheet=workbook.getWorksheet('Diem') || workbook.worksheets[0];
  if(!sheet || sheet.rowCount>1001) throw gradeError('File tối đa 1.000 dòng điểm, dùng sheet Diem.');
  const headers=new Map();sheet.getRow(1).eachCell((cell,col)=>{const name=normalizeHeader(cellValue(cell));if(headers.has(name))throw gradeError('Tiêu đề cột bị trùng.');headers.set(name,col);});
  const userCol=headers.get('mssv') || headers.get('username') || headers.get('masinhvien');
  const scoreCol=headers.get('diem') || headers.get('score');
  const maxCol=headers.get('diemtoida') || headers.get('maxscore');
  if(!userCol || !scoreCol) throw gradeError('File phải có cột MSSV và Diem; DiemToiDa là tùy chọn (mặc định 10).');
  const roster=new Map(students.map(s=>[String(s.Username).trim().toLowerCase(),s]));
  const rows=[],errors=[],seen=new Set();let skipped=0;
  for(let index=2;index<=sheet.rowCount;index++) {
    try {
      const row=sheet.getRow(index),username=cellValue(row.getCell(userCol)),raw=cellValue(row.getCell(scoreCol));
      if(!raw){skipped++;continue;}
      const score=numeric(raw),max=maxCol?numeric(cellValue(row.getCell(maxCol)) || '10'):10;
      const student=roster.get(username.toLowerCase());
      if(!student) throw gradeError('MSSV không thuộc danh sách ghi danh đang hoạt động của môn.');
      if(seen.has(student.User_Key)) throw gradeError('MSSV bị trùng trong file.');
      seen.add(student.User_Key);
      if(!Number.isFinite(score) || !Number.isFinite(max) || max<=0 || score<0 || score>max) throw gradeError('Điểm phải từ 0 đến điểm tối đa; điểm tối đa phải lớn hơn 0.');
      rows.push({row:index,userKey:student.User_Key,username:student.Username,name:student.Full_Name,score,maxScore:max,score10:roundGrade(score*10/max)});
    } catch(e) {errors.push({row:index,message:e.message});}
  }
  if(!rows.length && !errors.length) errors.push({row:0,message:'Chưa có dòng điểm để nhập.'});
  return {rows,errors,skipped};
}

async function roster(db,course) {
  const [students]=await db.query(`SELECT DISTINCT u.User_Key,u.Username,u.Full_Name FROM Dim_User u JOIN Fact_Enrolment e ON e.User_Key=u.User_Key WHERE e.Course_Key=? AND LOWER(e.Status)='active' ORDER BY u.Username`,[course]);return students;
}
export async function downloadGradeTemplate(req,res) {
  try {
    await targetItem(pool,req.course.Course_Key,Number(req.params.itemKey));
    const students=await roster(pool,req.course.Course_Key);
    const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Diem');
    sheet.columns=[{header:'MSSV',key:'username',width:20},{header:'HoTen',key:'name',width:30},{header:'Diem',key:'score',width:14},{header:'DiemToiDa',key:'max',width:16}];
    students.forEach(s=>sheet.addRow({username:String(s.Username),name:s.Full_Name,score:null,max:10}));
    sheet.getColumn(1).numFmt='@';sheet.getColumn(3).numFmt='0.00';sheet.views=[{state:'frozen',ySplit:1}];
    sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF006B47'}};
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="mau_nhap_diem.xlsx"');
    res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
  } catch(e) {respondError(res,e);}
}

export async function importGradeFile(req,res) {
  let db;
  try {
    const course=req.course.Course_Key,key=Number(req.params.itemKey),mode=req.body.mode;
    if(!['preview','commit'].includes(mode) || !req.file) throw gradeError('Chọn file và chế độ nhập hợp lệ.');
    const item=await targetItem(pool,course,key);
    const digest=createHash('sha256').update(req.file.buffer).digest('hex');
    const preview=await parseGradeImport(req.file.buffer,req.file.originalname,await roster(pool,course));
    if(mode==='preview') return res.json({success:true,...preview,digest,itemName:item.Item_Name});
    if(req.body.digest!==digest) throw gradeError('File đã thay đổi sau khi xem trước. Vui lòng xem trước lại.',409);
    if(preview.errors.length) throw gradeError('File còn lỗi; chưa ghi bất kỳ dòng điểm nào.',422);
    db=await pool.getConnection();await db.beginTransaction();
    await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course]);
    const current=await targetItem(db,course,key);
    if(current.Component_Key!==item.Component_Key || current.Source_Type!==item.Source_Type) throw gradeError('Đầu điểm đã thay đổi. Vui lòng xem trước lại.',409);
    // Revalidate enrollment inside the write transaction.
    const active=new Set((await roster(db,course)).map(s=>s.User_Key));
    for(const row of preview.rows) {
      if(!active.has(row.userKey)) throw gradeError('Ghi danh đã thay đổi; vui lòng xem trước lại.',409);
      const max=Number(current.Max_Score)||10;
      await db.query(`INSERT INTO fact_teacher_grade_score (Source_Score_ID,Item_Key,User_Key,Course_Key,Score,Max_Score) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE Score=VALUES(Score),Max_Score=VALUES(Max_Score)`,[sourceId(),key,row.userKey,course,row.score10*max/10,max]);
      const [saved]=await db.query('SELECT Snapshot,Score FROM web_grade_confirmation WHERE Course_Key=? AND User_Key=? AND Group_Code=? FOR UPDATE',[course,row.userKey,current.groupKey]);
      const previous=decodeSnapshot(saved[0]?.Snapshot),id=`item_${key}`;
      const snapshot={...previous,scores:{...previous.scores,[id]:row.score10},manualItemIds:[...new Set([...(previous.manualItemIds||[]),id])],origins:{...previous.origins,[id]:'EXCEL'}};
      await db.query(`INSERT INTO web_grade_confirmation (Course_Key,User_Key,Group_Code,Score,Is_Confirmed,Snapshot,Updated_By) VALUES (?,?,?,?,0,?,?) ON DUPLICATE KEY UPDATE Snapshot=VALUES(Snapshot),Is_Confirmed=0,Updated_By=VALUES(Updated_By),Updated_At=CURRENT_TIMESTAMP`,[course,row.userKey,current.groupKey,Number(saved[0]?.Score)||0,JSON.stringify(snapshot),req.teacher.userKey]);
      await db.query("UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND User_Key=? AND Group_Code='final'",[course,row.userKey]);
    }
    await db.query('INSERT INTO web_grade_import_log (Course_Key,Item_Key,Teacher_Key,File_Name,File_SHA256,Row_Count) VALUES (?,?,?,?,?,?)',[course,key,req.teacher.userKey,req.file.originalname.replace(/[\x00-\x1f]/g,'').slice(0,255),digest,preview.rows.length]);
    await bumpGradeRevision(db,course);const state=await gradeRevision(db,course);
    await db.commit();res.json({success:true,imported:preview.rows.length,skipped:preview.skipped,...state});
  } catch(e) {if(db)await db.rollback();respondError(res,e);} finally {db?.release();}
}
