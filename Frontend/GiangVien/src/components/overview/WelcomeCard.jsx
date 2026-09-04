import { Users, Clock3, MessageSquare, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
          icon={<Users size={22} />}
          label="Lớp phụ trách"
          value={`${stats.totalCourses} Môn học`}
          subtext={`${stats.totalStudents} sinh viên`}
          className="summary-green"
          onClick={() => navigate("/khoa-hoc")}
        />

        <SummaryCard
          icon={<Clock3 size={22} />}
          label="Bài chờ chấm"
          value={`${stats.pendingGrading} Bài chưa chấm`}
          className="summary-orange"
          onClick={() => navigate("/bai-cho-cham")}
        />

        <SummaryCard
          icon={<LifeBuoy size={22} />}
          label="Yêu cầu hỗ trợ"
          value={`${stats.unreadSupportRequests} Tin chưa đọc`}
          className="summary-blue"
          onClick={() => navigate("/yeu-cau-ho-tro")}
        />

        <SummaryCard
          icon={<MessageSquare size={22} />}
          label="Tin nhắn mới"
          value={`${stats.unreadMessages} Tin chưa đọc`}
          className="summary-light"
          onClick={() => navigate("/tin-nhan")}
        />
      </div>
    </section>
  );
}

export default WelcomeCard;
