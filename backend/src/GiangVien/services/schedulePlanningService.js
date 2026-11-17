import { randomUUID } from 'node:crypto';
import pool from '../../config/database.js';

const TYPES = new Set(['class', 'makeup', 'practice', 'exam', 'invigilation', 'grading', 'deadline', 'meeting', 'consultation', 'seminar', 'research', 'personal', 'other']);
function invalid(message, status = 400) { return Object.assign(new Error(message), { status }); }
const dateKey = date => date.toISOString().slice(0, 10);
export function validateSchedule(input) {
  const date = String(input.date || '');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+parsed) || dateKey(parsed) !== date) throw invalid('Ngày không hợp lệ.');
  const title = String(input.title || '').trim();
  if (!title || title.length > 255) throw invalid('Tiêu đề cần có từ 1 đến 255 ký tự.');
  const time = input.time ? String(input.time) : '';
  const endTime = input.endTime ? String(input.endTime) : '';
  const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if ((time && !validTime(time)) || (endTime && !validTime(endTime))) throw invalid('Giờ không hợp lệ.');
  if (endTime && (!time || endTime <= time)) throw invalid('Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
  const type = input.type || 'class';
  if (!TYPES.has(type)) throw invalid('Loại lịch không hợp lệ.');
  const location = String(input.location || '').trim();
  const meetingUrl = String(input.meetingUrl || '').trim();
  const description = String(input.description || '').trim();
  if (location.length > 255 || meetingUrl.length > 2048 || description.length > 10000) throw invalid('Địa điểm, đường dẫn hoặc ghi chú quá dài.');
  if (meetingUrl) {
    let url;
    try { url = new URL(meetingUrl); } catch { throw invalid('Link học online phải là URL hợp lệ.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw invalid('Link học online phải bắt đầu bằng http:// hoặc https://.');
  }
  const dates = [date];
  if (input.repeatWeekly) {
    const until = String(input.repeatUntil || '');
    const end = new Date(`${until}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || !Number.isFinite(+end) || dateKey(end) !== until || end <= parsed || end - parsed > 366 * 86400000) throw invalid('Ngày kết thúc lặp phải sau ngày đầu và trong vòng một năm.');
    const cursor = new Date(parsed);
    while (true) { cursor.setUTCDate(cursor.getUTCDate() + 7); if (cursor > end) break; dates.push(dateKey(cursor)); }
    if (dates.length < 2) throw invalid('Chọn ngày kết thúc cách ngày đầu ít nhất 7 ngày.');
  }
  return { date, dates, time, endTime, title, type, location, meetingUrl, description };
}

const minute = time => { const [h, m] = String(time).split(':').map(Number); return h * 60 + m; };
export function overlaps(a, b) {
  if (!a.time || !b.time) return false;
  const startA = minute(a.time), startB = minute(b.time);
  const endA = a.endTime ? minute(a.endTime) : startA + 1;
  const endB = b.endTime ? minute(b.endTime) : startB + 1;
  return startA < endB && startB < endA;
}
export function normalizePlannedSchedule(row) {
  return { id: `schedule-${row.Schedule_ID}`, scheduleId: row.Schedule_ID, source: 'teacher', editable: true,
    date: row.Event_Date, time: row.Event_Time?.slice(0, 5) || '', endTime: row.End_Time?.slice(0, 5) || '',
    title: row.Title, type: row.Event_Type, description: row.Description || '', location: row.Location || '',
    meetingUrl: row.Meeting_Url || '', seriesId: row.Series_ID || null };
}

export async function savePlannedSchedule(teacherId, input, scheduleId = null) {
  const data = validateSchedule(input);
  if (scheduleId && input.repeatWeekly) throw invalid('Chỉnh sửa áp dụng cho một buổi. Tạo lịch mới để lập chuỗi lặp.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize saves for this teacher, including concurrent recurring submissions.
    const [teachers] = await connection.query("SELECT User_Key FROM Dim_User WHERE Moodle_User_ID = ? AND Primary_Role = 'Teacher' AND Is_Active = 1 FOR UPDATE", [teacherId]);
    if (!teachers.length) throw invalid('Không tìm thấy giảng viên.', 404);
    const userKey = teachers[0].User_Key;
    if (scheduleId) {
      const [owned] = await connection.query('SELECT Schedule_ID FROM Teacher_Schedule WHERE Schedule_ID = ? AND Teacher_User_Key = ?', [scheduleId, userKey]);
      if (!owned.length) throw invalid('Không tìm thấy lịch thuộc giảng viên.', 404);
    }
    const [existing] = await connection.query("SELECT Schedule_ID, DATE_FORMAT(Event_Date, '%Y-%m-%d') AS date, TIME_FORMAT(Event_Time, '%H:%i') AS time, TIME_FORMAT(End_Time, '%H:%i') AS endTime, Title AS title FROM Teacher_Schedule WHERE Teacher_User_Key = ? AND Event_Date BETWEEN ? AND ?", [userKey, data.dates[0], data.dates.at(-1)]);
    const conflicts = existing.filter(event => Number(event.Schedule_ID) !== Number(scheduleId) && data.dates.includes(event.date) && overlaps(data, event));
    if (conflicts.length && input.allowConflicts !== true) throw invalid(`Trùng giờ với ${conflicts.slice(0, 3).map(e => `${e.title} (${e.date}, ${e.time})`).join('; ')}. Chọn cho phép trùng giờ nếu bạn vẫn muốn lưu.`, 409);
    const ids = [];
    if (scheduleId) {
      await connection.query('UPDATE Teacher_Schedule SET Event_Date=?, Event_Time=?, End_Time=?, Title=?, Event_Type=?, Description=?, Location=?, Meeting_Url=? WHERE Schedule_ID=? AND Teacher_User_Key=?', [data.date, data.time || null, data.endTime || null, data.title, data.type, data.description || null, data.location || null, data.meetingUrl || null, scheduleId, userKey]);
      ids.push(scheduleId);
    } else {
      const seriesId = data.dates.length > 1 ? randomUUID() : null;
      for (const date of data.dates) {
        const [result] = await connection.query('INSERT INTO Teacher_Schedule (Teacher_User_Key, Event_Date, Event_Time, End_Time, Title, Event_Type, Description, Location, Meeting_Url, Series_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [userKey, date, data.time || null, data.endTime || null, data.title, data.type, data.description || null, data.location || null, data.meetingUrl || null, seriesId]);
        ids.push(result.insertId);
      }
    }
    const [rows] = await connection.query("SELECT *, DATE_FORMAT(Event_Date, '%Y-%m-%d') AS Event_Date FROM Teacher_Schedule WHERE Schedule_ID IN (?) ORDER BY Event_Date", [ids]);
    await connection.commit();
    return rows.map(normalizePlannedSchedule);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
