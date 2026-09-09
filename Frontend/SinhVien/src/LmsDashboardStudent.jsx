import { useEffect, useRef, useState } from 'react';
import './LmsDashboardStudent.css';
import MainLayout from './components/MainLayout';
import {
  ChevronDown, ChevronRight, ChevronLeft,
  BookOpen, Clock, Award, Bookmark, Calendar, AlertTriangle,
  Users, FileText, Bell, Headphones,
  MoreHorizontal, CheckCircle2,
  Asterisk, FileType2, Folder, ClipboardCheck, Star, List, Grid2X2, Filter, Eye, EyeOff,
} from 'lucide-react';

// Dữ liệu tổng quan được tách khỏi phần giao diện để sau này có thể thay bằng API.
// Các chỉ số nhanh trên đầu dashboard, mỗi phần tử gồm giá trị, nhãn, icon và màu hiển thị.
const stats = [
  { value: '4 Môn học', label: 'Môn đang học', icon: BookOpen, tone: 'green' },
  { value: '2 Bài tập', label: 'Bài tập chưa nộp', icon: Clock, tone: 'amber' },
  { value: '12 Khóa', label: 'Khóa học đã hoàn thành', icon: CheckCircle2, tone: 'green' },
];

// Dữ liệu môn học dùng chung cho thẻ, danh sách, tìm kiếm, lọc và phân trang.
const COURSES_DATA = [
  { id: 1, name: 'Lập trình Game nâng cao', shortName: 'GAME47', semester: 'Học kỳ 1', progress: 75, status: 'in_progress', isStarred: true, thumbnailType: 'game', href: '#course-game', lastAccessed: 6 },
  { id: 2, name: 'Lập trình Java', shortName: 'JAVA47', semester: 'Học kỳ hè', progress: 40, status: 'in_progress', isStarred: false, thumbnailType: 'java', href: '#course-java', lastAccessed: 4 },
  { id: 3, name: 'Phát triển ứng dụng Web', shortName: 'WEB47', semester: 'Học kỳ 1', progress: 90, status: 'completed', isStarred: true, thumbnailType: 'web', href: '#course-web', lastAccessed: 5 },
  { id: 4, name: 'Cơ sở dữ liệu', shortName: 'CSDL47', semester: 'Học kỳ 1', progress: 62, status: 'in_progress', isStarred: false, thumbnailType: 'database', href: '#course-database', lastAccessed: 3 },
  { id: 5, name: 'Mạng máy tính', shortName: 'NET47', semester: 'Học kỳ 1', progress: 100, status: 'completed', isStarred: false, thumbnailType: 'network', href: '#course-network', lastAccessed: 2 },
  { id: 6, name: 'Nhập môn trí tuệ nhân tạo', shortName: 'AI47', semester: 'Học kỳ hè', progress: 0, status: 'future', isStarred: false, thumbnailType: 'ai', href: '#course-ai', lastAccessed: 1 },
];

// Danh sách tài nguyên sinh viên vừa truy cập, được phân loại để chọn icon và màu phù hợp.
const RECENT_ACTIVITIES_DATA = [
  { id: 1, title: 'BÀI THỰC HÀNH 1', course: 'Lập trình Java', type: 'pdf', icon: FileType2, href: '#activity-lab-1' },
  { id: 2, title: 'ĐỀ ÁN', course: 'Phát triển ứng dụng Web', type: 'folder', icon: Folder, href: '#activity-project' },
  { id: 3, title: 'LAB 04 - CRAFTING SYSTEM', course: 'Lập trình Game nâng cao', type: 'task', icon: ClipboardCheck, href: '#activity-lab-4' },
  { id: 4, title: 'CHƯƠNG 5 - API', course: 'Phát triển ứng dụng Web', type: 'pdf', icon: FileType2, href: '#activity-api' },
];

