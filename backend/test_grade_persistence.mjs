import assert from 'node:assert/strict';
import pool from './src/config/database.js';
import {getSavedGrades,saveGradeGroup,saveFinalGrade,saveGradeAdjustment} from './src/GiangVien/controllers/gradePersistenceController.js';
import app from './src/app.js';
import {generateAuthToken} from './src/shared/services/tokenService.js';

const [fixture]=await pool.query(`SELECT e.Course_Key,e.User_Key,c.Moodle_Course_ID FROM Fact_Enrolment e JOIN Dim_Course c ON c.Course_Key=e.Course_Key WHERE e.Course_Key=11 AND LOWER(e.Status)='active' LIMIT 1`);
assert.ok(fixture.length,'Enrolled student fixture');
const f=fixture[0];
const [teachers]=await pool.query("SELECT User_Key FROM Dim_User WHERE LOWER(Primary_Role) IN ('teacher','giangvien') LIMIT 1");
const db=await pool.getConnection();
const query=pool.query.bind(pool),getConnection=pool.getConnection.bind(pool);
await db.beginTransaction();
let commits=0;
pool.query=db.query.bind(db);
pool.getConnection=async()=>({query:db.query.bind(db),beginTransaction:async()=>{},commit:async()=>{commits++;},rollback:async()=>{},release:()=>{}});
const req=(params={},body={})=>({course:{Course_Key:f.Course_Key},teacher:{userKey:teachers[0].User_Key},params:{studentId:String(f.User_Key),...params},body});
async function call(fn,r){const result={status:200};await fn(r,{status(n){result.status=n;return this;},json(data){result.data=data;return this;}});return result;}
try {
 const before=await call(getSavedGrades,req());assert.equal(before.status,200);
 let groups=before.data.groups;
 const cc=groups.find(g=>g.key==='chuyen_can');
 assert.equal(cc.items.length,4);
 const values={'Điểm danh LMS':7.5,'Bài tập tìm kiếm trạng thái':7.2,'Bài tập Machine Learning cơ bản':7.3,'Bài kiểm tra 15 phút':6.5};
 const weights={'Điểm danh LMS':60,'Bài tập tìm kiếm trạng thái':10,'Bài tập Machine Learning cơ bản':10,'Bài kiểm tra 15 phút':20};
 const scores={};for(const i of cc.items){assert.ok(i.name in values,i.name);scores[i.id]=values[i.name];i.weight=weights[i.name];}
 cc.overallWeight=10;
 let result=await call(saveGradeGroup,req({groupKey:cc.key},{group:cc,scores}));assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.score,7.25);
 const savedCC=result.data.group;
 const read=await call(getSavedGrades,req());assert.equal(read.data.confirmations.chuyen_can.snapshotScore,7.25);assert.equal(read.data.scores[cc.items.find(i=>i.name==='Bài kiểm tra 15 phút').id],6.5);
 const [external]=await db.query('SELECT Score FROM fact_teacher_grade_score WHERE Item_Key=? AND User_Key=?',[cc.items.find(i=>i.name==='Bài kiểm tra 15 phút').itemKey,f.User_Key]);assert.equal(Number(external[0].Score),6.5);
 console.log('PASS: 7.25 recomputed server-side, external score 6.5 saved and re-read');
 const count=commits;
 for (const body of [{group:{...savedCC,items:savedCC.items.map((i,n)=>({...i,weight:n===0?0:i.weight}))},scores},{group:savedCC,scores:{...scores,[savedCC.items[0].id]:null}},{group:{...savedCC,items:savedCC.items.map((i,n)=>n===0?{...i,id:'item_999999'}:i)},scores:{...scores,item_999999:7}}]) {result=await call(saveGradeGroup,req({groupKey:cc.key},body));assert.ok(result.status>=400,JSON.stringify(result));}
 assert.equal(commits,count);console.log('PASS: invalid weights, missing score, foreign item rejected');
 result=await call(saveFinalGrade,req());assert.equal(result.status,400);console.log('PASS: incomplete final grade rejected');
 for (const key of ['giua_ky','cuoi_ky']) {
   let group=groups.find(g=>g.key===key);
   group={...group,overallWeight:key==='giua_ky'?40:50,items:group.items.length?group.items:[{id:`new_${key}`,name:'Đầu điểm kiểm thử',weight:100}]};
   group.items=group.items.map((i,n)=>({...i,weight:n===0?100:0}));
   if(key==='giua_ky'){group.items[0].weight=90;group.items.push({id:'new_test_extra',name:'Kiểm tra giữa kỳ 2 (kiểm thử rollback)',weight:10});}
   const sc=Object.fromEntries(group.items.map(i=>[i.id,8]));
   result=await call(saveGradeGroup,req({groupKey:key},{group,scores:sc}));assert.equal(result.status,200,JSON.stringify(result));
   const repeat=await call(saveGradeGroup,req({groupKey:key},{group:result.data.group,scores:result.data.scores}));assert.equal(repeat.status,200,JSON.stringify(repeat));
   const stale=await call(saveGradeGroup,req({groupKey:key},{group:{...result.data.group,version:'stale'},scores:result.data.scores}));assert.equal(stale.status,409);
 }
 console.log('PASS: new item stored with stable DB id, repeated save and stale configuration checks');
 result=await call(saveFinalGrade,req());assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.score,7.93);
 const final=await call(getSavedGrades,req());assert.equal(final.data.confirmations.final.snapshotScore,7.93);
 console.log('PASS: final calculated from persisted groups and re-read (7.93)');
 // Confirm the two group sliders with the same weights used in the embedded report.
 let snapshot=(await call(getSavedGrades,req())).data;
 for(const [key,weight,point] of [['chuyen_can',15,null],['giua_ky',70,5.6],['cuoi_ky',15,3.6]]) {
   const group=snapshot.groups.find(g=>g.key===key);group.overallWeight=weight;
   const input=point===null ? Object.fromEntries(group.items.map(i=>[i.id,snapshot.scores[i.id]])) : Object.fromEntries(group.items.map(i=>[i.id,point]));
   const saved=await call(saveGradeGroup,req({groupKey:key},{group,scores:input}));assert.equal(saved.status,200,JSON.stringify(saved));
   snapshot=(await call(getSavedGrades,req())).data;
 }
 const weightedFinal=await call(saveFinalGrade,req());assert.equal(weightedFinal.status,200);assert.equal(weightedFinal.data.score,5.55);
 console.log('PASS: GK5.6 and CK3.6 with weights15/70/15 persisted and final calculated from database');
 const g=snapshot.groups.find(g=>g.key==='chuyen_can');
 const externalItem=g.items.find(i=>i.name==='Bài kiểm tra 15 phút');
 result=await call(saveGradeAdjustment,req({itemKey:String(externalItem.itemKey)},{score:6.5,weight:15,groupVersion:g.version}));assert.equal(result.status,200,JSON.stringify(result));
 const draft=await call(getSavedGrades,req());assert.equal(draft.data.scores[externalItem.id],6.5);assert.equal(draft.data.confirmations.chuyen_can.confirmed,false);assert.equal(draft.data.confirmations.final.confirmed,false);assert.equal(draft.data.groups.find(g=>g.key==='chuyen_can').items.find(i=>i.id===externalItem.id).weight,15);
 result=await call(saveGradeAdjustment,req({itemKey:String(externalItem.itemKey)},{score:11,weight:20,groupVersion:result.data.groupVersion}));assert.equal(result.status,400);
 result=await call(saveGradeAdjustment,req({itemKey:'99999999'},{score:6.5,weight:20,groupVersion:g.version}));assert.equal(result.status,403);
 console.log('PASS: slider draft autosave permits 95% internal total, persists score/weight and invalidates confirmation; foreign item/out-of-range rejected');
 result=await call(getSavedGrades,req({studentId:'99999999'}));assert.equal(result.status,403);
 console.log('PASS: unenrolled student rejected');
} finally {pool.query=query;pool.getConnection=getConnection;await db.rollback();db.release();}
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
try {
 const url=`http://127.0.0.1:${server.address().port}/api/courses/${f.Moodle_Course_ID}/students/${f.User_Key}`;
 for(const path of ['/saved-grades','/grade-groups/chuyen_can','/final-grade','/grade-items/13/adjustment']) {
 const r=await fetch(url+path,{method:path==='/saved-grades'?'GET':path.includes('/adjustment')?'PATCH':'PUT',headers:{'Content-Type':'application/json'},body:path==='/saved-grades'?undefined:'{}'});assert.equal(r.status,401);
 }
 console.log('PASS: GET/group PUT/final PUT require authentication');
 const [accounts]=await pool.query("SELECT a.Username FROM App_User_Account a JOIN Dim_User u ON u.User_Key=a.User_Key WHERE a.Is_Active=1 AND u.Is_Active=1 AND LOWER(a.Role) IN ('teacher','giangvien') LIMIT 1");
 assert.ok(accounts.length);
 const token=generateAuthToken({username:accounts[0].Username,role:'teacher'});
 const denied=await fetch(`http://127.0.0.1:${server.address().port}/api/courses/99999999/students/${f.User_Key}/grade-groups/chuyen_can`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({courseId:f.Moodle_Course_ID})});
 assert.equal(denied.status,403);
 console.log('PASS: unauthorized course rejected even with body courseId override');
} finally {await new Promise(resolve=>server.close(resolve));await pool.end();}
console.log('All grade persistence checks passed. Test writes rolled back; student data unchanged.');
