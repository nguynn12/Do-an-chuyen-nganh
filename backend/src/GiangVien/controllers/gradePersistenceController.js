import pool from '../../config/database.js';
import { randomInt, createHash } from 'node:crypto';
import {buildGradeSnapshot,decodeSnapshot} from '../services/gradeIngestionService.js';

const names = { chuyen_can: 'Chuyên cần', giua_ky: 'Giữa kỳ', cuoi_ky: 'Cuối kỳ' };
const sourceId = () => -randomInt(1, 281474976710655);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const number = (v, max) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const close = (n) => Math.abs(n - 100) < 0.001;
const version = (weight, items) => createHash('sha256').update(JSON.stringify([Number(weight), items.map(i=>[Number(i.Item_Key),i.Item_Name,Number(i.Internal_Weight),i.Source_Type,Number(i.LMS_Grade_Item_ID||0),Number(i.Max_Score)])])).digest('hex');

async function enrolled(db, course, user) {
  if (!Number.isSafeInteger(user) || user <= 0) throw fail('Mã sinh viên không hợp lệ.');
  const [rows] = await db.query('SELECT Status FROM Fact_Enrolment WHERE Course_Key=? AND User_Key=? LIMIT 1', [course, user]);
  if (!rows.length || String(rows[0].Status).toLowerCase() !== 'active') throw fail('Sinh viên không có ghi danh đang hoạt động trong môn.', 403);
}

export async function getSavedGrades(req, res) {
  try {
    const course = req.course.Course_Key, user = Number(req.params.studentId);
    await enrolled(pool, course, user);
    const [items] = await pool.query(`SELECT c.Component_Name, c.Overall_Weight, i.* FROM dim_teacher_grade_component c
      JOIN dim_teacher_grade_item i ON i.Component_Key=c.Component_Key
      WHERE c.Course_Key=? AND c.Is_Active=1 AND i.Is_Active=1 ORDER BY c.Display_Order,i.Display_Order,i.Item_Key`, [course]);
    const groups = Object.entries(names).map(([key, name]) => ({ key, name,
      overallWeight: Number(items.find(i => i.Component_Name === name)?.Overall_Weight ?? ({chuyen_can:10,giua_ky:40,cuoi_ky:50})[key]),
      version: items.some(i=>i.Component_Name===name) ? version(items.find(i=>i.Component_Name===name).Overall_Weight, items.filter(i=>i.Component_Name===name)) : null,
      items: items.filter(i => i.Component_Name === name).map(i => ({id:`item_${i.Item_Key}`, itemKey:i.Item_Key,
        name:i.Item_Name, weight:Number(i.Internal_Weight), maxScore:10, sourceType:i.Source_Type, lmsGradeItemId:i.LMS_Grade_Item_ID,
        category:i.Source_Type === 'ATTENDANCE' ? 'Điểm danh' : i.Source_Type === 'EXTERNAL' ? 'Kiểm tra' : 'Bài tập'})) }));
    const [rows] = await pool.query('SELECT * FROM web_grade_confirmation WHERE Course_Key=?', [course]);
    const scores = {}, confirmations = {}, classConfirmations = {}, origins = {};
    for (const row of rows) {
      const snapshot = typeof row.Snapshot === 'string' ? JSON.parse(row.Snapshot) : row.Snapshot;
      const confirmation = {confirmed:!!row.Is_Confirmed, snapshotScore:Number(row.Score), confirmedAt:new Date(row.Updated_At).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})};
      (classConfirmations[row.User_Key] ||= {})[row.Group_Code] = confirmation;
      if (Number(row.User_Key) === user) {
        Object.assign(scores, snapshot.scores || {});
        const metadata=await buildGradeSnapshot(pool,course,user,items.filter(i=>Object.hasOwn(snapshot.scores || {},`item_${i.Item_Key}`)),snapshot.scores || {},snapshot);
        Object.assign(origins, metadata.origins);
        confirmations[row.Group_Code] = confirmation;
      }
    }
    res.json({success:true, groups, scores, origins, confirmations, classConfirmations});
  } catch (e) { res.status(e.status || 500).json({success:false,message:e.status ? e.message : 'Không tải được điểm đã lưu.'}); }
}