// Các mốc thời gian học tập sắp tới được dùng cho khu vực sự kiện.
const events = [
  { title: 'Nộp bài Lab 5 - Lập trình Game', date: '20/08/2026 (Chỉ còn 3 ngày)', icon: AlertTriangle, tone: 'urgent' },
  { title: 'Thảo luận nhóm - Phát triển Web Dev', date: '22/08/2026', icon: Users, tone: 'default' },
  { title: 'Kiểm tra giữa kỳ - Lập trình Java', date: '26/08/2026', icon: FileText, tone: 'default' },
];

// Thông báo gồm nội dung và thời điểm phát sinh.
const notifications = [
  ['Điểm Lab 4 đã được cập nhật thành công bởi GV', '2 giờ trước'],
  ['Thông báo lịch thi giáo kỳ bổ sung môn Phát triển Web', '1 ngày trước'],
  ['Tài liệu mới: Chương 6 - Lập trình Game nâng cao', '3 ngày trước'],
];

// Các liên kết tiện ích được hiển thị ở cột phụ của dashboard.
const quickLinks = [
  { title: 'Thư viện số DLU', icon: BookOpen },
  { title: 'Tra cứu lịch thi', icon: Calendar },
  { title: 'Kết quả học tập toàn khóa', icon: Award },
  { title: 'Hỗ trợ kỹ thuật (ITC)', icon: Headphones },
];

// Lưới ngày của lịch học; phần tử thứ hai xác định trạng thái màu của ngày.
const calendarDays = [
  ['26', 'muted'], ['27', 'muted'], ['28', 'muted'], ['29', 'muted'], ['30', 'muted'], ['31', 'muted'], ['1'],
  ['2'], ['3', 'green'], ['4'], ['5', 'today'], ['6'], ['7'], ['8'],
  ['9'], ['10', 'green'], ['11'], ['12', 'green'], ['13'], ['14'], ['15'],
  ['16'], ['17', 'green'], ['18'], ['19', 'green'], ['20', 'deadline'], ['21'], ['22', 'event'],
  ['23'], ['24', 'green'], ['25', 'event'], ['26', 'green'], ['27'], ['28'], ['29'],
];

// Các khối giao diện dùng chung giúp những khu vực lặp lại luôn đồng nhất và dễ mở rộng.
function SectionTitle({ icon: Icon, children, actions }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-bold text-sm text-gray-800">
        <Icon size={16} className="text-[#2E7D32]" />
        <h3>{children}</h3>
      </div>
      {actions}
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
        <span>Tiến độ học tập</span>
        <span className="font-bold text-gray-700">{progress}%</span>
      </div>
      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <div className="lms-dashboard__progress" style={{ '--progress': `${progress}%` }} />
      </div>
    </div>
  );
}

