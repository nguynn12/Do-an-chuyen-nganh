import pool from '../../config/database.js';

export const GROUP_NAMES={chuyen_can:'Chuyên cần',giua_ky:'Giữa kỳ',cuoi_ky:'Cuối kỳ'};
export const gradeError=(message,status=400)=>Object.assign(new Error(message),{status});
export const decodeSnapshot=value=>typeof value==='string'?JSON.parse(value):(value || {});
export const roundGrade=value=>Math.round(Number(value)*100)/100;
export const score10=(grade,max)=>grade==null || !(Number(max)>0)?null:roundGrade(Number(grade)*10/Number(max));
const same=(a,b)=>a==null?b==null:b!=null && Math.abs(Number(a)-Number(b))<0.005;
const sameRaw=(a,b)=>a==null?b==null:b!=null && Math.abs(Number(a)-Number(b))<0.00005;

export async function bumpGradeRevision(db,course) {
  await db.query('INSERT INTO web_grade_ingest_state (Course_Key) VALUES (?) ON DUPLICATE KEY UPDATE Revision=Revision+1,Updated_At=CURRENT_TIMESTAMP',[course]);
}
export async function gradeRevision(db,course) {
  const [rows]=await db.query('SELECT Revision,Updated_At FROM web_grade_ingest_state WHERE Course_Key=?',[course]);
  return {revision:Number(rows[0]?.Revision || 0),updatedAt:rows[0]?.Updated_At || null};
}

// Snapshot scores that are unchanged copies of the old LMS grade follow the source.
// Deliberate manual/Excel adjustments remain explicit overrides.
export async function reconcileLmsSnapshot(db,{course,user,item,groupKey,oldScore,newScore}) {
  const id=`item_${item}`;
  const [rows]=await db.query('SELECT Snapshot FROM web_grade_confirmation WHERE Course_Key=? AND User_Key=? AND Group_Code=? FOR UPDATE',[course,user,groupKey]);
  let preserved=false;
  if(rows.length) {
    const snapshot=decodeSnapshot(rows[0].Snapshot);
    const has=Object.hasOwn(snapshot.scores || {},id);
    preserved=(snapshot.manualItemIds || []).includes(id) || (has && !same(snapshot.scores[id],oldScore));
    if(preserved) {
      snapshot.manualItemIds=[...new Set([...(snapshot.manualItemIds || []),id])];
      snapshot.origins={...snapshot.origins,[id]:snapshot.origins?.[id] || 'MANUAL'};
      await db.query('UPDATE web_grade_confirmation SET Snapshot=? WHERE Course_Key=? AND User_Key=? AND Group_Code=?',[JSON.stringify(snapshot),course,user,groupKey]);
    } else {
      snapshot.scores ||= {};
      if(newScore==null) delete snapshot.scores[id];else snapshot.scores[id]=newScore;
      snapshot.origins={...snapshot.origins,[id]:'LMS'};
      await db.query('UPDATE web_grade_confirmation SET Snapshot=?,Is_Confirmed=0 WHERE Course_Key=? AND User_Key=? AND Group_Code=?',[JSON.stringify(snapshot),course,user,groupKey]);
    }
  }
  if(!preserved) await db.query("UPDATE web_grade_confirmation SET Is_Confirmed=0 WHERE Course_Key=? AND User_Key=? AND Group_Code='final'",[course,user]);
  return preserved;
}

export async function buildGradeSnapshot(db,course,user,items,scores,previous={}) {
  const manualItemIds=[],origins={};
  for(const item of items) {
    const id=`item_${item.Item_Key}`;
    if((previous.manualItemIds || []).includes(id) && same(previous.scores?.[id],scores[id])) {manualItemIds.push(id);origins[id]=previous.origins?.[id] || 'MANUAL';continue;}
    if(item.Source_Type==='LMS_GRADE' && item.LMS_Grade_Item_ID) {
      const [rows]=await db.query('SELECT Grade,Max_Grade FROM Fact_Course_Grade WHERE Course_Key=? AND User_Key=? AND Grade_Item_ID=? LIMIT 1',[course,user,item.LMS_Grade_Item_ID]);
      const actual=rows.length?score10(rows[0].Grade,rows[0].Max_Grade):null;
      if(!same(actual,scores[id])) {manualItemIds.push(id);origins[id]='MANUAL';}else origins[id]='LMS';
    } else origins[id]=previous.origins?.[id] || 'MANUAL';
  }
  return {scores,manualItemIds,origins};
}

