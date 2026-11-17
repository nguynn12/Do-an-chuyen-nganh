import assert from 'node:assert/strict';
import pool from './src/config/database.js';
import {getAssignmentMonitoring} from './src/GiangVien/services/assignmentMonitoringService.js';
import {buildMonitoringView,submissionTiming,hasLmsGrade} from '../Frontend/GiangVien/src/components/assignment/assignmentMonitoringUtils.js';
const assignments=[{assignmentId:1,activityName:'A',dueTime:100},{assignmentId:2,activityName:'B',dueTime:0}];
const students=[{studentId:1,studentUsername:'sv23001'},{studentId:2,studentUsername:'sv22001'},{studentId:3,studentUsername:'sv23002'}];
const submissions=[{studentId:1,assignmentId:1,submissionStatus:'submitted',submitModified:100,grade:0},{studentId:2,assignmentId:1,submissionStatus:'submitted',submitModified:110,grade:-1},{studentId:3,assignmentId:1,submissionStatus:'draft',submitModified:200,grade:null},{studentId:1,assignmentId:2,submissionStatus:'submitted',submitModified:300,grade:8}];
assert.equal(submissionTiming(submissions[0],assignments[0]),'ontime');
assert.equal(submissionTiming(submissions[1],assignments[0]),'late');
assert.equal(submissionTiming(submissions[2],assignments[0]),'missing');
assert.equal(submissionTiming(submissions[3],assignments[1]),'unknown');
assert.equal(hasLmsGrade(submissions[0]),true);assert.equal(hasLmsGrade(submissions[1]),false);
const model=buildMonitoringView({assignments,students,submissions});
assert.deepEqual([model.submitted,model.missing,model.late,model.graded],[3,3,1,2]);
const cohort=buildMonitoringView({assignments,students,submissions},'K47');
assert.deepEqual([cohort.students.length,cohort.submitted,cohort.missing,cohort.late],[2,2,2,0]);
const original=pool.query;const calls=[];let permitted=true;
try {
 pool.query=async(sql,args)=>{calls.push({sql,args});assert.match(sql.trim(),/^SELECT/i);
  if(sql.includes('SELECT 1'))return [permitted?[{allowed:1}]:[]];
  if(sql.includes('SELECT id AS assignmentId'))return [assignments];
  if(sql.includes('SELECT DISTINCT u.id'))return [students];
  if(sql.includes('SELECT id, username'))return [[{id:2}]];
  if(sql.includes('s.id AS submissionId'))return [[...submissions,{studentId:999,assignmentId:1,submissionStatus:'submitted'}]];
  throw new Error('Unexpected query');
 };
 const result=await getAssignmentMonitoring(2,103);assert.equal(result.readOnly,true);assert.equal(result.submissions.length,4);assert.ok(!result.submissions.some(s=>s.studentId===999));
 permitted=false;calls.length=0;await assert.rejects(getAssignmentMonitoring(2,104),e=>e.status===403);assert.equal(calls.length,1);
 await assert.rejects(getAssignmentMonitoring(2,NaN),e=>e.status===400);
 console.log('PASS: read-only SELECTs, permission denial before data queries, enrolled-student isolation, zero/-1 grades, no deadline, draft not late, cohort counters and missing totals.');
}finally{pool.query=original;}
if(process.argv.includes('--live')){
 const result=await getAssignmentMonitoring(2,103);
 console.log(JSON.stringify({liveRead:'PASS',assignments:result.assignments.length,students:result.students.length,submissionRecords:result.submissions.length,readOnly:result.readOnly}));
}
await pool.end();
