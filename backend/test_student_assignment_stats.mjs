import assert from 'node:assert/strict';
import pool from './src/config/database.js';
import {buildStudentAssignmentStats,readStudentAssignmentStats} from './src/GiangVien/services/studentAssignmentStatsService.js';
import {converseWithClassroom} from './src/GiangVien/services/classroomConversationService.js';
const students=[{User_Key:1,Full_Name:'PRIVATE_A',Username:'s1'},{User_Key:2,Full_Name:'PRIVATE_B',Username:'s2'}];
const assignments=[{Activity_Key:1,Activity_Name:'A',Due_Date_Key:20260901},{Activity_Key:2,Activity_Name:'B',Due_Date_Key:20260902}];
const records=[{User_Key:1,Activity_Key:1,Submission_Status:'draft'},{User_Key:1,Activity_Key:1,Submission_Status:'submitted'},{User_Key:1,Activity_Key:1,Submission_Status:'submitted'},{User_Key:2,Activity_Key:1,Submission_Status:'draft'},{User_Key:999,Activity_Key:2,Submission_Status:'submitted'}];
const model=buildStudentAssignmentStats(students,assignments,records,{start:null});
assert.equal(model.snapshot.submitted,1);assert.equal(model.snapshot.missing,3);assert.equal(model.snapshot.studentBreakdown.highestMissing,2);assert.equal(model.snapshot.studentBreakdown.tiedLeaders,1);assert.equal(model.rows[0].draft,1);
assert.equal(buildStudentAssignmentStats(students,assignments,records,{start:'2026-11-01',end:'2026-11-09'}).snapshot.missing,0);
let step=0;
const reply=await converseWithClassroom({userKey:721999},{Course_Key:721998,Moodle_Course_ID:721997,Course_Code:'TEST'},{prompt:'Ai thiếu bài nhiều nhất?',period:'all'},{load:async()=>({snapshot:{assignmentStatus:model.snapshot},warnings:[]}),complete:async(messages)=>{
 if(step++===0)return {message:{tool_calls:[{id:'missing1',function:{name:'get_classroom_statistics',arguments:'{"topic":"missing","period":"all"}'}}]}};
 const data=JSON.parse(messages.at(-1).content);assert.equal(data.data.assignmentStatus.studentBreakdown.highestMissing,2);assert.ok(!JSON.stringify(data).includes('PRIVATE'));assert.ok(!JSON.stringify(data).includes('s2'));
 return {message:{content:'Sinh viên trong bảng có nhiều nhất 2 bài chưa ghi nhận nộp.'}};
}});
assert.equal(reply.tables[0].rows[0][0],'PRIVATE_B');assert.ok(reply.links.some(link=>link.href.includes('cohort=ALL')));
console.log('PASS: distinct student-activity pairs, submitted priority, draft, roster isolation, period, ranking/ties, local names only, report links');
if(process.argv.includes('--db')){
 const [[teacher]]=await pool.query("SELECT User_Key,Moodle_User_ID FROM Dim_User WHERE Full_Name='Trần Bình Trần' AND Primary_Role='Teacher'");
 const[courses]=await pool.query("SELECT Course_Key,Moodle_Course_ID,Course_Code FROM Dim_Course WHERE Course_Code IN ('AI401','GAME401','WEB401','TEST401')");
 for(const course of courses){
  const stats=await readStudentAssignmentStats({moodleUserId:teacher.Moodle_User_ID},course,{start:null});
  const [[oracle]]=await pool.query(`SELECT COUNT(*) AS expected,SUM(EXISTS(SELECT 1 FROM Fact_Assignment_Submission f WHERE f.Course_Key=? AND f.User_Key=e.User_Key AND f.Activity_Key=a.Activity_Key AND f.Submission_Status='submitted')) AS submitted FROM (SELECT DISTINCT User_Key FROM Fact_Enrolment WHERE Course_Key=? AND Status='Active') e CROSS JOIN Dim_Activity a WHERE a.Course_Key=? AND a.Is_Visible=1 AND a.Activity_Type IN ('assign','assignment')`,[course.Course_Key,course.Course_Key,course.Course_Key]);
  assert.equal(stats.snapshot.missing,Number(oracle.expected)-Number(oracle.submitted));
  assert.equal(stats.snapshot.submitted,Number(oracle.submitted));
  assert.equal(stats.rows.reduce((n,r)=>n+r.missing,0),stats.snapshot.missing);
  console.log(JSON.stringify({course:course.Course_Code,enrolled:stats.snapshot.enrolled,assignments:stats.snapshot.assignments,missing:stats.snapshot.missing,highestMissing:stats.snapshot.studentBreakdown.highestMissing,tied:stats.snapshot.studentBreakdown.tiedLeaders}));
 }
 console.log('PASS: database totals/ranking agree with independent SQL mirroring Power BI StudentAssignmentStatus');
}
await pool.end();
