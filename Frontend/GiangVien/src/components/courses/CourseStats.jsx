import {
  BookOpen,
  Users,
  UserCheck,
  ClipboardCheck,
} from "lucide-react";

function StatItem({ icon, label, value, description }) {
  return (
    <div className="courses-stat-card">
      <div className="courses-stat-icon">
        {icon}
      </div>

      <div className="courses-stat-content">
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{description}</small>
      </div>
    </div>
  );
}

function CourseStats({ courses }) {
  const totalCourses = courses.length;

  const totalStudents = courses.reduce(
    (total, course) =>
      total + (course.studentCount || 0),
    0
  );

  const averageAttendance =
    courses.length > 0
      ? Math.round(
          courses.reduce(
            (total, course) =>
              total + (course.attendance || 0),
            0
          ) / courses.length
        )
      : 0;

  const averageSubmission =
    courses.length > 0
      ? Math.round(
          courses.reduce(
            (total, course) =>
              total + (course.submissionRate || 0),
            0
          ) / courses.length
        )
      : 0;

  return (
    <div className="courses-stats-grid">
      <StatItem
        icon={<BookOpen size={21} />}
        label="Tổng khóa học"
        value={totalCourses}
        description="Trong học kỳ hiện tại"
      />

      <StatItem
        icon={<Users size={21} />}
        label="Tổng sinh viên"
        value={totalStudents}
        description="Đang theo học"
      />

      <StatItem
        icon={<UserCheck size={21} />}
        label="Chuyên cần TB"
        value={`${averageAttendance}%`}
        description="Trung bình các lớp"
      />

      <StatItem
        icon={<ClipboardCheck size={21} />}
        label="Tỷ lệ nộp bài"
        value={`${averageSubmission}%`}
        description="Trung bình các lớp"
      />
    </div>
  );
}

export default CourseStats;