export async function syncLmsGrades(course,{connection=null}={}) {
  const db=connection || await pool.getConnection();
  try {
    if(!connection) await db.beginTransaction();
    await db.query('SELECT Course_Key FROM Dim_Course WHERE Course_Key=? FOR UPDATE',[course.Course_Key]);
    const [links]=await db.query(`SELECT i.*,c.Component_Name FROM dim_teacher_grade_item i JOIN dim_teacher_grade_component c ON c.Component_Key=i.Component_Key WHERE i.Course_Key=? AND i.Is_Active=1 AND c.Is_Active=1 AND i.Source_Type='LMS_GRADE' AND i.LMS_Grade_Item_ID IS NOT NULL`,[course.Course_Key]);
    let changed=0,preservedOverrides=0,ignored=0;
    const byLms=new Map();
    for(const i of links) {if(!byLms.has(Number(i.LMS_Grade_Item_ID)))byLms.set(Number(i.LMS_Grade_Item_ID),[]);byLms.get(Number(i.LMS_Grade_Item_ID)).push(i);}
    for(const [lmsItem,items] of byLms) {
      const [source]=await db.query(`SELECT gi.id,gi.itemname,gi.itemmodule,gi.grademax,gi.gradepass,gg.finalgrade,gg.timemodified,u.User_Key,f.Grade_Key,f.Grade AS Old_Grade,f.Max_Grade AS Old_Max,dd.Date_Key,a.Activity_Key
        FROM lms_moodle_source.mdl_grade_items gi
        JOIN lms_moodle_source.mdl_grade_grades gg ON gg.itemid=gi.id
        JOIN Dim_User u ON u.Moodle_User_ID=gg.userid
        JOIN Fact_Enrolment e ON e.User_Key=u.User_Key AND e.Course_Key=? AND LOWER(e.Status)='active'
        LEFT JOIN Fact_Course_Grade f ON f.User_Key=u.User_Key AND f.Grade_Item_ID=gi.id
        LEFT JOIN Dim_Date dd ON dd.Full_Date=DATE(FROM_UNIXTIME(NULLIF(gg.timemodified,0)))
        LEFT JOIN lms_moodle_source.mdl_modules m ON m.name=gi.itemmodule
        LEFT JOIN lms_moodle_source.mdl_course_modules cm ON cm.course=gi.courseid AND cm.module=m.id AND cm.instance=gi.iteminstance
        LEFT JOIN Dim_Activity a ON a.Moodle_Module_ID=cm.id
        WHERE gi.courseid=? AND gi.id=?`,[course.Course_Key,course.Moodle_Course_ID,lmsItem]);
      for(const row of source) {
        const max=Number(row.grademax),grade=row.finalgrade==null?null:Number(row.finalgrade);
        if(!(max>0) || !Number.isFinite(max) || (grade!=null && (!Number.isFinite(grade) || grade<0 || grade>max))) {ignored++;continue;}
        for(const item of items) if(Number(item.Max_Score)!==max) {
          await db.query('UPDATE dim_teacher_grade_item SET Max_Score=? WHERE Item_Key=?',[max,item.Item_Key]);item.Max_Score=max;
        }
        if(row.Grade_Key && sameRaw(row.Old_Grade,grade) && sameRaw(row.Old_Max,max)) continue;
        const pct=grade==null?null:Math.round(grade*100/max*10000)/10000,passed=grade==null || row.gradepass==null?null:grade>=Number(row.gradepass);
        if(row.Grade_Key) await db.query('UPDATE Fact_Course_Grade SET Course_Key=?,Grade_Item_Name=?,Grade_Item_Type=?,Grade=?,Max_Grade=?,Grade_Percentage=?,Is_Passed=?,Date_Key=COALESCE(?,Date_Key),Activity_Key=COALESCE(?,Activity_Key) WHERE Grade_Key=?',[course.Course_Key,row.itemname,row.itemmodule,grade,max,pct,passed,row.Date_Key,row.Activity_Key,row.Grade_Key]);
        else await db.query('INSERT INTO Fact_Course_Grade (User_Key,Course_Key,Grade_Item_ID,Grade_Item_Name,Grade_Item_Type,Grade,Max_Grade,Grade_Percentage,Is_Passed,Date_Key,Activity_Key) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[row.User_Key,course.Course_Key,lmsItem,row.itemname,row.itemmodule,grade,max,pct,passed,row.Date_Key,row.Activity_Key]);
        for(const item of items) {
          const groupKey=Object.keys(GROUP_NAMES).find(k=>GROUP_NAMES[k]===item.Component_Name);
          if(groupKey && await reconcileLmsSnapshot(db,{course:course.Course_Key,user:row.User_Key,item:item.Item_Key,groupKey,oldScore:score10(row.Old_Grade,row.Old_Max),newScore:score10(grade,max)})) preservedOverrides++;
        }
        changed++;
      }
    }
    if(changed) await bumpGradeRevision(db,course.Course_Key);
    const state=await gradeRevision(db,course.Course_Key);
    if(!connection) await db.commit();
    return {...state,changed,preservedOverrides,ignored,linkedItems:links.length};
  } catch(e) {if(!connection)await db.rollback();throw e;} finally {if(!connection)db.release();}
}

export function startGradeSyncScheduler() {
  let running=false;
  async function tick() {
    if(running) return;running=true;
    try {
      const [courses]=await pool.query(`SELECT DISTINCT c.Course_Key,c.Moodle_Course_ID FROM Dim_Course c JOIN dim_teacher_grade_item i ON i.Course_Key=c.Course_Key WHERE i.Source_Type='LMS_GRADE' AND i.Is_Active=1 AND i.LMS_Grade_Item_ID IS NOT NULL`);
      for(const course of courses) await syncLmsGrades(course);
    } catch(e) {console.error('[LMS grade sync]',e.message);} finally {running=false;}
  }
  void tick();
  const timer=setInterval(()=>void tick(),30000);timer.unref();return timer;
}