export async function saveGradeGroup(req, res) {
  const db = await pool.getConnection();
  try {
    const course=req.course.Course_Key, user=Number(req.params.studentId), code=req.params.groupKey;
    if (!Object.hasOwn(names,code)) throw fail('Nhóm điểm không hợp lệ.');
    const {group, scores} = req.body;
    if (!group || !number(group.overallWeight,100) || !Array.isArray(group.items) || !group.items.length || group.items.length>100 || !scores || typeof scores !== 'object') throw fail('Cấu hình điểm không hợp lệ.');
    const ids = new Set();
    for (const i of group.items) {
      if (typeof i.id!=='string' || ids.has(i.id) || typeof i.name!=='string' || !i.name.trim() || i.name.length>255 || !number(i.weight,100) || !number(scores[i.id],10) || Math.abs(i.weight*100-Math.round(i.weight*100))>0.0001 || Math.abs(scores[i.id]*100-Math.round(scores[i.id]*100))>0.0001) throw fail('Tên, trọng số hoặc điểm đầu điểm không hợp lệ (điểm từ 0 đến 10, tối đa 2 chữ số thập phân).');
      if (/^item_\d+$/.test(i.id) && i.id !== `item_${Number(i.id.slice(5))}`) throw fail('Mã đầu điểm không hợp lệ.');
      ids.add(i.id);
    }
    if (!close(group.items.reduce((s,i)=>s+i.weight,0))) throw fail('Tổng trọng số đầu điểm phải bằng 100%.');
    await db.beginTransaction();
    // Serialize saves for the same course, including class configuration changes.
    await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course]);
    await enrolled(db,course,user);
    const [components]=await db.query('SELECT * FROM dim_teacher_grade_component WHERE Course_Key=? AND Component_Name=? AND Is_Active=1 FOR UPDATE',[course,names[code]]);
    let component=components[0]?.Component_Key;
    if (!component) {
      const [insert]=await db.query('INSERT INTO dim_teacher_grade_component (Source_Component_ID,Course_Key,Component_Name,Overall_Weight,Display_Order) VALUES (?,?,?,?,?)',[sourceId(),course,names[code],group.overallWeight,Object.keys(names).indexOf(code)+1]); component=insert.insertId;
    }
    const [existing]=await db.query('SELECT * FROM dim_teacher_grade_item WHERE Course_Key=? AND Component_Key=? AND Is_Active=1 ORDER BY Display_Order,Item_Key FOR UPDATE',[course,component]);
    const expected=existing.length ? version(components[0].Overall_Weight,existing) : null;
    if ((group.version || null)!==expected) throw fail('Cấu hình lớp đã thay đổi. Tải lại trang rồi kiểm tra trước khi lưu.',409);
    let configChanged=Number(components[0]?.Overall_Weight)!==group.overallWeight || existing.length!==group.items.length;
    const savedItems=[], savedScores={};
    let sum=0;
    for (const [index,i] of group.items.entries()) {
      const numeric=/^item_(\d+)$/.exec(i.id);
      let old=numeric ? existing.find(r=>Number(r.Item_Key)===Number(numeric[1])) : null;
      if (numeric && !old) throw fail('Đầu điểm không thuộc nhóm/môn hiện tại. Tải lại trang trước khi lưu.',409);
      let itemKey=old?.Item_Key;
      if (!old) {
        const [insert]=await db.query(`INSERT INTO dim_teacher_grade_item (Source_Item_ID,Component_Key,Course_Key,Item_Name,Source_Type,Internal_Weight,Max_Score,Display_Order) VALUES (?,?,?,?,'EXTERNAL',?,10,?)`,[sourceId(),component,course,i.name.trim(),i.weight,index+1]); itemKey=insert.insertId; configChanged=true;
      } else {
        if (old.Item_Name!==i.name.trim() || Number(old.Internal_Weight)!==i.weight) configChanged=true;
        await db.query('UPDATE dim_teacher_grade_item SET Item_Name=?,Internal_Weight=?,Display_Order=? WHERE Item_Key=?',[i.name.trim(),i.weight,index+1,itemKey]);
      }
      // LMS and attendance source records are never overwritten by simulation edits.
      if (!old || ['EXTERNAL','ASSIGNMENT'].includes(old.Source_Type)) {
        const max=Number(old?.Max_Score || 10);
        await db.query(`INSERT INTO fact_teacher_grade_score (Source_Score_ID,Item_Key,User_Key,Course_Key,Score,Max_Score) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE Score=VALUES(Score),Max_Score=VALUES(Max_Score)`,[sourceId(),itemKey,user,course,scores[i.id]*max/10,max]);
      }
      const id=`item_${itemKey}`;
      savedItems.push({...i,id,itemKey}); savedScores[id]=scores[i.id]; sum+=scores[i.id]*i.weight/100;
    }
    const keep=savedItems.map(i=>i.itemKey);
    for (const old of existing) if (!keep.includes(old.Item_Key)) await db.query('UPDATE dim_teacher_grade_item SET Is_Active=0 WHERE Item_Key=?',[old.Item_Key]);
    await db.query('UPDATE dim_teacher_grade_component SET Overall_Weight=? WHERE Component_Key=?',[group.overallWeight,component]);
    if (configChanged) await db.query('UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND Group_Code IN (?,\'final\')',[course,code]);
    else await db.query("DELETE FROM web_grade_confirmation WHERE Course_Key=? AND User_Key=? AND Group_Code='final'",[course,user]);
    const score=Math.round(sum*100)/100;
    const [prior]=await db.query('SELECT Snapshot FROM web_grade_confirmation WHERE Course_Key=? AND User_Key=? AND Group_Code=?',[course,user,code]);
    const [storedItems]=await db.query('SELECT * FROM dim_teacher_grade_item WHERE Component_Key=? AND Is_Active=1',[component]);
    const snapshot=await buildGradeSnapshot(db,course,user,storedItems,savedScores,decodeSnapshot(prior[0]?.Snapshot));
    await db.query(`INSERT INTO web_grade_confirmation (Course_Key,User_Key,Group_Code,Score,Snapshot,Updated_By) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE Score=VALUES(Score),Is_Confirmed=1,Snapshot=VALUES(Snapshot),Updated_By=VALUES(Updated_By),Updated_At=CURRENT_TIMESTAMP`,[course,user,code,score,JSON.stringify(snapshot),req.teacher.userKey]);
    const [updatedItems]=await db.query('SELECT * FROM dim_teacher_grade_item WHERE Component_Key=? AND Is_Active=1 ORDER BY Display_Order,Item_Key',[component]);
    await db.commit();
    res.json({success:true,group:{...group,version:version(group.overallWeight,updatedItems),items:savedItems},scores:savedScores,score,configChanged});
  } catch(e) { await db.rollback(); console.error('[Save grade]',e.message); res.status(e.status||500).json({success:false,message:e.status?e.message:'Không lưu được điểm. Dữ liệu chưa được ghi, vui lòng thử lại.'}); }
  finally { db.release(); }
}

