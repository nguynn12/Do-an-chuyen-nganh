import { Users, Clock3, Bell, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IS_ASSIGNMENT_MANAGEMENT_ENABLED } from "../../config/featureFlags";
import SummaryCard from "./SummaryCard";

function WelcomeCard({ teacher, stats }) {
  const navigate = useNavigate();

  return (
    <section className="welcome-card">
      <div className="welcome-user">
        <div className="big-avatar">{teacher.initials || "GV"}</div>

        <div>
          <h2>
            Xin chào, {teacher.degree} {teacher.fullName}
          </h2>

          <p>
            {teacher.department} | Niên khóa: {teacher.schoolYear} |{" "}
            {teacher.semester}
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard
          icon={<Users size={22} aria-hidden="true" />}
          label="Lớp phụ trách"
          value={stats?.totalCourses != null ? `${stats.totalCourses} môn học` : "0 môn học"}
          subtext={stats?.totalStudents != null ? `${stats.totalStudents} sinh viên` : "0 sinh viên"}
          className="summary-green"
          onClick={() => navigate("/khoa-hoc")}
        />

        <SummaryCard
          icon={<Clock3 size={22} aria-hidden="true" />}
          label="Bài chờ chấm"
          value={stats?.pendingGrading != null ? `${stats.pendingGrading} bài chưa chấm` : "0 bài chưa chấm"}
          className="summary-orange"
          onClick={() => navigate(IS_ASSIGNMENT_MANAGEMENT_ENABLED ? "/bai-cho-cham" : "/cham-diem")}
        />

        <SummaryCard
          icon={<LifeBuoy size={22} aria-hidden="true" />}
          label="Yêu cầu hỗ trợ"
          value={stats?.unreadSupportRequests != null ? `${stats.unreadSupportRequests} tin chưa đọc` : "0 tin chưa đọc"}
          className="summary-blue"
          onClick={() => navigate("/yeu-cau-ho-tro")}
        />

        <SummaryCard
          icon={<Bell size={22} aria-hidden="true" />}
          label="Thông báo mới"
          value={stats?.unreadMessages != null ? `${stats.unreadMessages} thông báo` : "0 thông báo"}
          className="summary-light"
          onClick={() => navigate("/tin-nhan")}
        />
      </div>
    </section>
  );
}

export default WelcomeCard;