function GreetingCard({ summaryStats = stats }) {
  return <section className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-50 text-[#2E7D32] flex items-center justify-center text-xl">👋</div><div><h2 className="text-base font-bold text-gray-800">Xin chào, Trần Ngọc Bảo Phước</h2><p className="text-xs text-gray-500">Lớp: <span className="font-medium text-gray-700">CTK47B</span> | Niên khóa: <span className="font-medium text-gray-700">2023-2027</span> | Học kỳ: <span className="font-medium text-gray-700">Học kỳ 1 (2026-2027)</span></p></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">{summaryStats.map(({ value, label, icon: Icon, tone }, index) => <div key={label} className={`${tone === 'green' || index === 2 ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF3E0] text-amber-600'} rounded-xl p-3 flex items-center gap-3`}><div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center"><Icon size={16} /></div><div><p className="text-xs font-bold text-gray-800">{value}</p><p className="text-[10px] text-gray-500 font-medium">{label}</p></div></div>)}</div></section>;
}

function CourseThumbnail({ type, compact = false }) {
  return <div className={`lms-course-thumbnail lms-course-thumbnail--${type} ${compact ? 'h-16 w-24 shrink-0' : 'h-28'}`} aria-hidden="true" />;
}

function CourseCard({ course, isStarred, isRemoved, onToggleStar, onToggleRemove, onSelectCourse, viewMode = 'card' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef(null);
  const { id, name, shortName, semester, progress, thumbnailType, href } = course;

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!cardRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  if (viewMode === 'list') {
    return <div ref={cardRef} onClick={() => onSelectCourse(id)} className="relative flex cursor-pointer items-center gap-3 border-b border-gray-100 px-2 py-3 last:border-0"><CourseThumbnail type={thumbnailType} compact /><div className="min-w-0 flex-1"><a href={href} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSelectCourse(id); }} className="font-bold text-sm text-gray-800 hover:text-[#2E7D32]">{name}</a><p className="mt-1 text-[11px] text-gray-500">{shortName} · {semester} · {progress}% hoàn thành</p></div><button type="button" onClick={(event) => { event.stopPropagation(); onToggleStar(id); }} className={`p-2 ${isStarred ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`} aria-label={`${isStarred ? 'Bỏ gắn sao' : 'Gắn sao'} ${name}`}><Star size={16} fill={isStarred ? 'currentColor' : 'none'} /></button><button type="button" onClick={(event) => { event.stopPropagation(); setIsMenuOpen((open) => !open); }} className="p-2 text-gray-500 hover:text-[#2E7D32]" aria-label={`Tùy chọn ${name}`}><MoreHorizontal size={18} /></button>{isMenuOpen && <CourseContextMenu onSelectCourse={onSelectCourse} courseId={id} onToggleStar={() => onToggleStar(id)} isStarred={isStarred} isRemoved={isRemoved} onToggleRemove={() => onToggleRemove(id)} />}</div>;
  }

  return <article ref={cardRef} onClick={() => onSelectCourse(id)} className="relative cursor-pointer overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative"><CourseThumbnail type={thumbnailType} /><button type="button" onClick={(event) => { event.stopPropagation(); setIsMenuOpen((open) => !open); }} className="absolute bottom-2 right-2 rounded-md bg-white/90 p-1.5 text-gray-600 shadow hover:text-[#2E7D32]" aria-label={`Tùy chọn ${name}`} aria-expanded={isMenuOpen}><MoreHorizontal size={18} /></button>{isMenuOpen && <CourseContextMenu onSelectCourse={onSelectCourse} courseId={id} onToggleStar={() => onToggleStar(id)} isStarred={isStarred} isRemoved={isRemoved} onToggleRemove={() => onToggleRemove(id)} />}</div><div className="p-3"><div className="mb-2"><span className="rounded bg-green-50 px-2 py-1 text-[10px] font-bold text-[#2E7D32]">{semester}</span></div><a href={href} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSelectCourse(id); }} className="min-h-12 font-bold text-sm leading-snug text-gray-800 hover:text-[#2E7D32]">{name}</a><p className="mt-2 text-[10px] font-semibold text-gray-400">{shortName}</p><button type="button" onClick={(event) => { event.stopPropagation(); onToggleStar(id); }} className={`absolute right-3 top-36 p-1 ${isStarred ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`} aria-label={`${isStarred ? 'Bỏ gắn sao' : 'Gắn sao'} ${name}`}><Star size={15} fill={isStarred ? 'currentColor' : 'none'} /></button><ProgressBar progress={progress} /></div></article>;
}

