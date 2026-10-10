import React, { useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Info,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import SecurePowerBIReport from "../powerbi/SecurePowerBIReport";
import { getPowerBIUrl } from "../class-management/PowerBIClassReport";

export default function AssignmentPowerBITab({ selectedCourse, cohort = "K47" }) {
  const [embedMode, setEmbedMode] = useState("secure"); // "secure" or "public"
  const [reportError, setReportError] = useState(false);

  // Lấy Course_Key trong Data Warehouse (Course_Key 8, 9, 10, 11, 12, 13)
  const courseKey = selectedCourse?.Course_Key || selectedCourse?.Moodle_Course_ID || 10;
  const courseName = selectedCourse?.Course_Name || "Học phần";

  // URL fallback công khai nếu MSAL chưa được đăng nhập
  const fallbackUrl =
    getPowerBIUrl(courseKey, cohort) ||
    "https://app.powerbi.com/view?r=eyJrIjoiN2NkMjk3MzUtMWU4MS00ODIwLWE5Y2YtYWYzNTA1N2EzMWI3IiwidCI6Ijg0NTAzNjliLTExZmEtNDQxMy04ZGM3LTA2MGFiOWYzNGY0MSIsImMiOjEwfQ%3D%3D&pageName=ee15a79c9e07c0ed161c";

  return (
    <div className="assign-tab-content">
      {/* POWER BI TOP STRIP */}
      <div className="pbi-assignment-header">
        <div className="pbi-title-group">
          <div className="pbi-icon-badge">
            <BarChart3 size={22} />
          </div>
          <div>
            <h3>Phân tích bài tập & Tiến độ nộp bài (Power BI)</h3>
            <p>
              Báo cáo phân tích chuyên sâu cho môn <strong>{courseName}</strong> (Khóa:{" "}
              <strong>{cohort}</strong>, Course_Key: <code>{courseKey}</code>).
            </p>
          </div>
        </div>

        <div className="pbi-mode-controls">
          <span className="pbi-sync-tag">
            <ShieldCheck size={14} /> Tự động lọc Course_Key
          </span>
          <button
            type="button"
            className="assign-btn assign-btn-outline btn-sm"
            onClick={() => setEmbedMode(embedMode === "secure" ? "public" : "secure")}
            title="Chuyển đổi giữa chế độ nhúng bảo mật Entra ID và nhúng web công khai"
          >
            {embedMode === "secure" ? "Dùng Public Embed" : "Dùng Secure Embed"}
          </button>
        </div>
      </div>

      {/* OVERVIEW HIGHLIGHTS */}
      <div className="pbi-context-notice">
        <Info size={16} />
        <span>
          Báo cáo thể hiện tự động các chỉ số: <strong>Tổng bài tập</strong>, <strong>Tỷ lệ nộp đúng hạn</strong>,{" "}
          <strong>Tỷ lệ trễ hạn</strong>, <strong>Phân bố phổ điểm</strong> và{" "}
          <strong>Những sinh viên cần chú ý</strong>. Dữ liệu được đồng bộ từ Fact_Assignment_Submission sang mô hình Power BI.
        </span>
      </div>

      {/* POWER BI CONTAINER */}
      <div className="pbi-report-wrapper">
        {embedMode === "secure" ? (
          <SecurePowerBIReport
            courseKey={courseKey}
            cohort={cohort}
            targetPage="01 - Bài tập"
            height="auto"
            hidePageNavigation={true}
            onError={() => setReportError(true)}
          />
        ) : (
          <div className="pbi-iframe-card">
            <iframe
              title={`PowerBI_Assignment_${courseKey}`}
              src={fallbackUrl}
              frameBorder="0"
              allowFullScreen
              style={{
                width: "100%",
                height: "700px",
                border: "none",
                borderRadius: "8px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
