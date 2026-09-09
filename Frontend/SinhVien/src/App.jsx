import { useEffect, useState } from 'react';
import LmsDashboardStudent from './LmsDashboardStudent';
import CourseDetail from './CourseDetail';

function App() {
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash);

  // Đồng bộ route nội bộ với URL để nút Back, bookmark và thao tác đổi hash đều hoạt động.
  useEffect(() => {
    const handleHashChange = () => setCurrentRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dashboard phát sự kiện chọn môn; App chịu trách nhiệm đổi route và render trang tương ứng.
  const handleNavigateToCourse = (courseId) => {
    window.location.hash = `course-${courseId}`;
  };

  const courseMatch = currentRoute.match(/^#course-(.+)$/);

  if (courseMatch) {
    return <CourseDetail courseId={courseMatch[1]} onNavigateToDashboard={() => { window.location.hash = ''; }} />;
  }

  return <LmsDashboardStudent onNavigateToCourse={handleNavigateToCourse} />;
}

export default App;