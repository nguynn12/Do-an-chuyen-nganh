import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://127.0.0.1:3000/api';
const results=[];
async function request(path,token,options={}) {
 const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...options.headers},signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>null);
 return {status:response.status,data};
}
async function check(label,path,token,expected=200,options={}) {
 const r=await request(path,token,options);results.push({label,status:r.status,expected});
 assert.equal(r.status,expected,`${label}: ${JSON.stringify(r.data).slice(0,400)}`);if (expected < 400) assert.notEqual(r.data?.success,false,label); return r.data;
}
try {
 const login=await check('teacher login','/auth/login',null,200,{method:'POST',body:JSON.stringify({username:'gv_tranminhb',password:'123456'})});
 const token=login.token || login.data?.token;assert.ok(token,'teacher token');
 const id=login.user?.moodleUserId || login.user?.Moodle_User_ID || login.data?.user?.moodleUserId || 2;
 const courses=await check('teacher courses',`/teachers/${id}/courses`,token);
 for(const suffix of ['', '/dashboard','/activity','/learning-alerts','/schedule','/calendar?year=2026&month=11','/notifications','/notifications/unread-count'])await check('teacher '+(suffix||'profile'),`/teachers/${id}${suffix}`,token);
 await check('reject another teacher',`/teachers/1/learning-alerts`,token,403);
 await check('reject unauthenticated alerts',`/teachers/${id}/learning-alerts`,null,401);
 await check('reject empty broadcast',`/teachers/${id}/learning-alerts/broadcast`,token,400,{method:'POST',body:'{}'});
 await check('reject unassigned class broadcast',`/teachers/${id}/learning-alerts/broadcast`,token,403,{method:'POST',body:JSON.stringify({title:'Validation only',desc:'Not delivered',courseId:999999999})});
 await check('reject invalid read state',`/teachers/${id}/learning-alerts/missing`,token,400,{method:'PATCH',body:'{"read":"false"}'});
 await check('reject missing alert deletion',`/teachers/${id}/learning-alerts/missing`,token,404,{method:'DELETE'});
 for (const course of courses.data || []) {
  for(const suffix of ['/students?cohort=K47','/student-analytics?cohort=K47','/cohorts','/grade-distribution?cohort=K47','/engagement-trend?cohort=K47','/submission-behavior?cohort=K47','/segments?cohort=K47','/risk?cohort=K47']) await check(`course ${course.Moodle_Course_ID} ${suffix}`,`/courses/${course.Moodle_Course_ID}${suffix}`,token);
  await check(`assignment monitor ${course.Moodle_Course_ID}`,`/teachers/${id}/assignments/monitor?courseId=${course.Moodle_Course_ID}`,token);
 }
 await check('class comparison','/comparison?courseA=13&cohortA=K47&courseB=12&cohortB=K47',token);
 await check('comparison ownership','/comparison?courseA=999999&courseB=12',token,403);
 for(const path of [`/teachers/${id}/calendar`,`/teachers/${id}/notifications`,'/comparison?courseA=13&courseB=12']) await check('reject public '+path,path,null,401);
 await check('AI Studio capabilities','/ai/studio/powerbi/capabilities',token);
 const student=await check('student login','/auth/login',null,200,{method:'POST',body:JSON.stringify({username:'sv2310002',password:'123456'})});
 const studentToken=student.token || student.data?.token;assert.ok(studentToken,'student token');
 for(const suffix of ['/dashboard-summary','/courses','/grades','/submissions','/engagement','/benchmark','/behavior-profile']) await check('student '+suffix,`/v1/student${suffix}`,studentToken);
 const studentCourses=await check('student course list details','/v1/student/courses',studentToken);
 assert.ok(Array.isArray(studentCourses));
 for(const course of studentCourses) await check('student detail '+course.id,`/v1/student/courses/${course.id}`,studentToken);
 const own=await check('student own identity','/v1/student/dashboard-summary',studentToken);
 const spoof=await check('student rejects identifier spoofing','/v1/student/dashboard-summary?userId=sv2110003',studentToken);
 assert.equal(own.student.username,spoof.student.username);
 assert.equal(studentCourses.reduce((sum,course)=>sum+Number(course.submittedCount),0),own.kpis.submittedAssignments,'Student overview and course submission counts must agree');
 await check('student denied teacher alerts',`/teachers/${id}/learning-alerts`,studentToken,403);
 console.log(`PASS ${results.length} HTTP checks`);
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {fs.writeFileSync(new URL('../tmp-run/web-audit-http-results.json', import.meta.url),JSON.stringify(results,null,2));}
