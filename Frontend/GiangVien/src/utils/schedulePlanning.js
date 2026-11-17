export const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function calendarCells(cursor, view = 'month') {
  const start = new Date(cursor);
  if (view === 'month') start.setDate(1);
  start.setDate(start.getDate() - start.getDay());
  const count = view === 'week' ? 7 : Math.ceil((new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, i) => { const date = new Date(start); date.setDate(date.getDate() + i); return { date, key: dateKey(date), outside: view === 'month' && date.getMonth() !== cursor.getMonth() }; });
}
export function repeatDates(date, repeat, until) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return [];
  const dates = [date];
  if (!repeat) return dates;
  const start = new Date(`${date}T12:00:00`), end = new Date(`${until}T12:00:00`);
  if (!Number.isFinite(+end) || end < start || end - start > 366 * 86400000) return dates;
  const cursor = new Date(start);
  while (dates.length < 53) { cursor.setDate(cursor.getDate() + 7); if (cursor > end) break; dates.push(dateKey(cursor)); }
  return dates;
}
const minutes = value => { const [h, m] = value.slice(0, 5).split(':').map(Number); return h * 60 + m; };
export function findConflicts(events, form, dates, editingId) {
  if (!form.time) return [];
  const start = minutes(form.time), end = form.endTime ? minutes(form.endTime) : start + 1;
  return events.filter(event => {
    const id = event.scheduleId || String(event.id).replace(/^schedule-/, '');
    if (event.source !== 'lms' && editingId !== null && editingId !== undefined && String(id) === String(editingId)) return false;
    if (!dates.includes(event.date) || !event.time || event.source === 'lms') return false;
    const otherStart = minutes(event.time), otherEnd = event.endTime ? minutes(event.endTime) : otherStart + 1;
    return start < otherEnd && otherStart < end;
  });
}
export function safeMeetingUrl(value) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
