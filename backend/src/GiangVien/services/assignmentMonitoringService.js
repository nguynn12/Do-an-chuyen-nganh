import pool from '../../config/database.js';
import {checkTeacherCoursePermission,getGradingSubmissions} from './assignmentService.js';

// Monitoring only. All source operations are SELECT; no grade/campaign writes.
export async function getAssignmentMonitoring(teacherId,courseId) {
  if(!Number.isInteger(courseId) || courseId<=0) throw Object.assign(new Error('Môn học không hợp lệ.'),{status:400});
  if(!await checkTeacherCoursePermission(teacherId,courseId)) throw Object.assign(new Error('Bạn không được phân công giảng dạy môn học này.'),{status:403});
  const [[assignments],[roleStudents],result]=await Promise.all([
    pool.query(`SELECT id AS assignmentId,name AS activityName,course AS courseId,duedate AS dueTime,grade AS maxGrade FROM lms_moodle_source.mdl_assign WHERE course=? ORDER BY duedate=0,duedate,name`,[courseId]),
    pool.query(`SELECT DISTINCT u.id AS studentId,u.username AS studentUsername,CONCAT(u.lastname,' ',u.firstname) AS studentName
      FROM lms_moodle_source.mdl_user u
      JOIN lms_moodle_source.mdl_user_enrolments ue ON ue.userid=u.id
      JOIN lms_moodle_source.mdl_enrol e ON e.id=ue.enrolid AND e.courseid=? AND e.status=0
      JOIN lms_moodle_source.mdl_context ctx ON ctx.instanceid=e.courseid AND ctx.contextlevel=50
      JOIN lms_moodle_source.mdl_role_assignments ra ON ra.contextid=ctx.id AND ra.userid=u.id
      JOIN lms_moodle_source.mdl_role r ON r.id=ra.roleid AND r.shortname='student'
      WHERE u.deleted=0 AND u.suspended=0 AND (ue.timeend=0 OR ue.timeend>UNIX_TIMESTAMP()) AND ue.timestart<=UNIX_TIMESTAMP()
      ORDER BY u.username`,[courseId]),
    getGradingSubmissions(teacherId,{courseId}),
  ]);
  let students=roleStudents;
  let rosterSource='course_student_roles';
  // Reconcile incomplete local role snapshots using explicit student identities,
  // never infer students from all enrollments or submission authors alone.
  if(!students.length) {
    const [reconciled]=await pool.query(`SELECT DISTINCT u.id AS studentId,u.username AS studentUsername,CONCAT(u.lastname,' ',u.firstname) AS studentName
      FROM lms_moodle_source.mdl_user u
      JOIN lms_moodle_source.mdl_user_enrolments ue ON ue.userid=u.id
      JOIN lms_moodle_source.mdl_enrol e ON e.id=ue.enrolid AND e.courseid=? AND e.status=0
      JOIN Dim_User du ON du.Moodle_User_ID=u.id AND LOWER(du.Primary_Role)='student' AND du.Is_Active=1
      WHERE u.deleted=0 AND u.suspended=0 AND (ue.timeend=0 OR ue.timeend>UNIX_TIMESTAMP()) AND ue.timestart<=UNIX_TIMESTAMP()
      AND NOT EXISTS (SELECT 1 FROM lms_moodle_source.mdl_role_assignments ra
        JOIN lms_moodle_source.mdl_context ctx ON ctx.id=ra.contextid AND ctx.contextlevel=50 AND ctx.instanceid=e.courseid
        JOIN lms_moodle_source.mdl_role r ON r.id=ra.roleid
        WHERE ra.userid=u.id AND r.shortname IN ('teacher','editingteacher','manager'))
      ORDER BY u.username`,[courseId]);
    if(reconciled.length) { students=reconciled; rosterSource='source_enrolment_with_warehouse_student_role'; }
  }
  const allowed=new Set(students.map(s=>String(s.studentId)));
  const submissions=Array.from(new Map(result.data.filter(s=>allowed.has(String(s.studentId))).map(s=>[`${s.assignmentId}:${s.studentId}`,s])).values());
  return {assignments,students,submissions,rosterSource,readAt:new Date().toISOString(),source:'Moodle source database (local synchronization)',readOnly:true};
}