export async function saveFinalGrade(req,res) {
  const db=await pool.getConnection();
  try {
    const course=req.course.Course_Key,user=Number(req.params.studentId);
    await db.beginTransaction();
    await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course]);
    await enrolled(db,course,user);
    const [rows]=await db.query(`SELECT c.Component_Name,c.Overall_Weight,w.Score FROM dim_teacher_grade_component c JOIN web_grade_confirmation w ON w.Course_Key=c.Course_Key AND w.User_Key=? AND w.Is_Confirmed=1 AND w.Group_Code=CASE c.Component_Name WHEN 'Chuyên cần' THEN 'chuyen_can' WHEN 'Giữa kỳ' THEN 'giua_ky' WHEN 'Cuối kỳ' THEN 'cuoi_ky' END WHERE c.Course_Key=? AND c.Is_Active=1`,[user,course]);
    if (rows.length!==3 || !close(rows.reduce((s,r)=>s+Number(r.Overall_Weight),0))) throw fail('Cần xác nhận đủ 3 nhóm và tổng trọng số bằng 100%.');
    const score=Math.round(rows.reduce((s,r)=>s+Number(r.Score)*Number(r.Overall_Weight)/100,0)*100)/100;
    await db.query(`INSERT INTO web_grade_confirmation (Course_Key,User_Key,Group_Code,Score,Snapshot,Updated_By) VALUES (?,?,'final',?,'{}',?) ON DUPLICATE KEY UPDATE Score=VALUES(Score),Is_Confirmed=1,Updated_By=VALUES(Updated_By),Updated_At=CURRENT_TIMESTAMP`,[course,user,score,req.teacher.userKey]);
    await db.commit(); res.json({success:true,score});
  } catch(e) {await db.rollback();res.status(e.status||500).json({success:false,message:e.status?e.message:'Không lưu được tổng kết.'});} finally {db.release();}
}

