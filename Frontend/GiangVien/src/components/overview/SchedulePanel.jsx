import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, X, Clock3, Trash2, Pencil, Loader2, Copy, MapPin, Video, Repeat2, AlertTriangle } from 'lucide-react';
import { SCHEDULE_TYPES, getScheduleTypeLabel } from '../../config/scheduleTypes';
import { createTeacherScheduleApi, updateTeacherScheduleApi, deleteTeacherScheduleApi } from '../../services/teacherApi';
import { getTeacherSession } from '../../services/authService';
import { dateKey, calendarCells, repeatDates, findConflicts, safeMeetingUrl } from '../../utils/schedulePlanning';

const prettyDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const identity = event => event.scheduleId || (/^schedule-\d+$/.test(String(event.id)) ? Number(String(event.id).slice(9)) : event.id);
const editable = event => event.editable !== false && event.source !== 'lms';
const blankForm = date => ({ date, title: '', time: '', endTime: '', type: 'class', location: '', meetingUrl: '', description: '', repeatWeekly: false, repeatUntil: '', allowConflicts: false });

export default function SchedulePanel({ open, onClose, schedule = [], onScheduleChange, embedded = false, filteredSchedule, focusRequest }) {
  const teacherId = Number(getTeacherSession()?.teacherId);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [view, setView] = useState('month');
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const visible = filteredSchedule || schedule;
  const cells = calendarCells(cursor, view);
  const eventsFor = day => visible.filter(event => event.date === day).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const selectedEvents = eventsFor(selectedDate);
  const dates = useMemo(() => form ? repeatDates(form.date, form.repeatWeekly, form.repeatUntil) : [], [form?.date, form?.repeatWeekly, form?.repeatUntil]);
  const conflicts = useMemo(() => form ? findConflicts(schedule, form, dates, editingId) : [], [schedule, form, dates, editingId]);
  useEffect(() => {
    if (!focusRequest?.date) return;
    setCursor(new Date(`${focusRequest.date}T12:00:00`)); setSelectedDate(focusRequest.date); setForm(null); setError('');
  }, [focusRequest]);
  const change = (key, value) => { setForm(current => ({ ...current, [key]: value, ...(key !== 'allowConflicts' ? { allowConflicts: false } : {}) })); setError(''); };
  const choose = day => { if (saving) return; setSelectedDate(day); setForm(null); setError(''); setNotice(''); };
  const navigate = direction => {
    if (saving) return;
    const next = new Date(cursor);
    if (view === 'week') next.setDate(next.getDate() + direction * 7);
    else { next.setDate(1); next.setMonth(next.getMonth() + direction); }
    setCursor(next); setSelectedDate(dateKey(next)); setForm(null); setError('');
  };
  const today = () => { if (saving) return; const now = new Date(); setCursor(now); setSelectedDate(dateKey(now)); setForm(null); setError(''); };
  const create = () => { setEditingId(null); setForm(blankForm(selectedDate)); setError(''); setNotice(''); };
  const edit = (event, duplicate = false) => {
    setEditingId(duplicate ? null : identity(event));
    setForm({ ...blankForm(event.date), title: event.title || '', time: event.time?.slice(0, 5) || '', endTime: event.endTime || '', type: event.type || 'class', location: event.location || '', meetingUrl: event.meetingUrl || '', description: event.description || '' });
    setError(''); setNotice(duplicate ? 'Bản sao chưa lưu. Chọn ngày và chỉnh nội dung trước khi lưu.' : '');
  };
  const submit = async event => {
    event.preventDefault(); setError('');
    if (!teacherId) return setError('Vui lòng đăng nhập lại.');
    if (conflicts.length && !form.allowConflicts) return setError('Lịch đang trùng giờ. Điều chỉnh thời gian hoặc xác nhận cho phép trùng bên dưới.');
    try {
      setSaving(true);
      if (editingId) {
        const updated = await updateTeacherScheduleApi(teacherId, editingId, form);
        onScheduleChange?.(schedule.map(item => editable(item) && String(identity(item)) === String(editingId) ? updated : item));
        setNotice('Đã cập nhật buổi được chọn.');
      } else {
        const created = await createTeacherScheduleApi(teacherId, form);
        onScheduleChange?.([...schedule, ...created]);
        setNotice(`Đã tạo ${created.length} buổi${created.length > 1 ? ' trong chuỗi lặp hằng tuần' : ''}.`);
      }
      setSelectedDate(form.date); setCursor(new Date(`${form.date}T12:00:00`)); setForm(null); setEditingId(null);
    } catch (e) { setError(e.message || 'Không thể lưu lịch.'); }
    finally { setSaving(false); }
  };
  const remove = async item => {
    if (!window.confirm('Xóa buổi được chọn? Các buổi khác trong chuỗi lặp vẫn được giữ lại.')) return;
    try {
      setDeletingId(identity(item)); setError('');
      await deleteTeacherScheduleApi(teacherId, identity(item));
      onScheduleChange?.(schedule.filter(event => !(editable(event) && String(identity(event)) === String(identity(item)))));
      if (String(editingId) === String(identity(item))) { setForm(null); setEditingId(null); }
      setNotice('Đã xóa buổi được chọn.');
    } catch (e) { setError(e.message || 'Không thể xóa lịch.'); }
    finally { setDeletingId(null); }
  };
  if (!open) return null;
  return <div className={embedded ? 'schedule-panel-embedded' : 'schedule-panel-overlay'} onMouseDown={embedded ? undefined : onClose}>
    <aside className="schedule-panel" onMouseDown={event => event.stopPropagation()}>
      <div className="schedule-panel-header"><div><span>QUẢN LÝ LỊCH</span><h2>Lịch giảng viên</h2></div>{!embedded && <button className="schedule-panel-close" title="Đóng" onClick={onClose}><X size={19}/></button>}</div>
      <section className="schedule-panel-calendar">
        <div className="schedule-calendar-nav"><strong>{view === 'month' ? `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}` : `${prettyDate(cells[0].key)} – ${prettyDate(cells[6].key)}`}</strong><div><button type="button" className="schedule-today-button" onClick={today} disabled={saving}>Hôm nay</button><button title="Kỳ trước" aria-label={view === 'month' ? 'Tháng trước' : 'Tuần trước'} onClick={() => navigate(-1)} disabled={saving}>‹</button><button title="Kỳ sau" aria-label={view === 'month' ? 'Tháng sau' : 'Tuần sau'} onClick={() => navigate(1)} disabled={saving}>›</button></div></div>
        <div className="schedule-view-toolbar"><div role="group" aria-label="Chế độ xem lịch"><button className={view === 'month' ? 'active' : ''} aria-pressed={view === 'month'} onClick={() => { setCursor(new Date(`${selectedDate}T12:00:00`)); setView('month'); if (!form) setNotice(''); }}>Tháng</button><button className={view === 'week' ? 'active' : ''} aria-pressed={view === 'week'} onClick={() => { setCursor(new Date(`${selectedDate}T12:00:00`)); setView('week'); if (!form) setNotice(''); }}>Tuần</button></div><span>Giờ Việt Nam · GMT+7</span></div>
        <div className="schedule-week">{['CN','T2','T3','T4','T5','T6','T7'].map(day => <span key={day}>{day}</span>)}</div>
        <div className={`schedule-days ${view === 'week' ? 'schedule-week-view' : ''}`}>
          {cells.map(cell => { const dayEvents = eventsFor(cell.key); return <button type="button" key={cell.key} disabled={saving} aria-label={`${prettyDate(cell.key)}, ${dayEvents.length} sự kiện`} aria-current={cell.key === dateKey(new Date()) ? 'date' : undefined} aria-pressed={cell.key === selectedDate} className={`schedule-day ${cell.outside ? 'outside' : ''} ${cell.key === selectedDate ? 'selected' : ''} ${dayEvents.length ? 'has-event' : ''}`} onClick={() => choose(cell.key)}>
            <span>{cell.date.getDate()}</span><div className="schedule-day-previews">{dayEvents.slice(0, view === 'week' ? 8 : 2).map((item, index) => <span key={`${item.id}-${index}`} title={item.title} className={`schedule-day-preview event-${item.type}`}>{item.time ? `${item.time.slice(0, 5)} ` : ''}{item.title}</span>)}{dayEvents.length > (view === 'week' ? 8 : 2) && <small>+{dayEvents.length - (view === 'week' ? 8 : 2)} lịch khác</small>}</div>
          </button>; })}
        </div>
        <details className="schedule-type-key"><summary>Màu của 13 loại lịch</summary><div className="schedule-legend">{SCHEDULE_TYPES.map(item => <span key={item.value}><i className={`legend-dot ${item.value}`}/>{item.label}</span>)}</div></details>
      </section>
      <section className="schedule-detail">
        <div className="schedule-detail-header"><div><span>LỊCH TRONG NGÀY</span><h3>{prettyDate(selectedDate)}</h3></div><button onClick={create} disabled={saving}><Plus size={15}/>Tạo lịch</button></div>
        {notice && <p className="schedule-success" role="status">{notice}</p>}
        {!selectedEvents.length && <div className="schedule-no-event"><CalendarDays size={25}/><p>Chưa có lịch phù hợp trong ngày này.</p></div>}
        <div className="schedule-event-list">{selectedEvents.map((item, index) => <article className={`schedule-event event-${item.type}`} key={`${item.id}-${index}`}>
          <div className="schedule-event-time"><Clock3 size={14}/>{item.time?.slice(0, 5) || 'Cả ngày'}{item.endTime ? ` – ${item.endTime}` : ''}</div>
          <div className="schedule-event-info"><strong>{item.title}</strong><span>{getScheduleTypeLabel(item.type)}{item.seriesId ? ' · Lặp hằng tuần' : ''}{!editable(item) ? ' · Nguồn LMS' : ''}</span>
            {item.location && <p className="schedule-event-meta"><MapPin size={13}/>{item.location}</p>}
            {safeMeetingUrl(item.meetingUrl) && <a className="schedule-online-link" href={item.meetingUrl} target="_blank" rel="noopener noreferrer"><Video size={13}/>Mở phòng học online</a>}
            {item.description && <p className="schedule-event-notes">{item.description}</p>}
          </div>
          <div className="schedule-event-actions"><button title="Nhân bản lịch" aria-label={`Nhân bản ${item.title}`} disabled={saving} onClick={() => edit(item, true)}><Copy size={14}/></button>{editable(item) && <><button title="Chỉnh sửa buổi này" aria-label={`Sửa ${item.title}`} disabled={saving} onClick={() => edit(item)}><Pencil size={14}/></button><button title="Xóa buổi này" aria-label={`Xóa ${item.title}`} disabled={saving || deletingId !== null} onClick={() => remove(item)}>{deletingId === identity(item) ? <Loader2 size={14} className="schedule-spin"/> : <Trash2 size={14}/>}</button></>}</div>
        </article>)}</div>
        {form && <form className="schedule-create-form" onSubmit={submit}>
          <div className="schedule-create-title"><strong>{editingId ? 'Chỉnh sửa buổi này' : 'Tạo lịch mới'}</strong><button type="button" title="Đóng form" disabled={saving} onClick={() => { setForm(null); setError(''); setNotice(''); }}><X size={16}/></button></div>
          <fieldset disabled={saving} className="schedule-form-fields">
            <label><span>Tiêu đề *</span><input required maxLength={255} autoFocus value={form.title} onChange={e => change('title', e.target.value)} placeholder="Ví dụ: Thực hành lập trình Web"/></label>
            <label><span>Ngày *</span><input required type="date" value={form.date} onChange={e => change('date', e.target.value)}/></label>
            <div className="schedule-form-row"><label><span>Giờ bắt đầu</span><input type="time" value={form.time} onChange={e => change('time', e.target.value)}/></label><label><span>Giờ kết thúc</span><input type="time" value={form.endTime} onChange={e => change('endTime', e.target.value)}/></label></div>
            <label><span>Loại lịch</span><select value={form.type} onChange={e => change('type', e.target.value)}>{SCHEDULE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span>Phòng học / Địa điểm</span><input maxLength={255} value={form.location} onChange={e => change('location', e.target.value)} placeholder="Ví dụ: Phòng A2.04"/></label>
            <label><span>Link học online</span><input type="url" maxLength={2048} value={form.meetingUrl} onChange={e => change('meetingUrl', e.target.value)} placeholder="https://meet.google.com/…"/></label>
            <label><span>Ghi chú</span><textarea maxLength={10000} rows={3} value={form.description} onChange={e => change('description', e.target.value)} placeholder="Nội dung buổi học, tài liệu cần chuẩn bị…"/></label>
            {!editingId && <div className="schedule-repeat-box"><label className="schedule-check"><input type="checkbox" checked={form.repeatWeekly} onChange={e => change('repeatWeekly', e.target.checked)}/><span><Repeat2 size={14}/>Lặp lại hằng tuần</span></label>{form.repeatWeekly && <><label><span>Lặp đến hết ngày *</span><input type="date" required min={form.date} value={form.repeatUntil} onChange={e => change('repeatUntil', e.target.value)}/></label><p>{dates.length > 1 ? `Sẽ tạo ${dates.length} buổi, cùng thứ và giờ. Mỗi buổi có thể sửa/xóa riêng.` : 'Chọn ngày kết thúc cách ngày đầu ít nhất 7 ngày, tối đa một năm.'}</p></>}</div>}
            {conflicts.length > 0 && <div className="schedule-conflict-warning" role="status"><strong><AlertTriangle size={15}/>Có {conflicts.length} lịch trùng giờ</strong><ul>{conflicts.slice(0, 3).map((item, i) => <li key={i}>{item.title} · {prettyDate(item.date)} · {item.time?.slice(0, 5)}</li>)}</ul><label className="schedule-check"><input type="checkbox" checked={form.allowConflicts} onChange={e => change('allowConflicts', e.target.checked)}/><span>Tôi vẫn muốn lưu lịch trùng giờ</span></label></div>}
            <small className="schedule-form-hint">Không nhập giờ: sự kiện cả ngày. Lịch có giờ bắt đầu dùng chung hệ thống email nhắc lịch hiện có.</small>
          </fieldset>
          {error && <p className="schedule-form-error" role="alert">{error}</p>}
          <div className="schedule-create-actions"><button type="button" disabled={saving} onClick={() => { setForm(null); setError(''); setNotice(''); }}>Hủy</button><button type="submit" disabled={saving}>{saving ? <><Loader2 size={14} className="schedule-spin"/>Đang lưu…</> : editingId ? 'Lưu thay đổi' : form.repeatWeekly ? `Tạo ${dates.length} buổi` : 'Lưu lịch'}</button></div>
        </form>}
        {!form && error && <p className="schedule-form-error" role="alert">{error}</p>}
      </section>
    </aside>
  </div>;
}
