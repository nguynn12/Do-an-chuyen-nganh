import React, { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/student/grades")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setGrades(data.data);
        }
      })
      .catch((err) => console.error("Lỗi getStudentGrades:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = grades.length;
  const gradeValues = grades.map((g) => Number(g.Grade || 0));
  const avgGrade =
    total > 0 ? (gradeValues.reduce((a, b) => a + b, 0) / total).toFixed(1) : 0;
  const maxGrade = total > 0 ? Math.max(...gradeValues) : 0;
  const passedCount = grades.filter(
    (g) => g.Is_Passed === 1 || Number(g.Grade) >= 5
  ).length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 100;

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <Award size={26} />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Bảng điểm</strong>
            </div>
            <span className="courses-hero-kicker">DLU LMS ANALYTICS</span>
            <h1>Bảng điểm & Kết quả học tập</h1>
            <p>
              Theo dõi chi tiết điểm số quá trình, đánh giá từng bài kiểm tra và tỷ lệ hoàn thành các học phần.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <Sparkles size={18} style={{ color: "#65c777" }} />
          <div>
            <span>Điểm trung bình chung</span>
            <strong>{avgGrade}/10</strong>
          </div>
        </div>
      </section>

      {/* 2. SUMMARY GRID */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <Award size={22} />
          </div>
          <div className="summary-content">
            <span>Điểm TB tích lũy</span>
            <strong>{avgGrade}/10</strong>
            <small>Tính trên {total} cột điểm</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="summary-content">
            <span>Tỷ lệ đạt chuẩn (Pass)</span>
            <strong>{passRate}%</strong>
            <small>{passedCount}/{total} bài đạt yêu cầu</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <TrendingUp size={22} />
          </div>
          <div className="summary-content">
            <span>Điểm cao nhất</span>
            <strong>{maxGrade}/10</strong>
            <small>Thành tích xuất sắc nhất</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <GraduationCap size={22} />
          </div>
          <div className="summary-content">
            <span>Tổng số bài đánh giá</span>
            <strong>{total} bài</strong>
            <small>Bao gồm Assign & Quiz</small>
          </div>
        </div>
      </div>

      {/* 3. TABLE OF GRADES */}
      <div className="student-table-card">
        <div className="section-title">
          <div className="left">
            <Award size={18} style={{ color: "#37883e" }} />
            <strong>Chi tiết kết quả đánh giá học tập</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu bảng điểm từ Data Warehouse...
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Tên bài đánh giá</th>
                <th>Hình thức</th>
                <th>Điểm số</th>
                <th>Thang điểm</th>
                <th>Tỷ lệ %</th>
                <th>Kết quả</th>
                <th>Ngày ghi nhận</th>
              </tr>
            </thead>
            <tbody>
              {grades.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "#66736b", padding: "24px" }}>
                    Hiện chưa có dữ liệu điểm nào.
                  </td>
                </tr>
              ) : (
                grades.map((item) => {
                  const score = Number(item.Grade || 0);
                  const isPassed = item.Is_Passed === 1 || score >= 5;

                  return (
                    <tr key={item.Grade_Key}>
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
                          {item.Grade_Item_Name}
                        </div>
                      </td>
                      <td>
                        <span className="dlu-badge dlu-badge--green">
                          {item.Grade_Item_Type === "mod" ? "Bài quá trình" : "Tổng kết"}
                        </span>
                      </td>
                      <td>
                        <strong
                          style={{
                            fontSize: "13px",
                            color: score >= 7 ? "#37883e" : score >= 5 ? "#e66d1e" : "#dc2626",
                          }}
                        >
                          {score} đ
                        </strong>
                      </td>
                      <td>{item.Max_Grade || 10}</td>
                      <td>
                        <strong style={{ color: "#37883e" }}>
                          {item.Grade_Percentage ? `${Math.round(item.Grade_Percentage)}%` : `${Math.round((score / 10) * 100)}%`}
                        </strong>
                      </td>
                      <td>
                        <span className={`dlu-badge ${isPassed ? "dlu-badge--green" : "dlu-badge--red"}`}>
                          {isPassed ? "✓ Đạt" : "✗ Chưa đạt"}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#66736b", fontSize: "11px" }}>
                          {item.Grade_Date || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