function CourseContextMenu({ onToggleStar, isStarred, isRemoved, onToggleRemove }) {
  return <div className="absolute right-2 top-10 z-20 w-52 rounded-xl border border-gray-200 bg-white p-1 text-left shadow-lg" onClick={(event) => event.stopPropagation()}><button type="button" onClick={onToggleStar} className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-[#2E7D32]"><Star size={14} />{isStarred ? 'Unstar this course' : 'Star this course'}</button><button type="button" onClick={onToggleRemove} className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-[#2E7D32]">{isRemoved ? <Eye size={14} /> : <EyeOff size={14} />}{isRemoved ? 'Restore to view' : 'Remove from view'}</button></div>;
}

function RecentCourses({ courses, starredCourseIds, removedCourseIds, onToggleStar, onToggleRemove, onSelectCourse }) {
  const recentCourses = [...courses].sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, 3);
  return <section className="space-y-3"><div className="flex items-center justify-between"><SectionTitle icon={Asterisk}>Khóa học truy cập gần đây</SectionTitle><div className="flex gap-1"><button type="button" className="rounded border border-gray-200 p-1 text-gray-400 hover:text-[#2E7D32]" aria-label="Trang trước"><ChevronLeft size={16} /></button><button type="button" className="rounded border border-gray-200 p-1 text-gray-400 hover:text-[#2E7D32]" aria-label="Trang sau"><ChevronRight size={16} /></button></div></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{recentCourses.map((course) => <CourseCard key={course.id} course={course} isStarred={starredCourseIds.has(course.id)} isRemoved={removedCourseIds.has(course.id)} onToggleStar={onToggleStar} onToggleRemove={onToggleRemove} onSelectCourse={onSelectCourse} />)}</div></section>;
}

function CourseFilterBar({ filterStatus, filterLabel, isFilterOpen, onFilterToggle, onFilterChange, sortBy, setSortBy, viewMode, setViewMode, pageSize, setPageSize }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4"><div className="relative"><button type="button" onClick={onFilterToggle} className="flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#256629]" aria-expanded={isFilterOpen} aria-haspopup="menu"><Filter size={14} />{filterLabel}<ChevronDown size={14} className={isFilterOpen ? 'rotate-180' : ''} /></button>{isFilterOpen && <div className="absolute left-0 top-11 z-30 w-52 rounded-xl border border-gray-200 bg-white p-1.5 text-left shadow-lg" role="menu">{[['all', 'Tất cả'], ['in_progress', 'Đang diễn ra'], ['future', 'Sắp diễn ra'], ['past', 'Đã kết thúc'], ['starred', 'Đã gắn sao'], ['removed', 'Đã ẩn khỏi chế độ xem']].map(([value, label]) => <button key={value} type="button" onClick={() => onFilterChange(value)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs ${filterStatus === value ? 'bg-green-50 font-semibold text-[#2E7D32]' : 'text-gray-700 hover:bg-gray-50'}`} role="menuitem">{label}{filterStatus === value && <span>✓</span>}</button>)}</div>}</div><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="lms-select" aria-label="Sắp xếp khóa học"><option value="name">Tên khóa học (A-Z)</option><option value="recent">Truy cập gần nhất</option></select><div className="ml-auto flex rounded border border-gray-200 p-0.5"><button type="button" onClick={() => setViewMode('card')} className={`p-1.5 ${viewMode === 'card' ? 'bg-green-50 text-[#2E7D32]' : 'text-gray-400'}`} aria-label="Hiển thị dạng thẻ"><Grid2X2 size={15} /></button><button type="button" onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-green-50 text-[#2E7D32]' : 'text-gray-400'}`} aria-label="Hiển thị dạng danh sách"><List size={15} /></button></div><label className="flex items-center gap-2 text-[11px] text-gray-500">Mỗi trang:<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="lms-select"><option value="6">6 khóa học</option><option value="12">12 khóa học</option><option value="24">24 khóa học</option></select></label></div>;
}

