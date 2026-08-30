import {
  Users,
  UserCheck,
  ClipboardCheck,
  BarChart3,
  ChevronRight,
} from "lucide-react";

function CourseRow({
  course,
  onManage,
  onGrade,
}) {
  const status =
    course.status || "active";

  return (
    <div className="course-management-row">
      <div
        className="course-row-indicator"
        style={{
          background:
            course.color || "#3e8f46",
        }}
      />

      <div className="course-row-main">
        <div className="course-row-heading">
          <div>
            <span className="course-code">
              {course.id}
            </span>

            <h3>
              {course.title}
            </h3>
          </div>

          <span
            className={`course-status ${
              status === "active"
                ? "course-active"
                : "course-ended"
            }`}
          >
            {status === "active"
              ? "Đang giảng dạy"
              : "Đã kết thúc"}
          </span>
        </div>

        <div className="course-row-metrics">
          <div className="course-row-metric">
            <Users size={15} />

            <div>
              <span>Sinh viên</span>
              <strong>
                {course.studentCount || 0}
              </strong>
            </div>
          </div>

          <div className="course-row-metric">
            <UserCheck size={15} />

            <div>
              <span>Chuyên cần</span>
              <strong>
                {course.attendance || 0}%
              </strong>
            </div>
          </div>

          <div className="course-row-metric">
            <ClipboardCheck size={15} />

            <div>
              <span>Nộp bài</span>
              <strong>
                {course.submissionRate || 0}%
              </strong>
            </div>
          </div>

          <div className="course-row-metric">
            <BarChart3 size={15} />

            <div>
              <span>Điểm TB</span>
              <strong>
                {course.averageScore ?? "-"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="course-row-actions">
        <button
          className="course-grade-button"
          onClick={() => onGrade(course)}
        >
          Chấm điểm
        </button>

        <button
          className="course-manage-button"
          onClick={() => onManage(course)}
        >
          Quản lý lớp

          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default CourseRow;