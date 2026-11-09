import pool from '../../config/database.js';

export function summarizeAttendance(rows, sessionCount) {
  const students = rows.map(row => ({ name: row.name, absent: Number(row.absent), present: Number(row.present), late: Number(row.late), excused: Number(row.excused), unmarked: Number(row.unmarked), marked: Number(row.marked) }));
  const maximum = Math.max(0, ...students.map(row => row.absent));
  const leaders = maximum ? students.filter(row => row.absent === maximum) : [];
  return { aggregate: { sessions: Number(sessionCount), studentsWithRecords: students.length, absentRecords: students.reduce((n, row) => n + row.absent, 0), highestAbsentSessions: maximum, tiedLeaders: leaders.length, unmarkedRecords: students.reduce((n, row) => n + row.unmarked, 0) },
    table: { title: maximum ? `Vắng nhiều nhất · ${maximum} buổi vắng được ghi nhận` : 'Điểm danh theo sinh viên', columns: ['Sinh viên', 'Vắng', 'Có mặt', 'Đi muộn', 'Có phép'], rows: (leaders.length ? leaders : students).slice(0, 10).map(row => [row.name, row.absent, row.present, row.late, row.excused]) } };
}

export async function readClassroomAttendance(course, period) {
  const range = period.start ? 'AND s.Session_Date >= ? AND s.Session_Date < ?' : '';
  const params = [course.Moodle_Course_ID, ...(period.start ? [period.start, period.end] : [])];
  const [[sessions], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS count FROM lms_moodle_source.mdl_local_attendance_session s WHERE s.Course_ID=? ${range}`, params),
    pool.query(`SELECT u.id, CONCAT(u.lastname,' ',u.firstname) AS name,
      SUM(a.Attendance_Status='absent') AS absent, SUM(a.Attendance_Status='present') AS present,
      SUM(a.Attendance_Status='late') AS late, SUM(a.Attendance_Status='excused') AS excused,
      SUM(a.Attendance_Status='not_marked') AS unmarked, SUM(a.Attendance_Status<>'not_marked') AS marked
      FROM lms_moodle_source.mdl_local_attendance a
      JOIN lms_moodle_source.mdl_local_attendance_session s ON s.Attendance_Session_ID=a.Attendance_Session_ID
      JOIN lms_moodle_source.mdl_user u ON u.id=a.User_ID
      JOIN Dim_User du ON du.Moodle_User_ID=u.id AND LOWER(du.Primary_Role)='student'
      WHERE s.Course_ID=? ${range}
      GROUP BY u.id,u.lastname,u.firstname ORDER BY absent DESC,u.id`, params),
  ]);
  return summarizeAttendance(rows, sessions[0].count);
}
