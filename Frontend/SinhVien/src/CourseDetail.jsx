import { useEffect, useState } from 'react';
import './CourseDetail.css';
import MainLayout from './components/MainLayout';
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  GraduationCap,
  MessageSquare,
  Settings,
  Upload,
} from 'lucide-react';
import heroBanner from './assets/hero.png';

// Dữ liệu chi tiết khóa học được tách độc lập để có thể thay bằng dữ liệu từ Backend API.
const COURSE_DETAIL_DATA = {
  id: 'game-advanced-ctk47',
  title: 'PHÁT TRIỂN ỨNG DỤNG GAME NÂNG CAO',
  code: 'CTK47',
  bannerUrl: heroBanner,
  instructors: [
    { name: 'Thái Duy Quý', email: 'quytd@dlu.edu.vn' },
    { name: 'Nguyễn Minh Tâm', email: 'tamnm@dlu.edu.vn' },
  ],
  breadcrumbs: [
    'Bảng Điều khiển',
    'Các khoá học của tôi',
    'Khoa CNTT',
    'Kỹ thuật phần mềm',
    'Học kỳ 1',
    'Phát triển ứng dụng Game nâng cao',
  ],
  topics: [
    {
      id: 'announcements',
      title: 'Trao đổi - Thông báo',
      isOpen: true,
      items: [
        {
          id: 'welcome',
          name: 'Thông báo bắt đầu học phần',
          type: 'forum',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: '',
          href: '#announcement-welcome',
        },
        {
          id: 'course-outline',
          name: 'Đề cương chi tiết học phần',
          type: 'pdf',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: '',
          fileUrl: '#course-outline.pdf',
        },
      ],
    },
    {
      id: 'lectures',
      title: 'Lý thuyết - Bài giảng',
      isOpen: true,
      items: [
        {
          id: 'lecture-01',
          name: 'Bài giảng 01 - Tổng quan Unity Engine',
          type: 'pdf',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: '',
          fileUrl: '#lecture-01.pdf',
        },
        {
          id: 'reference-links',
          name: 'Tài nguyên tham khảo về phát triển game',
          type: 'url',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: '',
          href: 'https://unity.com/learn',
        },
      ],
    },
    {
      id: 'topic-01',
      title: 'Chủ đề 1 - Game Mechanics',
      isOpen: false,
      items: [
        {
          id: 'lab-01',
          name: 'BÀI THỰC HÀNH 1 - Xây dựng chuyển động nhân vật',
          type: 'assignment',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: 'Hạn nộp: Thứ sáu, 28 Tháng 8 2026, 4:00 PM',
          href: '#assignment-lab-01',
        },
        {
          id: 'assets-folder',
          name: 'Thư mục Assets thực hành',
          type: 'folder',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: '',
          href: '#assets-folder',
        },
      ],
    },
    {
      id: 'topic-02',
      title: 'Chủ đề 2 - Crafting System',
      isOpen: false,
      items: [
        {
          id: 'lab-04',
          name: 'LAB 04 - CRAFTING SYSTEM',
          type: 'assignment',
          openDate: 'Đã mở: Thứ sáu, 28 Tháng 8 2026, 12:00 AM',
          dueDate: 'Hạn nộp: Thứ sáu, 28 Tháng 8 2026, 4:00 PM',
          href: '#assignment-lab-04',
        },
      ],
    },
  ],
};

const RESOURCE_CONFIG = {
  pdf: { label: 'Tài liệu PDF', Icon: FileText, className: 'text-red-600 bg-red-50' },
  assignment: { label: 'Bài tập', Icon: Upload, className: 'text-amber-600 bg-amber-50' },
  forum: { label: 'Diễn đàn', Icon: MessageSquare, className: 'text-blue-600 bg-blue-50' },
  folder: { label: 'Thư mục', Icon: Folder, className: 'text-blue-600 bg-blue-50' },
  url: { label: 'Liên kết', Icon: ExternalLink, className: 'text-green-700 bg-green-50' },
};

function Breadcrumbs({ items, onSettings, onNavigateToDashboard }) {
  return (
    <nav className="course-detail__breadcrumbs" aria-label="Đường dẫn khóa học">
      <div className="course-detail__breadcrumb-list">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className={`course-detail__breadcrumb-item ${index === items.length - 1 ? 'course-detail__breadcrumb-item--current' : ''}`}>
            {index > 0 && <ChevronRight size={13} />}
            <a href={index === 0 ? '#' : '#breadcrumb'} onClick={index === 0 ? (event) => { event.preventDefault(); onNavigateToDashboard(); } : undefined}>{item}</a>
          </span>
        ))}
      </div>
      <button type="button" onClick={onSettings} className="course-detail__settings" aria-label="Cài đặt khóa học"><Settings size={18} /></button>
    </nav>
  );
}

function CourseBanner({ course }) {
  return (
    <section className="course-detail__intro">
      <h1 className="course-detail__title">{course.title}</h1>
      <p className="course-detail__meta">Mã học phần: <strong>{course.code}</strong></p>
      <p className="course-detail__meta">
        Giảng viên: {course.instructors.map((instructor, index) => (
          <span key={instructor.email}>
            {index > 0 && ', '}
            <a className="course-detail__instructor" href={`mailto:${instructor.email}`}>{instructor.name} ({instructor.email})</a>
          </span>
        ))}
      </p>
      <img src={course.bannerUrl} alt={`Banner ${course.title}`} className="course-detail__banner" />
    </section>
  );
}

