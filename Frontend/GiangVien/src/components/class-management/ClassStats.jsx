import {
  Users,
  UserCheck,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";

function StatCard({
  icon,
  label,
  value,
  description,
  type,
}) {
  return (
    <div className={`class-stat-card ${type}`}>
      <div className="class-stat-icon">
        {icon}
      </div>

      <div className="class-stat-info">
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{description}</small>
      </div>
    </div>
  );
}


// ======================================================
// FORMAT PHẦN TRĂM
// ======================================================

function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return `${Math.round(Number(value))}%`;
}


// ======================================================
// FORMAT ĐIỂM
// ======================================================

function formatScore(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(1);
}


function ClassStats({
  studentCount,
  attendance,
  submissionRate,
  averageScore,
}) {
  const hasAttendance =
    attendance !== null &&
    attendance !== undefined &&
    !Number.isNaN(Number(attendance));

  return (
    <div className="class-stats-grid">
      <StatCard
        icon={<Users size={21} />}
        label="Sinh viên"
        value={studentCount ?? 0}
        description="Đang theo học"
        type="students"
      />

      <StatCard
        icon={<UserCheck size={21} />}
        label="Chuyên cần"
        value={formatPercent(attendance)}
        description={
          hasAttendance
            ? "Trung bình lớp"
            : "Chưa có dữ liệu"
        }
        type="attendance"
      />

      <StatCard
        icon={<ClipboardCheck size={21} />}
        label="Nộp bài"
        value={formatPercent(submissionRate)}
        description="Tỷ lệ hoàn thành"
        type="submission"
      />

      <StatCard
        icon={<GraduationCap size={21} />}
        label="Điểm trung bình"
        value={formatScore(averageScore)}
        description="Kết quả hiện tại"
        type="score"
      />
    </div>
  );
}

export default ClassStats;