import React from "react";
import { clearTeacherSession } from "../../services/authService";

function ErrorScreen({ message }) {
  const isAuthError =
    message &&
    (message.toLowerCase().includes("hết hạn") ||
      message.toLowerCase().includes("không hợp lệ") ||
      message.toLowerCase().includes("đăng nhập") ||
      message.toLowerCase().includes("xác thực") ||
      message.toLowerCase().includes("401"));

  const handleReLogin = () => {
    // Chỉ dọn dẹp các khóa phiên LMS (localStorage), bảo toàn nguyên vẹn token Microsoft MSAL trong sessionStorage
    clearTeacherSession();
    window.location.href = "/dang-nhap";
  };

  return (
    <div
      className="dashboard-state"
      style={{
        maxWidth: "520px",
        margin: "3rem auto",
        textAlign: "center",
        padding: "2.5rem 2rem",
        background: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: isAuthError ? "#fef2f2" : "#fffbeb",
          color: isAuthError ? "#dc2626" : "#d97706",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1rem auto",
          fontSize: "1.5rem",
        }}
      >
        {isAuthError ? "🔒" : "⚠️"}
      </div>

      <h2 style={{ color: "#1e293b", marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: "700" }}>
        {isAuthError ? "Phiên Đăng Nhập Cần Xác Thực Lại" : "Không thể tải dashboard"}
      </h2>

      <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: "1.75rem", fontSize: "0.925rem" }}>
        {message}
      </p>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        {isAuthError ? (
          <button
            type="button"
            onClick={handleReLogin}
            style={{
              padding: "0.65rem 1.4rem",
              background: "#059669",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "0.9rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
            }}
          >
            <span>Đăng nhập lại LMS</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "0.65rem 1.25rem",
            background: "#f8fafc",
            color: "#475569",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            fontWeight: "500",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Tải lại trang
        </button>
      </div>
    </div>
  );
}

export default ErrorScreen;