function CourseOverview({ courses, searchQuery, starredCourseIds, removedCourseIds, onToggleStar, onToggleRemove, onSelectCourse }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('card');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!isFilterOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!filterRef.current?.contains(event.target)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isFilterOpen]);

  // Danh sách được tìm kiếm, lọc trạng thái, sắp xếp rồi cắt theo trang từ cùng một nguồn dữ liệu.
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = `${course.name} ${course.shortName}`.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesVisibility = filterStatus === 'removed' ? removedCourseIds.has(course.id) : !removedCourseIds.has(course.id);
    const matchesStatus = filterStatus === 'starred' ? starredCourseIds.has(course.id) : ['all', 'removed'].includes(filterStatus) || course.status === filterStatus || (filterStatus === 'past' && course.status === 'completed');
    return matchesSearch && matchesVisibility && matchesStatus;
  }).sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name, 'vi') : sortBy === 'recent' ? b.lastAccessed - a.lastAccessed : b.progress - a.progress);
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleCourses = filteredCourses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updatePageSize = (value) => { setPageSize(value); setPage(1); };
  // Chọn trạng thái mới, quay về trang đầu và đóng menu bộ lọc.
  const handleFilterChange = (value) => { setFilterStatus(value); setPage(1); setIsFilterOpen(false); };

  const filterLabels = { all: 'Tất cả', in_progress: 'Đang diễn ra', future: 'Sắp diễn ra', past: 'Đã kết thúc', starred: 'Đã gắn sao', removed: 'Đã ẩn khỏi chế độ xem' };
  return <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><SectionTitle icon={Bookmark}>Tổng quan khóa học</SectionTitle><span className="text-[11px] text-gray-400">{filteredCourses.length} khóa học</span></div><div ref={filterRef}><CourseFilterBar filterStatus={filterStatus} filterLabel={filterLabels[filterStatus]} isFilterOpen={isFilterOpen} onFilterToggle={() => setIsFilterOpen((open) => !open)} onFilterChange={handleFilterChange} sortBy={sortBy} setSortBy={(value) => { setSortBy(value); setPage(1); }} viewMode={viewMode} setViewMode={setViewMode} pageSize={pageSize} setPageSize={updatePageSize} /></div>{visibleCourses.length ? <div className={viewMode === 'card' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'divide-y divide-gray-100'}>{visibleCourses.map((course) => <CourseCard key={course.id} course={course} isStarred={starredCourseIds.has(course.id)} isRemoved={removedCourseIds.has(course.id)} onToggleStar={onToggleStar} onToggleRemove={onToggleRemove} onSelectCourse={onSelectCourse} viewMode={viewMode} />)}</div> : <p className="py-8 text-center text-sm text-gray-500">Không tìm thấy khóa học phù hợp.</p>}<div className="flex items-center justify-center gap-3 text-xs text-gray-500"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-gray-200 p-1.5 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={15} /></button><span>Trang {currentPage} / {totalPages}</span><button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-gray-200 p-1.5 disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={15} /></button></div></section>;
}

