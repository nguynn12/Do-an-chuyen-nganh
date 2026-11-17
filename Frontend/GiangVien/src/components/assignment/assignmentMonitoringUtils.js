export const hasLmsGrade = row => row?.grade!==null && row?.grade!==undefined && Number.isFinite(Number(row.grade)) && Number(row.grade)>=0;
export function submissionTiming(row,assignment) {
  if(row?.submissionStatus!=='submitted') return 'missing';
  const due=Number(assignment.dueTime),submitted=Number(row.submitModified || row.submitTime);
  if(!due || !submitted) return 'unknown';
  return submitted>due?'late':'ontime';
}
export function buildMonitoringView(data,cohort='ALL') {
  const prefix={K45:'sv21',K46:'sv22',K47:'sv23'}[cohort];
  const students=(data.students || []).filter(s=>!prefix || s.studentUsername?.toLowerCase().startsWith(prefix));
  const ids=new Set(students.map(s=>String(s.studentId)));
  const submissions=(data.submissions || []).filter(s=>ids.has(String(s.studentId)));
  const assignments=(data.assignments || []).map(a=>{
    const records=submissions.filter(s=>String(s.assignmentId)===String(a.assignmentId));
    const submitted=records.filter(s=>s.submissionStatus==='submitted');
    return {...a,submitted:submitted.length,missing:Math.max(0,students.length-submitted.length),late:submitted.filter(s=>submissionTiming(s,a)==='late').length,
      graded:submitted.filter(hasLmsGrade).length,total:students.length,rate:students.length?submitted.length/students.length*100:null};
  });
  return {students,submissions,assignments,submitted:assignments.reduce((n,a)=>n+a.submitted,0),missing:assignments.reduce((n,a)=>n+a.missing,0),late:assignments.reduce((n,a)=>n+a.late,0),graded:assignments.reduce((n,a)=>n+a.graded,0)};
}
