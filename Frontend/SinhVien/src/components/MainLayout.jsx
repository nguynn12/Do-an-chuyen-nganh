import { useEffect, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Menu,
  Network,
  Bell,
  GraduationCap,
  Users,
  X,
} from 'lucide-react';
import Header from './Header';
import '../LmsDashboardStudent.css';

// Cây điều hướng dùng chung cho Dashboard và trang Chi tiết khóa học.
const NAV_LINKS = [
  { id: 'dashboard', title: 'Bảng Điều khiển', href: '#', icon: Network },
  { id: 'home', title: 'Trang chủ hệ thống', href: '#', icon: BookOpen },
  {
    id: 'system-pages', title: 'Các trang của hệ thống', href: '#', icon: FileText,
    children: [
      { id: 'blog', title: 'Blog trang', href: '#', icon: FileText },
      { id: 'tags', title: 'Thẻ', href: '#', icon: Bookmark },
      { id: 'calendar', title: 'Lịch', href: '#', icon: Calendar },
      { id: 'news', title: 'Tin tức chung', href: '#', icon: Bell },
    ],
  },
  {
    id: 'my-courses', title: 'Các khoá học của tôi', href: '#', icon: GraduationCap,
    children: [{
      id: 'it-faculty', title: 'Khoa Công nghệ Thông tin', href: '#', icon: Users,
      children: [
        { id: 'game-course', title: 'Lập trình Game nâng cao', href: '#' },
        { id: 'java-course', title: 'Lập trình Java', href: '#' },
        { id: 'web-course', title: 'Phát triển ứng dụng Web', href: '#' },
        { id: 'more-courses', title: 'Thêm...', href: '#', icon: FileText },
      ],
    }],
  },
];

function NavigationItem({ item, level, expandedItems, onToggle, onNavigate }) {
  const Icon = item.icon;
  const hasChildren = item.children?.length > 0;
  const isExpanded = expandedItems.has(item.id);

  return (
    <li>
      <div className="flex items-center">
        <a href={item.href || '#'} onClick={(event) => onNavigate(event, item)} className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-orange-50 hover:text-orange-700 ${level > 0 ? 'ml-4' : ''}`}>
          {Icon && <Icon size={17} className="shrink-0 text-orange-600" />}
          <span className="truncate">{item.title}</span>
        </a>
        {hasChildren && <button type="button" onClick={() => onToggle(item.id)} className="mr-1 rounded-md p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-700" aria-label={`${isExpanded ? 'Thu gọn' : 'Mở rộng'} ${item.title}`} aria-expanded={isExpanded}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
      </div>
      {hasChildren && isExpanded && <ul className="space-y-1 border-l border-orange-100 pl-2">{item.children.map((childItem) => <NavigationItem key={childItem.id} item={childItem} level={level + 1} expandedItems={expandedItems} onToggle={onToggle} onNavigate={onNavigate} />)}</ul>}
    </li>
  );
}

function NavigationDrawer({ isOpen, onClose }) {
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Theo dõi phím Escape để người dùng luôn có thể đóng drawer bằng bàn phím.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleItem = (itemId) => setExpandedItems((currentItems) => {
    const nextItems = new Set(currentItems);
    if (nextItems.has(itemId)) nextItems.delete(itemId);
    else nextItems.add(itemId);
    return nextItems;
  });

  const handleNavigate = (event, item) => {
    if (item.children?.length) {
      event.preventDefault();
      toggleItem(item.id);
    } else onClose();
  };

  return <>
    <div className={`fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} aria-hidden="true" />
    <aside className={`fixed inset-y-0 left-0 z-[70] flex w-[min(22rem,88vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Điều hướng" aria-hidden={!isOpen}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-5 py-4"><div className="flex items-center gap-3"><Network size={21} className="text-orange-600" /><h2 className="text-base font-bold text-orange-700">Điều hướng</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-800" aria-label="Đóng điều hướng"><X size={20} /></button></div>
      <nav className="overflow-y-auto p-4" aria-label="Các trang LMS"><ul className="space-y-1">{NAV_LINKS.map((item) => <NavigationItem key={item.id} item={item} level={0} expandedItems={expandedItems} onToggle={toggleItem} onNavigate={handleNavigate} />)}</ul></nav>
    </aside>
  </>;
}

// Layout cố định thống nhất Header, nút menu và drawer trên mọi trang LMS.
export default function MainLayout({ children, onNavigateHome, searchTerm, onSearchChange }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return <div className="lms-dashboard relative min-h-screen"><button type="button" className="lms-dashboard__menu-tab" onClick={() => setIsDrawerOpen(true)} aria-label="Mở menu điều hướng" aria-expanded={isDrawerOpen}><Menu size={20} /></button><NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} /><Header onNavigateHome={onNavigateHome} searchTerm={searchTerm} onSearchChange={onSearchChange} />{children}</div>;
}
