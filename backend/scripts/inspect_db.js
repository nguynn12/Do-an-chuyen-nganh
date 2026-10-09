import pool from "../src/config/database.js";

async function inspect() {
  try {
    const [teacherCourses] = await pool.query(`
      SELECT
        u.id AS teacher_id,
        u.username,
        u.firstname,
        u.lastname,
        c.id AS course_id,
        c.fullname,
        c.shortname
      FROM lms_moodle_source.mdl_role_assignments ra
      JOIN lms_moodle_source.mdl_role r ON r.id = ra.roleid
      JOIN lms_moodle_source.mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      JOIN lms_moodle_source.mdl_course c ON c.id = ctx.instanceid
      JOIN lms_moodle_source.mdl_user u ON u.id = ra.userid
      WHERE r.shortname IN ('teacher', 'editingteacher');
    `);
    console.log('Teacher courses:', teacherCourses);

    const [enrolments] = await pool.query(`
      SELECT c.id AS course_id, c.fullname, count(distinct ue.userid) as student_count
      FROM lms_moodle_source.mdl_enrol e
      JOIN lms_moodle_source.mdl_course c ON c.id = e.courseid
      JOIN lms_moodle_source.mdl_user_enrolments ue ON ue.enrolid = e.id
      GROUP BY c.id, c.fullname;
    `);
    console.log('Enrolments by course:', enrolments);

    const [assigns] = await pool.query(`
      SELECT a.id, a.course, a.name, a.duedate, a.grade
      FROM lms_moodle_source.mdl_assign a;
    `);
    console.log('Existing mdl_assign:', assigns);

    const teacherId = 1;
    const [tRows] = await pool.query(`
      SELECT
        s.id AS submissionId,
        s.userid AS studentId,
        s.assignment AS assignmentId,
        s.status AS submissionStatus,
        s.attemptnumber AS attemptNumber,
        s.timecreated AS submitTime,
        s.timemodified AS submitModified,
        u.username AS studentUsername,
        CONCAT(u.lastname, ' ', u.firstname) AS studentName,
        u.email AS studentEmail,
        c.id AS courseId,
        c.fullname AS courseName,
        c.shortname AS courseCode,
        a.name AS activityName,
        a.grade AS maxGrade,
        a.duedate AS rawDueDate,
        g.id AS gradeId,
        g.grade AS grade,
        CASE WHEN g.id IS NOT NULL AND g.grade IS NOT NULL THEN 1 ELSE 0 END AS isGraded,
        fc.commenttext AS feedback
      FROM lms_moodle_source.mdl_assign_submission s
      JOIN lms_moodle_source.mdl_assign a ON a.id = s.assignment
      JOIN lms_moodle_source.mdl_course c ON c.id = a.course
      JOIN lms_moodle_source.mdl_user u ON u.id = s.userid
      JOIN lms_moodle_source.mdl_context ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
      JOIN lms_moodle_source.mdl_role_assignments ra ON ra.contextid = ctx.id
      JOIN lms_moodle_source.mdl_role r ON r.id = ra.roleid
      LEFT JOIN lms_moodle_source.mdl_assign_grades g ON g.assignment = s.assignment AND g.userid = s.userid AND g.attemptnumber = s.attemptnumber
      LEFT JOIN lms_moodle_source.mdl_assignfeedback_comments fc ON fc.grade = g.id
      WHERE ra.userid = ?
        AND r.shortname IN ('teacher', 'editingteacher')
        AND s.latest = 1
      ORDER BY isGraded ASC, c.fullname ASC, u.username ASC
    `, [teacherId]);
    console.log('Teacher 1 Moodle submissions count:', tRows.length, 'Sample:', tRows[0]);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspect();
