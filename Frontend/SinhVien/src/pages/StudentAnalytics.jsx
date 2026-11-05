import React, { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  BookOpen,
  Sparkles,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Award,
  Layers,
  AlertCircle,
} from "lucide-react";
import "../styles/StudentDashboard.css";
import "../styles/PowerBIEmbed.css";

const PRIMARY_REPORT_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiOWQ3MWMwNWQtYWM5YS00ZWQzLTgwZTYtY2QxNTdhYzllZTY3IiwidCI6Ijg0NTAzNjliLTExZmEtNDQxMy04ZGM3LTA2MGFiOWYzNGY0MSIsImMiOjEwfQ%3D%3D";

export default function StudentAnalytics() {
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);

    const timer = setTimeout(() => {
      setIsLoading((curr) => {
        if (curr) {
          setLoadError(true);
          return false;
        }
        return false;
      });
    }, 12000);

    return () => clearTimeout(timer);
  }, [reloadKey]);

  const handleReload = () => {
    setIsLoading(true);
    setLoadError(false);
    setReloadKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Lỗi khi chuyển toàn màn hình:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error("Lỗi khi thoát toàn màn hình:", err);
      });
    }
  };

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero" style={{ marginBottom: "20px" }}>
        <div className="courses-hero-main">
          <div className="courses-hero-icon" style={{ background: "linear-gradient(135deg, #37883e, #1e5824)" }}>
            <BarChart3 size={28} color="#ffffff" aria-hidden="true" />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} aria-hidden="true" />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Báo cáo Power BI</strong>
            </div>
            <span className="courses-hero-kicker">POWER BI BUSINESS INTELLIGENCE</span>
            <h1>Phân tích &amp; Trực quan hóa Học tập</h1>
            <p>
              Báo cáo thông minh trực quan hóa tiến độ rèn luyện, phổ điểm thực hành và mức độ chuyên cần của sinh viên trên nền tảng LMS.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <Sparkles size={18} style={{ color: "#65c777" }} aria-hidden="true" />
          <div>
            <span>Nguồn dữ liệu</span>
            <strong>LMS Data Warehouse</strong>
          </div>
        </div>
      </section>

      {/* 2. THANH CÔNG CỤ ĐIỀU KHIỂN BÁO CÁO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "12px 18px",
          borderRadius: "10px 10px 0 0",
          border: "1px solid #dfe4e1",
          borderBottom: "none",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <ShieldCheck size={14} aria-hidden="true" /> Báo cáo Phân tích Học tập Sinh viên
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={handleReload}
            className="btn-dlu-secondary"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Tải lại báo cáo"
          >
            <RotateCw size={13} aria-hidden="true" /> Tải lại
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="btn-dlu-secondary"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            title={isFullscreen ? "Thu nhỏ" : "Xem toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 size={13} aria-hidden="true" /> : <Maximize2 size={13} aria-hidden="true" />}
            {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          </button>

          <a
            href={PRIMARY_REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-dlu-secondary"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
            title="Mở trong tab mới"
          >
            <ExternalLink size={13} aria-hidden="true" /> Mở tab mới
          </a>
        </div>
      </div>

      {/* 3. KHUNG POWER BI EMBEDDED */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: isFullscreen ? "100vh" : "calc(100vh - 250px)",
          minHeight: "680px",
          background: "#ffffff",
          borderRadius: isFullscreen ? "0" : "0 0 12px 12px",
          border: isFullscreen ? "none" : "1px solid #dfe4e1",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.92)",
              zIndex: 10,
              color: "#37883e",
            }}
          >
            <RotateCw size={32} className="spin-animation" style={{ marginBottom: "12px" }} />
            <div style={{ fontSize: "14px", fontWeight: "600" }}>
              Đang tải báo cáo Power BI...
            </div>
            <div style={{ fontSize: "12px", color: "#4a5750", marginTop: "4px" }}>
              Kết nối từ hệ thống máy chủ Microsoft Power BI Service
            </div>
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              zIndex: 10,
              padding: "24px",
              textAlign: "center",
            }}
          >
            <AlertCircle
              size={42}
              style={{ color: "var(--dlu-red, #c53030)", marginBottom: "14px" }}
              aria-hidden="true"
            />
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#14251e",
                marginBottom: "8px",
              }}
            >
              Không thể tải báo cáo Power BI
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#667970",
                maxWidth: "440px",
                marginBottom: "20px",
                lineHeight: "1.5",
              }}
            >
              Kết nối tới Microsoft Power BI Service quá thời gian chờ (12 giây) hoặc bị trình duyệt chặn nhúng iframe.
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="dlu-retry-btn"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={handleReload}
              >
                <RotateCw size={14} aria-hidden="true" /> Thử lại
              </button>
              <button
                type="button"
                className="btn-dlu-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "36px",
                  padding: "0 16px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() => window.open(PRIMARY_REPORT_URL, "_blank")}
              >
                <ExternalLink size={14} aria-hidden="true" /> Mở liên kết trực tiếp
              </button>
            </div>
          </div>
        )}

        <iframe
          key={reloadKey}
          title="Báo cáo phân tích học tập sinh viên Power BI"
          src={PRIMARY_REPORT_URL}
          style={{
            width: "100%",
            height: "calc(100% + 42px)",
            border: "none",
            display: loadError ? "none" : "block",
          }}
          frameBorder="0"
          allowFullScreen={true}
          onLoad={() => {
            setIsLoading(false);
            setLoadError(false);
          }}
        />
      </div>

      {/* 4. CÁC TÍNH NĂNG NỔI BẬT CỦA BÁO CÁO PHÂN TÍCH */}
      <div className="summary-grid" style={{ marginBottom: "30px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <TrendingUp size={22} aria-hidden="true" />
          </div>
          <div className="summary-content">
            <span>Theo dõi tiến độ học</span>
            <strong>Trực quan hóa tự động</strong>
            <small>Cập nhật liên tục từ dữ liệu nộp bài và tương tác</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <Award size={22} aria-hidden="true" />
          </div>
          <div className="summary-content">
            <span>Phân bố điểm số</span>
            <strong>So sánh tương quan</strong>
            <small>Xem phổ điểm thực tế đối chiếu chuẩn đầu ra</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <Layers size={22} aria-hidden="true" />
          </div>
          <div className="summary-content">
            <span>Mức độ chuyên cần</span>
            <strong>Đo lường chi tiết</strong>
            <small>Thời gian truy cập tài liệu và hoàn thành bài tập</small>
          </div>
        </div>
      </div>
    </main>
  );
}
