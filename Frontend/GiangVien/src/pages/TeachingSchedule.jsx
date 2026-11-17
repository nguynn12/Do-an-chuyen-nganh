import { useEffect, useMemo, useState } from 'react';
import { Search, Download, ArrowUpRight, CalendarDays, BookOpen } from 'lucide-react';
import { SCHEDULE_TYPES, getScheduleTypeLabel } from '../config/scheduleTypes';
import { buildScheduleIcs } from '../utils/scheduleExport';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SchedulePanel from '../components/overview/SchedulePanel';
import { getTeacher, getTeacherScheduleApi } from '../services/teacherApi';
import { getTeacherSession } from '../services/authService';
import '../styles/TeacherOverview.css';
import '../styles/TeachingSchedule.css';

export default function TeachingSchedule() {
  const teacherId = getTeacherSession()?.teacherId;
  const [teacher, setTeacher] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [focusRequest, setFocusRequest] = useState(null);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const filtered = useMemo(() => schedule.filter(event =>
    (typeFilter === 'ALL' || event.type === typeFilter) &&
    `${event.title} ${event.description || ''} ${event.location || ''} ${getScheduleTypeLabel(event.type)}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN'))
  ), [schedule, search, typeFilter]);
  const upcoming = filtered.filter(event => event.date >= today).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const exportCalendar = () => {
    const url = URL.createObjectURL(new Blob([buildScheduleIcs(filtered)], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'lich-giang-day.ics'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        if (!teacherId) throw new Error('Vui lòng đăng nhập lại để xem lịch giảng dạy.');
        const [info, events] = await Promise.all([
          getTeacher(teacherId), getTeacherScheduleApi(teacherId),
        ]);
        if (cancelled) return;
        setTeacher({ id: info.Moodle_User_ID, name: info.Full_Name, fullName: info.Full_Name,
          email: info.Email, role: info.Primary_Role, initials: 'GV' });
        setSchedule(events || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Không thể tải lịch.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [teacherId, reload]);

  return <div className="app"><Header teacher={teacher} /><Sidebar />
    <main className="teaching-schedule-page">
      <header className="teaching-schedule-heading">
        <div className="teacher-shared-hero-icon"><CalendarDays size={27}/></div>
        <div className="teacher-shared-hero-text">
        <div className="teacher-shared-breadcrumb"><BookOpen size={13}/><span>Quản lý giảng dạy</span><span>/</span><strong>Lịch giảng dạy</strong></div>
        <span className="teacher-shared-kicker">DLU LMS ANALYTICS</span><h1>Lịch giảng dạy</h1>
        <p>Sắp xếp công việc, theo dõi buổi dạy và dành thời gian cho những điều quan trọng.</p>
        </div>
      </header>
      {loading ? <div className="teaching-schedule-state" role="status">Đang tải lịch giảng dạy…</div>
        : error ? <div className="teaching-schedule-state" role="alert"><p>{error}</p><button type="button" onClick={() => setReload(n => n + 1)}>Thử lại</button></div>
          : <>
            <div className="schedule-tools">
              <label className="schedule-search"><Search size={17}/><input aria-label="Tìm lịch" placeholder="Tìm tên lịch, nội dung…" value={search} onChange={e => setSearch(e.target.value)}/></label>
              <select aria-label="Lọc loại lịch" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="ALL">Tất cả loại lịch</option>{SCHEDULE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              {(search || typeFilter !== 'ALL') && <button onClick={() => { setSearch(''); setTypeFilter('ALL'); }}>Xóa bộ lọc</button>}
              <button disabled={!filtered.length} onClick={exportCalendar}><Download size={16}/>Xuất lịch .ics</button>
              <span role="status">{filtered.length} sự kiện</span>
            </div>
            <SchedulePanel embedded open schedule={schedule} filteredSchedule={filtered} focusRequest={focusRequest} onScheduleChange={setSchedule} />
            <section className="schedule-upcoming"><div className="schedule-upcoming-heading"><div><span>CHỦ ĐỘNG MỖI NGÀY</span><h2>Lịch sắp tới</h2></div><p>Theo bộ lọc đang chọn · Tối đa 8 sự kiện</p></div>
              {!upcoming.length ? <p className="schedule-agenda-empty">Chưa có lịch sắp tới phù hợp. Chọn một ngày trên lịch để tạo sự kiện mới.</p>
                : <div className="schedule-agenda-list">{upcoming.slice(0, 8).map((event, index) => <button key={`${event.type}-${event.id}-${index}`} onClick={() => { setFocusRequest({ date: event.date }); document.querySelector('.schedule-panel-embedded')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="schedule-agenda-date"><strong>{event.date.slice(8)}</strong><small>Tháng {Number(event.date.slice(5, 7))}/{event.date.slice(0, 4)}</small></span><span className="schedule-agenda-info"><strong>{event.title}</strong><small>{getScheduleTypeLabel(event.type)} · {event.time?.slice(0, 5) || 'Cả ngày'}</small></span><ArrowUpRight size={17}/></button>)}</div>}
            </section>
          </>}
    </main>
  </div>;
}
