import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Search,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  Award,
} from "lucide-react";

export default function StudentSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/v1/student/submissions")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setSubmissions(data.data);
        }
      })
      .catch((err) => console.error("Lỗi getStudentSubmissions:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = submissions.length;
  const onTime = submissions.filter(
    (s) => s.Submission_Status === "submitted" && s.Is_Submitted_On_Time === 1
  ).length;
  const late = submissions.filter(
    (s) => s.Submission_Status === "submitted" && s.Is_Submitted_On_Time === 0
  ).length;
  const graded = submissions.filter((s) => s.Is_Graded === 1).length;

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.Course_Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.Activity_Name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "ontime") return s.Is_Submitted_On_Time === 1;
    if (filterStatus === "late") return s.Is_Submitted_On_Time === 0;
    if (filterStatus === "graded") return s.Is_Graded === 1;
    return true;
  });

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <ClipboardCheck size={26} />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Tình trạng nộp bài</strong>
            </div>
            <span className="courses-hero-kicker">DLU LMS ANALYTICS</span>
            <h1>Theo dõi & Đánh giá nộp bài</h1>
            <p>
              Kiểm tra chi tiết thời gian nộp bài, phân loại đúng hạn hay trễ hạn và nhận xét từ giảng viên.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <div>
            <span>Tổng số bài nộp</span>
            <strong>{total} bài tập</strong>
          </div>
        </div>
      </section>

      {/* 2. SUMMARY GRID */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="summary-content">
            <span>Nộp đúng hạn</span>
            <strong>{onTime} bài</strong>
            <small>Tỷ lệ: {total > 0 ? Math.round((onTime / total) * 100) : 0}%</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>
          <div className="summary-content">
            <span>Nộp trễ hạn</span>
            <strong>{late} bài</strong>
            <small>Nộp sau thời gian deadline</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <Award size={22} />
          </div>
          <div className="summary-content">
            <span>Đã chấm điểm</span>
            <strong>{graded}/{total} bài</strong>
            <small>{total - graded} bài đang chờ chấm</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <ClipboardCheck size={22} />
          </div>
          <div className="summary-content">
            <span>Tổng số bài tập</span>
            <strong>{total} bài</strong>
            <small>Ghi nhận từ Data Warehouse</small>
          </div>
        </div>
      </div>

      {/* 3. FILTER & TABLE */}
      <div className="student-table-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={filterStatus === "all" ? "btn-dlu-primary" : "btn-dlu-secondary"}
              onClick={() => setFilterStatus("all")}
            >
              Tất cả ({total})
            </button>
            <button
              type="button"
              className={filterStatus === "ontime" ? "btn-dlu-primary" : "btn-dlu-secondary"}
              onClick={() => setFilterStatus("ontime")}
            >
              Đúng hạn ({onTime})
            </button>
            <button
              type="button"
              className={filterStatus === "late" ? "btn-dlu-primary" : "btn-dlu-secondary"}
              onClick={() => setFilterStatus("late")}
            >
              Trễ hạn ({late})
            </button>
            <button
              type="button"
              className={filterStatus === "graded" ? "btn-dlu-primary" : "btn-dlu-secondary"}
              onClick={() => setFilterStatus("graded")}
            >
              Đã có điểm ({graded})
            </button>
          </div>

          <div className="search-box" style={{ width: "240px", background: "white", border: "1px solid #dfe4e1" }}>
            <Search size={14} style={{ color: "#68766f" }} />
            <input
              type="text"
              placeholder="Tìm bài tập hoặc môn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ color: "#17221d" }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu lịch sử nộp bài...
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Tên bài tập</th>
                <th>Hạn nộp (Deadline)</th>
                <th>Ngày nộp thực tế</th>
                <th>Trạng thái</th>
                <th>Điểm số</th>
                <th>Nhận xét của GV</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#66736b", padding: "24px" }}>
                    Không tìm thấy bài nộp nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.Submission_Key}>
                    <td>
                      <div style={{ fontWeight: "700", color: "#17221d" }}>
                        {item.Course_Code}
                      </div>
                      <div style={{ fontSize: "11px", color: "#66736b" }}>
                        {item.Course_Name}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#17221d" }}>
                        {item.Activity_Name}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#66736b", fontSize: "11px" }}>
                        {item.Due_Date || "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#66736b", fontSize: "11px" }}>
                        {item.Submit_Date || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`dlu-badge ${
                          item.Is_Submitted_On_Time === 1
                            ? "dlu-badge--green"
                            : "dlu-badge--orange"
                        }`}
                      >
                        {item.Is_Submitted_On_Time === 1 ? "✓ Đúng hạn" : "⚠️ Nộp trễ"}
                      </span>
                    </td>
                    <td>
                      <strong
                        style={{
                          color:
                            item.Grade !== null && item.Grade >= 7
                              ? "#37883e"
                              : "#e66d1e",
                        }}
                      >
                        {item.Grade !== null ? `${item.Grade} đ` : "Chờ chấm"}
                      </strong>
                    </td>
                    <td>
                      <span
                        style={{
                          color: "#66736b",
                          fontStyle: item.Feedback_Comment ? "normal" : "italic",
                        }}
                      >
                        {item.Feedback_Comment || "Chưa có nhận xét"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