function RecentActivities() {
  return <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><SectionTitle icon={Clock}>Các mục truy cập gần đây</SectionTitle><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{RECENT_ACTIVITIES_DATA.map(({ id, title, course, type, icon: Icon, href }) => <a key={id} href={href} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-green-200 hover:bg-green-50/40"><span className={`lms-activity-icon lms-activity-icon--${type}`}><Icon size={17} /></span><span className="min-w-0"><strong className="block truncate text-xs text-gray-800">{title}</strong><small className="text-[10px] text-gray-400">{course}</small></span></a>)}</div></section>;
}

function EventsSection() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return <section className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-3"><SectionTitle icon={Calendar}>Sự kiện sắp tới</SectionTitle><div className="space-y-2.5">{events.map(({ title, date, icon: Icon, tone }) => <div key={title} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border ${tone === 'urgent' ? 'border-red-100 bg-red-50/40' : 'border-gray-200/80'}`}><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tone === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-amber-600'}`}><Icon size={16} /></div><div><p className="font-semibold text-xs text-gray-800">{title}</p><p className={`text-[11px] font-medium ${tone === 'urgent' ? 'text-red-600' : 'text-gray-500'}`}>Hạn: {date}</p></div></div><button type="button" onClick={() => setSelectedEvent((currentEvent) => currentEvent === title ? null : title)} className="border border-gray-300 bg-white px-3 py-1 rounded-md text-xs font-medium hover:bg-gray-50 transition shadow-xs">{selectedEvent === title ? 'Ẩn' : 'Chi tiết'}</button>{selectedEvent === title && <p className="basis-full border-t border-gray-100 pt-2 text-[11px] text-gray-500">Bạn có thể mở hoạt động này từ trang môn học tương ứng.</p>}</div>)}</div></section>;
}

function CalendarWidget() {
  return <section className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm"><div className="flex items-center justify-between mb-3 text-xs"><h3 className="font-bold text-gray-800">Tháng 8, 2026</h3><div className="flex gap-1 text-gray-400"><button className="w-5 h-5 border rounded flex items-center justify-center hover:bg-gray-50" aria-label="Tháng trước"><ChevronLeft size={12} /></button><button className="w-5 h-5 border rounded flex items-center justify-center hover:bg-gray-50" aria-label="Tháng sau"><ChevronRight size={12} /></button></div></div><div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400 font-semibold mb-2">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => <span key={day}>{day}</span>)}</div><div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-700">{calendarDays.map(([day, tone], index) => <span key={`${day}-${index}`} className={`p-1 ${tone === 'muted' ? 'text-gray-300' : ''} ${tone === 'green' ? 'bg-green-100 text-green-900 rounded-full' : ''} ${tone === 'today' ? 'bg-[#2E7D32] text-white rounded-full font-bold' : ''} ${tone === 'deadline' ? 'bg-amber-500 text-white rounded-full font-bold' : ''} ${tone === 'event' ? 'bg-amber-200 text-amber-900 rounded-full' : ''}`}>{day}</span>)}</div></section>;
}

function Notifications() {
  const [readNotifications, setReadNotifications] = useState(new Set());
  const unreadCount = notifications.length - readNotifications.size;

  const markAsRead = (message) => setReadNotifications((current) => new Set(current).add(message));

  return <section className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-3"><div className="flex items-center justify-between"><SectionTitle icon={Bell}>Thông báo mới</SectionTitle><span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span></div><ul className="space-y-3 text-xs">{notifications.map(([message, time]) => <li key={message} className="flex items-start gap-2.5"><button type="button" onClick={() => markAsRead(message)} className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${readNotifications.has(message) ? 'bg-gray-300' : 'bg-amber-500'}`} aria-label={`Đánh dấu đã đọc: ${message}`} /><div><button type="button" onClick={() => markAsRead(message)} className={`text-left leading-snug ${readNotifications.has(message) ? 'font-medium text-gray-400' : 'font-semibold text-gray-800'}`}>{message}</button><p className="text-[10px] text-gray-400 mt-0.5">{time}</p></div></li>)}</ul></section>;
}

function QuickLinks() {
  return <section className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-3"><h3 className="font-bold text-sm text-gray-800">Liên kết nhanh</h3><div className="space-y-2 text-xs">{quickLinks.map(({ title, icon: Icon }) => <button key={title} className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition text-left"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center"><Icon size={14} /></div><span className="font-medium text-gray-700">{title}</span></div><ChevronRight size={14} className="text-gray-400" /></button>)}</div></section>;
}

