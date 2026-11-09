import assert from 'node:assert/strict';
import pool from './src/config/database.js';
import { CLASSROOM_RESPONSE_RULES, anonymousClassroomStats, converseWithClassroom, groqConversationCompletion } from './src/GiangVien/services/classroomConversationService.js';
const data=anonymousClassroomStats({assignmentStatus:{enrolled:18,missing:180,overdueMissing:180,submitted:0}});
assert.equal(data.attendanceIncluded,false);
assert.equal(data.assignmentStatus.unsubmittedStudentAssignmentPairs,180);
assert.ok(!Object.hasOwn(data.assignmentStatus,'missing'));
await converseWithClassroom({userKey:876541},{Course_Key:876542},{prompt:'Ai vắng nhiều nhất?',period:'all'},{complete:async messages=>{
 assert.ok(messages[0].content.includes(CLASSROOM_RESPONSE_RULES));
 return {message:{content:'Chưa có dữ liệu điểm danh theo sinh viên để xác định ai vắng nhiều nhất.'}};
}});
if(process.argv.includes('--synthetic')){
 const result=await groqConversationCompletion([
  {role:'system',content:`Bạn là trợ lý giảng viên. ${CLASSROOM_RESPONSE_RULES}`},
  {role:'user',content:'Ai vắng học nhiều nhất trong tháng 10?'},
  {role:'assistant',content:'Dữ liệu giả lập có missing=180, chưa có tên sinh viên.'},
  {role:'user',content:'không phải trong tháng 10 mà trong khóa học đó'},
 ],[]);
 const text=result.message.content;
 assert.ok(text.length<650, `Answer too long: ${text.length}`);
 assert.ok(!text.includes('180'));
 assert.ok(/chuyên cần|điểm danh/i.test(text));
 assert.ok(!/sẵn sàng hỗ trợ|nếu bạn muốn|Power BI/i.test(text));
 console.log('Synthetic live regression:',text);
}
console.log('PASS: concise system rules applied, missing submission distinct from attendance');
await pool.end();
