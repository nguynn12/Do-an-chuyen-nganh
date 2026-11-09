import pool from '../../config/database.js';
import { loadTeacherLearningAlerts } from './teacherController.js';
import { storeAlertState, getAssignedCourses, insertClassBroadcast } from '../services/learningAlertStateService.js';

export async function updateLearningAlert(req, res) {
  try {
    if (req.method !== 'DELETE' && typeof req.body?.read !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Trạng thái đã đọc không hợp lệ.' });
    }
    const alerts = await loadTeacherLearningAlerts(req.params.teacherId);
    const ids = req.params.alertId ? [req.params.alertId] : alerts.map(alert => String(alert.id));
    if (req.params.alertId && !alerts.some(alert => String(alert.id) === req.params.alertId)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }
    await storeAlertState(req.teacher.userKey, ids, { read: req.body?.read, deleted: req.method === 'DELETE' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Lỗi lưu trạng thái thông báo:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu trạng thái thông báo.' });
  }
}

export async function broadcastClassNotification(req, res) {
  let connection;
  try {
    const { title, desc, courseId = null, type = 'course' } = req.body;
    if (!['course','risk','deadline','support','system'].includes(type) || typeof title !== 'string' || !title.trim() || title.trim().length > 255 ||
        typeof desc !== 'string' || !desc.trim() || desc.trim().length > 10000 ||
        (courseId !== null && (!Number.isSafeInteger(Number(courseId)) || Number(courseId) <= 0))) {
      return res.status(400).json({ success: false, message: 'Nhập tiêu đề (tối đa 255 ký tự), nội dung (tối đa 10.000 ký tự) và lớp hợp lệ.' });
    }
    const assigned = await getAssignedCourses(req.teacher.moodleUserId);
    const courses = courseId === null ? assigned : assigned.filter(course => Number(course.Moodle_Course_ID) === Number(courseId));
    if (!courses.length) return res.status(403).json({ success: false, message: 'Bạn không phụ trách lớp đã chọn.' });
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const recipientCount = await insertClassBroadcast(connection, req.teacher, courses, { title: title.trim(), desc: desc.trim(), type });
    await connection.commit();
    return res.status(201).json({ success: true, recipientCount });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Lỗi gửi thông báo lớp:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể gửi thông báo lớp.' });
  } finally { connection?.release(); }
}

export async function getTeacherActivity(req, res) {
  try {
    const courses = await getAssignedCourses(req.teacher.moodleUserId);
    const keys = courses.map(course => course.Course_Key);
    if (!keys.length) return res.json({ success: true, data: { daily: [], activeStudents: 0, totalStudents: 0 } });
    const [daily] = await pool.query(`SELECT DATE_FORMAT(d.Full_Date, '%Y-%m-%d') AS date,
      COUNT(DISTINCT f.User_Key) AS activeStudents, ROUND(SUM(f.Time_Spent_Seconds) / 3600, 2) AS hours
      FROM Fact_Daily_Engagement f JOIN Dim_Date d ON d.Date_Key = f.Date_Key
      JOIN Dim_User u ON u.User_Key = f.User_Key AND LOWER(u.Primary_Role) = 'student'
      WHERE f.Course_Key IN (?) AND d.Full_Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
        AND f.Time_Spent_Seconds > 0 GROUP BY d.Full_Date ORDER BY d.Full_Date`, [keys]);
    const [[counts]] = await pool.query(`SELECT COUNT(DISTINCT fe.User_Key) AS totalStudents,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM Fact_Daily_Engagement f
        JOIN Dim_Date d ON d.Date_Key = f.Date_Key WHERE f.User_Key = fe.User_Key AND f.Course_Key IN (?)
        AND d.Full_Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE() AND f.Time_Spent_Seconds > 0)
        THEN fe.User_Key END) AS activeStudents
      FROM Fact_Enrolment fe JOIN Dim_User u ON u.User_Key = fe.User_Key
      WHERE fe.Course_Key IN (?) AND fe.Status = 'Active' AND LOWER(u.Primary_Role) = 'student'`, [keys, keys]);
    return res.json({ success: true, data: { daily, activeStudents: Number(counts.activeStudents), totalStudents: Number(counts.totalStudents) } });
  } catch (error) {
    console.error('Lỗi tải hoạt động:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải thống kê hoạt động.' });
  }
}
