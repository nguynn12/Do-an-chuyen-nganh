import assert from 'node:assert/strict';
import pool from './src/config/database.js';
import { converseWithClassroom, groqConversationCompletion } from './src/GiangVien/services/classroomConversationService.js';
const teacher={userKey:999901},course={Course_Key:999902,Moodle_Course_ID:999903,Course_Code:'TEST'};
const input={prompt:'Giải thích closure bằng ví dụ dễ hiểu',period:'week'};
let calls=0;
const first=await converseWithClassroom(teacher,course,input,{complete:async(messages)=>{calls++;assert.equal(messages.at(-1).content,input.prompt);return {message:{role:'assistant',content:'Closure giúp hàm nhớ biến ở phạm vi nơi nó được tạo.'},model:'mock'};},load:async()=>{throw new Error('General questions should not query DB');}});
assert.equal(calls,1);assert.ok(first.message.includes('Closure'));assert.ok(first.conversationId);
await converseWithClassroom(teacher,course,{...input,prompt:'Cho ví dụ JavaScript nữa',conversationId:first.conversationId},{complete:async(messages)=>{assert.ok(messages.some(message=>message.content===input.prompt));assert.ok(messages.some(message=>message.content===first.message));return {message:{role:'assistant',content:'Ví dụ tiếp theo…'},model:'mock'};}});
await assert.rejects(()=>converseWithClassroom({userKey:123},course,{...input,conversationId:first.conversationId}),error=>error.status===403);
let step=0,loads=0;
const result=await converseWithClassroom(teacher,course,{...input,prompt:'Lớp có bao nhiêu sinh viên và mở thống kê bài tập?'},{complete:async(messages)=>{
 if(step++===0)return {message:{role:'assistant',content:null,tool_calls:[{id:'call1',type:'function',function:{name:'get_classroom_statistics',arguments:JSON.stringify({topic:'assignments',period:'all'})}}]},model:'mock'};
 const data=JSON.parse(messages.at(-1).content);assert.equal(data.data.assignmentStatus.enrolled,18);assert.ok(!JSON.stringify(data).includes('PRIVATE'));
 return {message:{role:'assistant',content:'Lớp có 18 sinh viên. Bạn mở báo cáo bằng nút bên dưới nhé.'},model:'mock'};
},load:async()=>{loads++;return {snapshot:{assignmentStatus:{enrolled:18,assignments:1,totalAssignments:1,submitted:0,missing:18,overdueMissing:18,late:0,activityInPeriod:0,chart:[{label:'PRIVATE_ASSIGNMENT',submitted:0,missing:18}]},quiz:{attempts:0,students:0,average:null}},warnings:[]};}});
assert.equal(loads,1);assert.ok(result.links.some(link=>link.href.includes('999903')));assert.equal(result.charts.length,1);assert.ok(result.message.includes('18'));
await assert.rejects(()=>converseWithClassroom({userKey:777},course,input,{complete:async()=>({message:{tool_calls:[{id:'bad',function:{name:'execute_sql',arguments:'{}'}}]}})}),error=>error.status===422);
await assert.rejects(()=>converseWithClassroom({userKey:778},course,input,{complete:async()=>{throw Object.assign(new Error('Quota'),{status:429});}}),error=>error.status===429);
console.log('PASS: free conversation, follow-up memory, teacher isolation, tool calling, anonymized tool result, canonical links, rejected SQL tool, honest provider failure');
if(process.argv.includes('--synthetic')){
 const response=await groqConversationCompletion([{role:'system',content:'Trả lời tiếng Việt ngắn gọn, có thể dùng công cụ nếu được cung cấp.'},{role:'user',content:'Giải thích closure trong JavaScript bằng một ví dụ đơn giản.'}],[]);
 assert.ok(response.message.content?.length>20);console.log(`Live general-knowledge Groq passed (${response.totalTokens} tokens), no LMS data used.`);
 const routed=await groqConversationCompletion([{role:'system',content:'Khi người dùng hỏi dữ liệu lớp, bắt buộc gọi công cụ được cấp.'},{role:'user',content:'Lớp có bao nhiêu sinh viên?'}],[{type:'function',function:{name:'get_classroom_statistics',description:'Lấy số sinh viên trong lớp giả lập',parameters:{type:'object',properties:{},additionalProperties:false}}}]);
 assert.equal(routed.message.tool_calls?.[0]?.function.name,'get_classroom_statistics');console.log('Live model tool selection passed with a fabricated classroom question; no database queried.');
}
await pool.end();
