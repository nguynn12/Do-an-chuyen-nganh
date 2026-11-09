import pool from '../../config/database.js';
import { checkTeacherCoursePermission } from './assignmentService.js';

// Mirrors StudentAssignmentStatus calculated table in the repository Power BI model:
// DISTINCT active enrollment x visible assign/assignment activity, submitted beats draft.
export function buildStudentAssignmentStats(students, assignments, records, period, now = Date.now()) {
  const start = period.start ? Number(period.start.replaceAll('-', '')) : null;
  const end = period.end ? Number(period.end.replaceAll('-', '')) : null;
  const selected = assignments.filter(a => !start || Number(a.Due_Date_Key) >= start && Number(a.Due_Date_Key) < end);
  const matrix = new Map();
  for (const record of records) {
    const key = `${record.User_Key}:${record.Activity_Key}`;
    const current = matrix.get(key) || { submitted: false, draft: false, late: false };
    if (record.Submission_Status === 'submitted') { current.submitted = true; current.late ||= record.Is_Submitted_On_Time === 0; }
    if (record.Submission_Status === 'draft') current.draft = true;
    matrix.set(key, current);
  }
  const today = Number(new Date(now + 7*3600000).toISOString().slice(0,10).replaceAll('-', ''));
  const rows = students.map(student => {
    let submitted=0, missing=0, draft=0, overdue=0, late=0;
    for (const assignment of selected) {
      const state=matrix.get(`${student.User_Key}:${assignment.Activity_Key}`);
      if(state?.submitted){submitted++;if(state.late)late++;}
      else {missing++;if(state?.draft)draft++;if(Number(assignment.Due_Date_Key)>0&&Number(assignment.Due_Date_Key)<today)overdue++;}
    }
    return { name: student.Full_Name, username: student.Username, expected:selected.length, submitted, missing, draft, overdue, late };
  }).sort((a,b)=>b.missing-a.missing || a.username.localeCompare(b.username));
  const sum=key=>rows.reduce((n,row)=>n+row[key],0);
  const maxMissing=rows[0]?.missing||0;
  const leaders=rows.filter(row=>maxMissing>0&&row.missing===maxMissing);
  const studentIds=new Set(students.map(s=>String(s.User_Key))),assignmentIds=new Set(assignments.map(a=>String(a.Activity_Key)));
  const activityPairs=new Set(records.filter(r=>r.Submission_Status==='submitted'&&studentIds.has(String(r.User_Key))&&assignmentIds.has(String(r.Activity_Key))&&(!start||Number(r.Submit_Date_Key)>=start&&Number(r.Submit_Date_Key)<end)).map(r=>`${r.User_Key}:${r.Activity_Key}`));
  const dueKeys=assignments.map(a=>Number(a.Due_Date_Key)).filter(Boolean).sort((a,b)=>a-b);
  const epoch=key=>key?Date.parse(`${String(key).slice(0,4)}-${String(key).slice(4,6)}-${String(key).slice(6,8)}T00:00:00+07:00`)/1000:null;
  const snapshot={rosterSource:'warehouse_active_enrolment',enrolled:students.length,assignments:selected.length,totalAssignments:assignments.length,firstDue:epoch(dueKeys[0]),lastDue:epoch(dueKeys.at(-1)),submitted:sum('submitted'),missing:sum('missing'),overdueMissing:sum('overdue'),late:sum('late'),activityInPeriod:activityPairs.size,
    chart:selected.slice(0,8).map(a=>({label:a.Activity_Name,submitted:students.filter(s=>matrix.get(`${s.User_Key}:${a.Activity_Key}`)?.submitted).length,missing:students.filter(s=>!matrix.get(`${s.User_Key}:${a.Activity_Key}`)?.submitted).length})),
    studentBreakdown:{studentsWithMissing:rows.filter(r=>r.missing>0).length,highestMissing:maxMissing,tiedLeaders:leaders.length,draftPairs:sum('draft'),available:students.length>0},
    studentTable:{title:'Chưa ghi nhận nộp theo sinh viên · Xếp giảm dần',columns:['Sinh viên','Mã sinh viên','Số bài','Đã nộp','Chưa ghi nhận','Bản nháp'],rows:rows.filter(r=>r.missing>0).slice(0,50).map(r=>[r.name,r.username,r.expected,r.submitted,r.missing,r.draft])}};
  return {snapshot,rows,leaders};
}

export async function readStudentAssignmentStats(teacher,course,period){
  if(!await checkTeacherCoursePermission(Number(teacher.moodleUserId),Number(course.Moodle_Course_ID)))throw Object.assign(new Error('Không được phân công môn học.'),{status:403});
  const [[students],[assignments],[records]]=await Promise.all([
    pool.query("SELECT DISTINCT u.User_Key,u.Full_Name,u.Username FROM Fact_Enrolment e JOIN Dim_User u ON u.User_Key=e.User_Key WHERE e.Course_Key=? AND e.Status='Active'",[course.Course_Key]),
    pool.query("SELECT Activity_Key,Activity_Name,Due_Date_Key FROM Dim_Activity WHERE Course_Key=? AND Activity_Type IN ('assign','assignment') AND Is_Visible=1 ORDER BY Due_Date_Key,Activity_Key",[course.Course_Key]),
    pool.query('SELECT User_Key,Activity_Key,Submission_Status,Submit_Date_Key,Is_Submitted_On_Time FROM Fact_Assignment_Submission WHERE Course_Key=?',[course.Course_Key]),
  ]);
  return buildStudentAssignmentStats(students,assignments,records,period);
}