export default function LmsDashboardStudent({ onNavigateToCourse, initialCourses }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState(() => initialCourses || []);
  const [isLoading, setIsLoading] = useState(!initialCourses);
  const [error, setError] = useState('');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [starredCourseIds, setStarredCourseIds] = useState(() => new Set((initialCourses || []).filter((course) => course.isStarred).map((course) => course.id)));
  const [removedCourseIds, setRemovedCourseIds] = useState(new Set());
  const displayedCourses = initialCourses || courses;

  // Nạp dữ liệu từ prop hoặc Backend API khi component được khởi tạo.
  // Response có thể là mảng trực tiếp hoặc object chứa trường courses/data để tương thích nhiều kiểu API.
  useEffect(() => {
    if (initialCourses) return undefined;

    const controller = new AbortController();
    const loadCourses = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/v1/student/courses', { signal: controller.signal });
        if (!response.ok) throw new Error(`API trả về mã lỗi ${response.status}`);
        const payload = await response.json();
        const nextCourses = Array.isArray(payload) ? payload : payload.courses || payload.data || [];
        setCourses(nextCourses);
        setStarredCourseIds(new Set(nextCourses.filter((course) => course.isStarred).map((course) => course.id)));
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError('Không thể tải danh sách khóa học từ máy chủ. Đang sử dụng dữ liệu mẫu.');
          setCourses(COURSES_DATA);
          setStarredCourseIds(new Set(COURSES_DATA.filter((course) => course.isStarred).map((course) => course.id)));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    loadCourses();
    return () => controller.abort();
  }, [initialCourses]);

  // Nạp thống kê và sự kiện dashboard từ Backend; dữ liệu mẫu vẫn được giữ khi API chưa cấu hình.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/student/dashboard-summary?userId=101', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`API trả về mã lỗi ${response.status}`);
        return response.json();
      })
      .then((summary) => setDashboardSummary(summary))
      .catch((summaryError) => {
        if (summaryError.name !== 'AbortError') setDashboardSummary(null);
      });
    return () => controller.abort();
  }, []);

  // Thêm hoặc xóa courseId khỏi tập yêu thích bằng một Set mới, không sửa state cũ.
  const handleToggleStar = (courseId) => setStarredCourseIds((currentIds) => {
    const nextIds = new Set(currentIds);
    if (nextIds.has(courseId)) nextIds.delete(courseId);
    else nextIds.add(courseId);
    return nextIds;
  });
  // Thêm hoặc xóa courseId khỏi nhóm khóa học đã ẩn để hỗ trợ khôi phục khi cần.
  const handleToggleRemoveFromView = (courseId) => setRemovedCourseIds((currentIds) => {
    const nextIds = new Set(currentIds);
    if (nextIds.has(courseId)) nextIds.delete(courseId);
    else nextIds.add(courseId);
    return nextIds;
  });

  // Chuyển courseId cho Router hoặc callback của ứng dụng; fallback dùng hash để component vẫn chạy độc lập.
  // Điều hướng nhận courseId để Router bên ngoài có thể mở đúng trang CourseDetail.
  const handleSelectCourse = (courseId) => {
    if (onNavigateToCourse) {
      onNavigateToCourse(courseId);
      return;
    }
    window.location.hash = `course-${courseId}`;
  };

  return (
    <MainLayout onNavigateHome={() => { window.location.hash = ''; }} searchTerm={searchQuery} onSearchChange={setSearchQuery}>
      <main className="lms-dashboard__main">
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <GreetingCard summaryStats={dashboardSummary?.stats?.map((item, index) => ({ ...item, icon: stats[index]?.icon, tone: stats[index]?.tone })) || stats} />
          {isLoading && <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">Đang tải danh sách khóa học...</div>}
          {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800" role="alert">{error}</div>}
          {!isLoading && <><RecentCourses courses={displayedCourses} starredCourseIds={starredCourseIds} removedCourseIds={removedCourseIds} onToggleStar={handleToggleStar} onToggleRemove={handleToggleRemoveFromView} onSelectCourse={handleSelectCourse} /><CourseOverview courses={displayedCourses} searchQuery={searchQuery} starredCourseIds={starredCourseIds} removedCourseIds={removedCourseIds} onToggleStar={handleToggleStar} onToggleRemove={handleToggleRemoveFromView} onSelectCourse={handleSelectCourse} /></>}
          <RecentActivities />
          <EventsSection />
        </section>
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <CalendarWidget />
          <Notifications />
          <QuickLinks />
        </aside>
      </main>
    </MainLayout>
  );
}