function ResourceItem({ resource, onClick }) {
  const config = RESOURCE_CONFIG[resource.type] || RESOURCE_CONFIG.url;
  const Icon = config.Icon;
  return (
    <li>
      <button type="button" onClick={() => onClick(resource)} className="course-detail__resource-button">
        <span className={`course-detail__resource-icon course-detail__resource-icon--${resource.type}`} title={config.label}><Icon size={18} /></span>
        <span className="course-detail__resource-content">
          <strong className="course-detail__resource-title">{resource.name}</strong>
          <span className="course-detail__resource-date">{resource.openDate}</span>
          {resource.dueDate && <span className="course-detail__resource-due">{resource.dueDate}</span>}
        </span>
        <ChevronRight size={16} className="course-detail__resource-arrow" />
      </button>
    </li>
  );
}

function TopicSection({ topic, isExpanded, onToggle, onResourceClick }) {
  return (
    <section className="course-detail__topic">
      <button type="button" onClick={onToggle} className="course-detail__topic-button" aria-expanded={isExpanded}>
        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span className="course-detail__topic-title">{topic.title}</span>
      </button>
      {isExpanded && <ul>{topic.items.map((resource) => <ResourceItem key={resource.id} resource={resource} onClick={onResourceClick} />)}</ul>}
    </section>
  );
}

function ResourceModal({ resource, onClose }) {
  if (!resource) return null;
  const isAssignment = resource.type === 'assignment';
  return (
    <div className="course-detail__modal-backdrop" role="presentation" onClick={onClose}>
      <div className="course-detail__modal" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="course-detail__modal-header">
          <div><p className="course-detail__modal-kicker">{isAssignment ? 'Chi tiết bài tập' : 'Tài nguyên học tập'}</p><h2 id="resource-modal-title" className="course-detail__modal-title">{resource.name}</h2></div>
          <button type="button" onClick={onClose} className="course-detail__modal-close" aria-label="Đóng">×</button>
        </div>
        <div className="course-detail__modal-info"><p>{resource.openDate}</p>{resource.dueDate && <p className="course-detail__modal-due">{resource.dueDate}</p>}</div>
        <div className="course-detail__modal-actions">
          <button type="button" onClick={onClose} className="course-detail__button course-detail__button--secondary">Đóng</button>
          <a href={resource.fileUrl || resource.href || '#'} target={resource.type === 'pdf' ? '_blank' : undefined} rel={resource.type === 'pdf' ? 'noreferrer' : undefined} className="course-detail__button course-detail__button--primary">{isAssignment ? 'Mở trang nộp bài' : 'Mở tài nguyên'}</a>
        </div>
      </div>
    </div>
  );
}

export default function CourseDetail({ course = COURSE_DETAIL_DATA, courseId, onNavigateToDashboard = () => { window.location.hash = ''; } }) {
  const [courseData, setCourseData] = useState(course);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTopicIds, setExpandedTopicIds] = useState(() => new Set((course.topics || []).filter((topic) => topic.isOpen).map((topic) => topic.id)));
  const [selectedResource, setSelectedResource] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Nạp dữ liệu chi tiết môn học từ API khi có courseId
  useEffect(() => {
    if (!courseId) return undefined;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/v1/student/courses/${courseId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (payload?.course) {
          setCourseData(payload.course);
          setExpandedTopicIds(new Set((payload.course.topics || []).filter((t) => t.isOpen).map((t) => t.id)));
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Sử dụng dữ liệu mẫu cho CourseDetail:', err.message);
          setCourseData(course);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [courseId, course]);

  // Mỗi lần click sẽ tạo Set mới để React nhận biết thay đổi và cập nhật đúng accordion.
  const handleTopicToggle = (topicId) => setExpandedTopicIds((currentIds) => {
    const nextIds = new Set(currentIds);
    if (nextIds.has(topicId)) nextIds.delete(topicId);
    else nextIds.add(topicId);
    return nextIds;
  });

  // PDF mở tab mới thông qua modal, còn bài tập mở modal deadline để sinh viên kiểm tra trước khi nộp.
  const handleResourceClick = (resource) => {
    setSelectedResource(resource);
  };

  useEffect(() => {
    if (!selectedResource && !settingsMessage) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedResource(null);
        setSettingsMessage('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedResource, settingsMessage]);

  const activeCourse = courseData || course;

  return (
    <MainLayout onNavigateHome={onNavigateToDashboard}>
      <div className="course-detail" data-course-id={courseId || activeCourse.id}>
      <main className="course-detail__container">
        <Breadcrumbs items={activeCourse.breadcrumbs || []} onSettings={() => setSettingsMessage('Khu vực cài đặt khóa học đang sẵn sàng kết nối API.')} onNavigateToDashboard={onNavigateToDashboard} />
        {isLoading && <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm mb-4">Đang tải dữ liệu khóa học...</div>}
        {settingsMessage && <div className="course-detail__notice" role="status"><AlertCircle size={16} />{settingsMessage}<button type="button" onClick={() => setSettingsMessage('')} className="course-detail__notice-close">×</button></div>}
        <div className="course-detail__layout">
          <div className="course-detail__main">
            <CourseBanner course={activeCourse} />
            <div className="course-detail__topics">{(activeCourse.topics || []).map((topic) => <TopicSection key={topic.id} topic={topic} isExpanded={expandedTopicIds.has(topic.id)} onToggle={() => handleTopicToggle(topic.id)} onResourceClick={handleResourceClick} />)}</div>
          </div>
          <aside className="course-detail__sidebar"><div className="course-detail__sidebar-heading"><GraduationCap size={18} /><h2>Thông tin khóa học</h2></div><p>Mã học phần: <strong>{activeCourse.code}</strong></p><a href="#participants" className="course-detail__sidebar-link"><BookOpen size={15} />Danh sách học viên</a></aside>
        </div>
      </main>
      <ResourceModal resource={selectedResource} onClose={() => setSelectedResource(null)} />
      </div>
    </MainLayout>
  );
}

