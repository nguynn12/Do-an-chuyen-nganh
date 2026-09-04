import { useEffect, useRef, useState } from 'react';
import {
  Award,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  User,
} from 'lucide-react';
import './Header.css';
import logoBanner from '../assets/logo_dlu_lms.png';

// Các mục menu được khai báo dạng dữ liệu để dễ thay đổi hoặc nhận từ API sau này.
const FACULTIES_DATA = [
  'Khoa Công nghệ Thông tin', 'Khoa Toán - Tin học', 'Khoa Vật lý và Kỹ thuật hạt nhân',
  'Khoa Hóa học và Môi trường', 'Khoa Sinh học', 'Khoa Nông lâm',
  'Khoa Ngữ văn và Lịch sử', 'Khoa Kinh tế - Quản trị Kinh doanh',
  'Khoa Tài chính - Kế toán', 'Khoa Du lịch', 'Khoa Luật học', 'Khoa Ngoại ngữ',
  'Khoa Quốc tế học', 'Khoa Xã hội học và Công tác xã hội', 'Khoa Sư phạm',
  'Khoa Lý luận Chính trị', 'Phòng Chính trị và Công tác Sinh viên',
  'Phòng Quản lý Đào tạo', 'Khoa Giáo dục Thể chất',
  'Trung tâm Giáo dục Quốc phòng và An ninh', 'Phòng Quản lý Chất lượng', 'Tất cả các khóa học', 'Tìm kiếm khóa học',
].map((title, index) => ({ id: `faculty-${index + 1}`, title, href: '#' }));

const ITC_LINKS_DATA = [
  'Trung Tâm Công nghệ Thông tin', 'Tập huấn sử dụng hệ thống LMS',
  'Bồi dưỡng Ứng dụng trí tuệ Nhân tạo',
].map((title, index) => ({ id: `itc-${index + 1}`, title, href: '#' }));

const LANGUAGES_DATA = [
  { id: 'en', title: 'English (en)', href: '#' },
  { id: 'vi', title: 'Tiếng Việt (vi)', href: '#' },
  { id: 'ko', title: '한국어 (ko)', href: '#' },
  { id: 'ja', title: '日本語 (ja)', href: '#' },
];

const USER_MENU_ITEMS = [
  { id: 'dashboard', label: 'Bảng điều khiển', href: '#', icon: LayoutDashboard },
  { id: 'profile', label: 'Hồ sơ', href: '#', icon: User },
  { id: 'grades', label: 'Điểm', href: '#', icon: Award },
  { id: 'messages', label: 'Tin nhắn', href: '#', icon: MessageSquare },
  { id: 'preferences', label: 'Tùy chọn', href: '#', icon: Settings },
  { id: 'logout', label: 'Đăng xuất', href: '#', icon: LogOut, hasDivider: true },
];

function UserDropdown({ isOpen, onClose }) {
  const dropdownRef = useRef(null);

  // Đóng menu tài khoản khi click ra ngoài vùng menu hoặc khi component bị tháo khỏi DOM.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div ref={dropdownRef} className="lms-header__user-dropdown">
      {USER_MENU_ITEMS.map(({ id, label, href, icon: Icon, hasDivider }) => (
        <a key={id} href={href} onClick={onClose} className={`lms-header__user-item ${hasDivider ? 'lms-header__user-item--divider' : ''}`}>
          <Icon size={16} className="lms-header__muted-icon" />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}

function NavDropdown({ label, items, isOpen, onToggle, maxHeight }) {
  return (
    <div className="lms-header__dropdown-wrap">
      <button type="button" onClick={onToggle} className={`lms-header__nav-button ${isOpen ? 'lms-header__nav-button--active' : ''}`} aria-expanded={isOpen} aria-haspopup="menu">
        {label}<ChevronDown size={14} className={`lms-header__chevron ${isOpen ? 'lms-header__chevron--open' : ''}`} />
      </button>
      <div className={`lms-header__dropdown ${maxHeight ? 'lms-header__dropdown--scroll' : ''} ${isOpen ? 'lms-header__dropdown--open' : ''}`} style={maxHeight ? { maxHeight } : undefined} role="menu">
        {items.map((item) => <a key={item.id} href={item.href || '#'} onClick={onToggle} className="lms-header__dropdown-item" role="menuitem">{item.title}</a>)}
      </div>
    </div>
  );
}

// Header dùng chung cho dashboard và trang chi tiết khóa học, bảo đảm hai trang đồng nhất.
export default function Header({ onNavigateHome, searchTerm = '', onSearchChange = () => {} }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navRef = useRef(null);

  // Đóng dropdown Đơn vị/ITC/Ngôn ngữ khi người dùng click bên ngoài vùng điều hướng.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!navRef.current?.contains(event.target)) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleDropdown = (dropdownId) => {
    setActiveDropdown((currentDropdown) => (currentDropdown === dropdownId ? null : dropdownId));
  };

  const navigateHome = (event) => {
    event.preventDefault();
    onNavigateHome?.();
  };

  return (
    <header className="lms-dashboard__header">
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-2.5 sm:px-6">
        <button type="button" className="lms-header__logo-button" onClick={onNavigateHome} aria-label="Về trang chủ LMS">
          <img src={logoBanner} alt="Trường Đại học Đà Lạt và hệ thống LMS" className="lms-header__logo" />
        </button>
      </div>
      <nav className="bg-[#1A201E] text-white px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div ref={navRef} className="flex items-center gap-2 text-xs md:text-sm">
            <button type="button" onClick={navigateHome} className="bg-[#2E7D32] px-3.5 py-1.5 rounded-lg font-medium hover:bg-[#256629] transition">LMS DLU</button>
            <NavDropdown label="Đơn vị" items={FACULTIES_DATA} maxHeight="20rem" isOpen={activeDropdown === 'units'} onToggle={() => toggleDropdown('units')} />
            <NavDropdown label="ITC" items={ITC_LINKS_DATA} isOpen={activeDropdown === 'itc'} onToggle={() => toggleDropdown('itc')} />
            <NavDropdown label="Ngôn ngữ (vi)" items={LANGUAGES_DATA} isOpen={activeDropdown === 'lang'} onToggle={() => toggleDropdown('lang')} />
          </div>
          <div className="relative flex-1 max-w-xs md:max-w-md"><Search className="absolute left-3 top-2.5 text-gray-400" size={14} /><input type="search" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm kiếm bài học, giảng viên..." aria-label="Tìm kiếm khóa học" className="w-full bg-white/10 text-xs rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" /></div>
          <div className="relative">
            <button type="button" onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-left transition hover:bg-white/10" aria-label="Mở menu tài khoản" aria-expanded={isUserMenuOpen}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-xs text-white">TP</div>
              <div className="leading-tight hidden sm:block"><p className="text-xs font-semibold">Trần Ngọc Bảo Phước</p><p className="text-[10px] text-gray-400">MSSV: 2051470 • Lớp: CTK47A • Khoa CNTT</p></div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <UserDropdown isOpen={isUserMenuOpen} onClose={() => setIsUserMenuOpen(false)} />
          </div>
        </div>
      </nav>
    </header>
  );
}
