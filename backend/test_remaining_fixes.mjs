import assert from 'node:assert/strict';
import app from './src/app.js';
import pool from './src/config/database.js';
import {getCourseStudents} from './src/GiangVien/controllers/courseController.js';
import {requireOwnTeacherPath} from './src/shared/middleware/teacherPathIdentity.js';
const response=()=>({code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
for(const [teacher,path,expected] of [[2,'2',200],[2,'1',403],[2,'invalid',400],[2,'0',400],[null,'2',401]]){
 const res=response();let passed=false;requireOwnTeacherPath({teacher:teacher?{moodleUserId:teacher}:null,params:{teacherId:path}},res,()=>{passed=true;});assert.equal(res.code,expected);assert.equal(passed,expected===200);
}
const original=pool.query;let cohortParams;
try {
 pool.query=async(sql,params)=>{cohortParams=params;return [[]];};
 const res=response();await getCourseStudents({params:{courseId:'103'},query:{cohort:'ALL'}},res);
 assert.equal(res.code,200);assert.equal(res.body.cohort,'ALL');assert.equal(cohortParams[2],'%');
}finally{pool.query=original;}
let queries=0;
pool.query=async()=>{queries++;throw new Error('Unauthenticated request must not reach the database');};
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
try {
 const base=`http://127.0.0.1:${server.address().port}`;
 const paths=[['GET','/api/teachers/2/assignments/bank?courseId=103'],['POST','/api/teachers/2/assignments/bank'],['PUT','/api/teachers/2/assignments/bank/1'],['POST','/api/teachers/2/assignments/campaigns/preview-random'],['POST','/api/teachers/2/assignments/campaigns'],['GET','/api/teachers/2/assignments/campaigns'],['GET','/api/teachers/2/grading/submissions'],['POST','/api/teachers/2/grading/submissions/1/grade'],['GET','/api/teachers/2/assignments/monitor?courseId=103']];
 for(const [method,path] of paths){const r=await fetch(base+path,{method,...(method==='GET'?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:103,score:5})})});assert.equal(r.status,401,`${method} ${path}`);}
 for(const path of ['/api/test/users','/api/test/database'])assert.equal((await fetch(base+path)).status,404);
 assert.equal((await fetch(base+'/api/test')).status,200);assert.equal(queries,0);
 console.log('PASS: 9 legacy/monitor endpoints reject unauthenticated reads/writes before DB; diagnostic exports 404; health 200; ownership mismatch 403, invalid ID 400, missing identity 401. No DB/cloud writes.');
}finally{pool.query=original;await new Promise(resolve=>server.close(resolve));await pool.end();}
