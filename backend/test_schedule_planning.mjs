import assert from 'node:assert/strict';
import pool from './src/config/database.js';
import { validateSchedule, overlaps, savePlannedSchedule } from './src/GiangVien/services/schedulePlanningService.js';
import { getTeacherCalendar } from './src/GiangVien/services/calendarService.js';
import { calendarCells, repeatDates, findConflicts } from '../Frontend/GiangVien/src/utils/schedulePlanning.js';
import { buildScheduleIcs } from '../Frontend/GiangVien/src/utils/scheduleExport.js';

const base = { date: '2099-01-01', time: '09:00', endTime: '10:00', title: 'Test', type: 'class' };
assert.throws(() => validateSchedule({ ...base, date: '2099-02-30' }), /Ngày/);
assert.throws(() => validateSchedule({ ...base, endTime: '08:00' }), /kết thúc/);
assert.throws(() => validateSchedule({ ...base, time: '', endTime: '10:00' }), /kết thúc/);
assert.throws(() => validateSchedule({ ...base, meetingUrl: 'javascript:alert(1)' }), /http/);
assert.throws(() => validateSchedule({ ...base, repeatWeekly: true, repeatUntil: '2101-01-01' }), /một năm/);
assert.deepEqual(validateSchedule({ ...base, repeatWeekly: true, repeatUntil: '2099-01-15' }).dates, ['2099-01-01', '2099-01-08', '2099-01-15']);
assert.deepEqual(repeatDates('2099-01-01', true, '2099-01-15'), ['2099-01-01', '2099-01-08', '2099-01-15']);
assert.equal(overlaps(base, { time: '10:00', endTime: '11:00' }), false);
assert.equal(overlaps(base, { time: '09:59', endTime: '11:00' }), true);
assert.equal(overlaps(base, { time: '' }), false);
assert.equal(calendarCells(new Date(2026, 7, 1)).length, 42);
assert.ok(calendarCells(new Date(2026, 7, 1)).some(day => day.key === '2026-08-31'));
assert.equal(calendarCells(new Date(2026, 10, 5), 'week').length, 7);
assert.equal(findConflicts([{ ...base, id: 'schedule-5', scheduleId: 5 }], base, [base.date], 5).length, 0);
const ics = buildScheduleIcs([{ ...base, id: 'test', location: 'Phòng A2', meetingUrl: 'https://example.com/room', description: 'Ghi chú '.repeat(30) }]);
assert.ok(ics.includes('DTEND;TZID=Asia/Bangkok:20990101T100000'));
assert.ok(ics.includes('LOCATION:Phòng A2'));
assert.ok(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
console.log('Validation, recurrence, conflict boundaries, calendar grid and ICS checks passed');

if (process.argv.includes('--db')) {
  const marker = `__schedule_planning_test_${Date.now()}__`;
  let teacherKey;
  try {
    const [teachers] = await pool.query("SELECT User_Key, Moodle_User_ID FROM Dim_User WHERE Primary_Role='Teacher' AND Is_Active=1 LIMIT 1");
    assert.ok(teachers.length, 'Need an active teacher');
    const teacher = teachers[0]; teacherKey = teacher.User_Key;
    const baseline = await savePlannedSchedule(teacher.Moodle_User_ID, { ...base, date: '2099-01-08', title: marker, allowConflicts: true });
    await assert.rejects(() => savePlannedSchedule(teacher.Moodle_User_ID, { ...base, title: marker, repeatWeekly: true, repeatUntil: '2099-01-15' }), error => error.status === 409);
    const [[count]] = await pool.query('SELECT COUNT(*) AS total FROM Teacher_Schedule WHERE Teacher_User_Key=? AND Title=?', [teacherKey, marker]);
    assert.equal(Number(count.total), 1, 'Conflicting recurrence must not create partial rows');
    const events = await savePlannedSchedule(teacher.Moodle_User_ID, { ...base, title: marker, location: 'Phòng thử nghiệm', meetingUrl: 'https://example.com/test', description: 'Ghi chú kiểm tra', repeatWeekly: true, repeatUntil: '2099-01-15', allowConflicts: true });
    assert.equal(events.length, 3); assert.ok(events[0].seriesId); assert.equal(new Set(events.map(e => e.seriesId)).size, 1);
    const changed = await savePlannedSchedule(teacher.Moodle_User_ID, { ...base, date: '2099-02-01', title: marker, endTime: '10:30', location: 'Phòng đã sửa', description: 'Đã cập nhật' }, events[0].scheduleId);
    assert.equal(changed[0].endTime, '10:30'); assert.equal(changed[0].location, 'Phòng đã sửa');
    const calendar = await getTeacherCalendar(teacher.Moodle_User_ID);
    const reloaded = calendar.events.filter(e => e.title === marker);
    assert.equal(reloaded.length, 4); assert.ok(reloaded.some(e => e.date === '2099-02-01' && e.location === 'Phòng đã sửa'));
    await pool.query('DELETE FROM Teacher_Schedule WHERE Schedule_ID=? AND Teacher_User_Key=? AND Title=?', [events[1].scheduleId, teacherKey, marker]);
    const [[left]] = await pool.query('SELECT COUNT(*) AS total FROM Teacher_Schedule WHERE Series_ID=?', [events[0].seriesId]);
    assert.equal(Number(left.total), 2, 'Deleting one occurrence must retain the others');
    console.log('Database: atomic recurrence, conflict rollback, edit/reload, single occurrence deletion passed');
  } finally {
    if (teacherKey) await pool.query('DELETE FROM Teacher_Schedule WHERE Teacher_User_Key=? AND Title=?', [teacherKey, marker]);
    await pool.end();
  }
} else await pool.end();