// A single What-if edit is a saved draft, even while internal weights do not add to 100.
// It must never mark a group/final grade as confirmed.
export async function saveGradeAdjustment(req,res) {
  const db=await pool.getConnection();
  try {
    const course=req.course.Course_Key,user=Number(req.params.studentId),item=Number(req.params.itemKey);
    const {score,weight,groupVersion}=req.body;
    if (!Number.isSafeInteger(item) || item<=0 || !number(score,10) || !number(weight,100) || [score,weight].some(v=>Math.abs(v*100-Math.round(v*100))>0.0001)) throw fail('Điểm/trọng số thanh kéo không hợp lệ.');
    await db.beginTransaction();
    await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course]);
    await enrolled(db,course,user);
    const [items]=await db.query(`SELECT i.*,c.Component_Name,c.Overall_Weight FROM dim_teacher_grade_item i JOIN dim_teacher_grade_component c ON c.Component_Key=i.Component_Key WHERE i.Item_Key=? AND i.Course_Key=? AND i.Is_Active=1 AND c.Is_Active=1`,[item,course]);
    const old=items[0], code=Object.keys(names).find(k=>names[k]===old?.Component_Name);
    if(!old || !code) throw fail('Đầu điểm không thuộc nhóm/môn đang chọn.',403);
    const [groupItems]=await db.query('SELECT * FROM dim_teacher_grade_item WHERE Component_Key=? AND Is_Active=1 ORDER BY Display_Order,Item_Key',[old.Component_Key]);
    if(groupVersion!==version(old.Overall_Weight,groupItems)) throw fail('Cấu hình đã thay đổi. Chọn lại sinh viên để tải dữ liệu mới trước khi kéo tiếp.',409);
    const changed=Number(old.Internal_Weight)!==weight;
    if(changed) {
      await db.query('UPDATE dim_teacher_grade_item SET Internal_Weight=? WHERE Item_Key=?',[weight,item]);
      await db.query("UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND Group_Code IN (?,'final')",[course,code]);
    }
    if(['EXTERNAL','ASSIGNMENT'].includes(old.Source_Type)) {
      const max=Number(old.Max_Score)||10;
      await db.query(`INSERT INTO fact_teacher_grade_score (Source_Score_ID,Item_Key,User_Key,Course_Key,Score,Max_Score) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE Score=VALUES(Score),Max_Score=VALUES(Max_Score)`,[sourceId(),item,user,course,score*max/10,max]);
    }
    const [rows]=await db.query('SELECT Snapshot,Score FROM web_grade_confirmation WHERE Course_Key=? AND User_Key=? AND Group_Code=?',[course,user,code]);
    const previous=rows[0] ? (typeof rows[0].Snapshot==='string'?JSON.parse(rows[0].Snapshot):rows[0].Snapshot) : {};
    const scores={...previous.scores,[`item_${item}`]:score};
    const snapshot={...previous,scores,manualItemIds:[...new Set([...(previous.manualItemIds || []),`item_${item}`])],origins:{...previous.origins,[`item_${item}`]:'MANUAL'}};
    await db.query(`INSERT INTO web_grade_confirmation (Course_Key,User_Key,Group_Code,Score,Is_Confirmed,Snapshot,Updated_By) VALUES (?,?,?,?,0,?,?) ON DUPLICATE KEY UPDATE Is_Confirmed=0,Snapshot=VALUES(Snapshot),Updated_By=VALUES(Updated_By),Updated_At=CURRENT_TIMESTAMP`,[course,user,code,Number(rows[0]?.Score)||0,JSON.stringify(snapshot),req.teacher.userKey]);
    await db.query("UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND User_Key=? AND Group_Code='final'",[course,user]);
    const updated=groupItems.map(i=>Number(i.Item_Key)===item?{...i,Internal_Weight:weight}:i);
    await db.commit();
    res.json({success:true,itemKey:item,groupKey:code,score,weight,configChanged:changed,groupVersion:version(old.Overall_Weight,updated)});
  } catch(e) {await db.rollback();res.status(e.status||500).json({success:false,message:e.status?e.message:'Không tự lưu được thanh kéo. Vui lòng thử lại.'});} finally {db.release();}
}
