import pool from '../../config/database.js';

let schemaReady;
export function ensureAlertStateSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS App_Learning_Alert_State (
      User_Key INT NOT NULL, Alert_ID VARCHAR(100) NOT NULL,
      Is_Read TINYINT(1) NOT NULL DEFAULT 0, Is_Deleted TINYINT(1) NOT NULL DEFAULT 0,
      Updated_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (User_Key, Alert_ID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

export async function applyAlertState(userKey, alerts) {
  await ensureAlertStateSchema();
  const [rows] = await pool.query('SELECT * FROM App_Learning_Alert_State WHERE User_Key = ?', [userKey]);
  const state = new Map(rows.map(row => [row.Alert_ID, row]));
  return alerts.filter(alert => !state.get(String(alert.id))?.Is_Deleted)
    .map(alert => ({ ...alert, unread: state.has(String(alert.id)) ? !state.get(String(alert.id)).Is_Read : alert.unread }));
}

export async function storeAlertState(userKey, ids, { read, deleted = false }, executor = pool) {
  if (!ids.length) return;
  await executor.query(`INSERT INTO App_Learning_Alert_State (User_Key, Alert_ID, Is_Read, Is_Deleted)
    VALUES ? ON DUPLICATE KEY UPDATE Is_Read = VALUES(Is_Read), Is_Deleted = VALUES(Is_Deleted)`,
  [ids.map(id => [userKey, String(id), read ? 1 : 0, deleted ? 1 : 0])]);
}

export async function getAssignedCourses(teacherId, executor = pool) {
  const [rows] = await executor.query(`SELECT DISTINCT dc.Course_Key, dc.Moodle_Course_ID, dc.Course_Name
    FROM lms_moodle_source.mdl_role_assignments ra
    JOIN lms_moodle_source.mdl_role r ON r.id = ra.roleid
    JOIN lms_moodle_source.mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
    JOIN Dim_Course dc ON dc.Moodle_Course_ID = ctx.instanceid
    WHERE ra.userid = ? AND r.shortname IN ('teacher', 'editingteacher')`, [teacherId]);
  return rows;
}

// The caller owns the transaction so a broadcast and its sender copy commit together.
export async function insertClassBroadcast(executor, teacher, courses, payload) {
  const keys = courses.map(course => course.Course_Key);
  const [recipients] = await executor.query(`SELECT DISTINCT u.User_Key FROM Fact_Enrolment fe
    JOIN Dim_User u ON u.User_Key = fe.User_Key
    WHERE fe.Course_Key IN (?) AND fe.Status = 'Active'
      AND LOWER(u.Primary_Role) = 'student' AND u.Is_Active = 1`, [keys]);
  if (!recipients.length) {
    const error = new Error('Không có sinh viên đang học để nhận thông báo.');
    error.status = 400; throw error;
  }
  const courseKey = keys.length === 1 ? keys[0] : null;
  const values = [...recipients.map(row => [row.User_Key, (payload.type || 'course').toUpperCase(), payload.title, payload.desc, courseKey, 'CLASS_BROADCAST', 0, 'SKIPPED']),
    [teacher.userKey, (payload.type || 'course').toUpperCase(), payload.title, payload.desc, courseKey, 'CLASS_BROADCAST', 1, 'SKIPPED']];
  await executor.query(`INSERT INTO fact_notification
    (recipient_user_id, notification_type, title, message, course_id, source_system, is_read, email_status)
    VALUES ?`, [values]);
  return recipients.length;
}
