import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  AlertCircle,
  GraduationCap,
  Sparkles,
  LineChart,
  BarChart3,
  Activity,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import dluHeroImg from "../assets/anh_dai_hoc_da_lat_clean.jpg";
import dluOfficialLogo from "../assets/logo_dlu_login_official.png";
import "../styles/Login.css";

const GOOGLE_CLIENT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || "";
const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim() !== "");

let gisLoadedPromise = null;
function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);

  if (!gisLoadedPromise) {
    gisLoadedPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google?.accounts?.id));
        existing.addEventListener("error", () => reject(new Error("Không thể tải Google Identity SDK")));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google?.accounts?.id);
      script.onerror = () => reject(new Error("Không thể tải Google Identity SDK"));
      document.head.appendChild(script);
    });
  }

  return gisLoadedPromise;
}

async function loginWithGooglePrompt() {
  if (!isGoogleConfigured) {
    throw new Error(
      "Hệ thống chưa cấu hình VITE_GOOGLE_CLIENT_ID. Vui lòng thiết lập Google Cloud OAuth Client ID."
    );
  }

  const googleId = await loadGoogleScript();

  return new Promise((resolve, reject) => {
    try {
      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            resolve({ credential: response.credential });
          } else {
            reject(new Error("Không nhận được chứng thực từ Google."));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleId.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn("[Google Auth] Prompt not displayed:", notification.getNotDisplayedReason?.());
        }
      });
    } catch (err) {
      reject(new Error(err.message || "Lỗi khởi động đăng nhập Google."));
    }
  });
}

/**
 * Component Đăng nhập Thống nhất Trường Đại học Đà Lạt
 * Tái sử dụng trọn vẹn cho cả Giảng viên (Port 5173) và Sinh viên (Port 5174)
 * 
 * @param {Object} props
 * @param {"teacher" | "student"} props.portal Cổng frontend hiện tại
 * @param {Function} [props.onSaveSession] Hàm lưu phiên đăng nhập tương ứng
 */
export default function DluUnifiedLogin({ portal = "teacher", onSaveSession }) {
  const navigate = useNavigate();

  // Xác định tab mặc định dựa trên portal hiện tại hoặc URL query (?tab=...)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || params.get("role");
      if (tabParam === "student" || tabParam === "sinhvien") return "student";
      if (tabParam === "teacher" || tabParam === "giangvien") return "teacher";
    }
    return portal === "student" ? "student" : "teacher";
  });

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showGoogleConfigModal, setShowGoogleConfigModal] = useState(false);

  // =========================================================================
  // TIẾP NHẬN PHIÊN ĐĂNG NHẬP CHUYỂN TIẾP GIỮA HAI CỔNG QUA AUTH_TOKEN
  // =========================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const authToken = params.get("auth_token");
    const authUserRaw = params.get("auth_user");

    if (authToken && authUserRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(authUserRaw));
        const userRole = String(user.role || "").toLowerCase();

        // Kiểm tra đúng vai trò tương ứng với Cổng hiện tại
        if (portal === "teacher" && (userRole === "teacher" || userRole === "giangvien")) {
          if (onSaveSession) {
            onSaveSession(user, true, authToken);
          } else {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userRole", "teacher");
            localStorage.setItem("currentTeacherId", String(user.moodleUserId || user.teacherId || ""));
            localStorage.setItem("currentUserKey", String(user.userKey || ""));
            localStorage.setItem("currentUsername", user.username || "");
            localStorage.setItem("currentUserName", user.fullName || "");
            localStorage.setItem("currentUserEmail", user.email || "");
            localStorage.setItem("teacherToken", authToken);
          }
          // Dọn sạch URL param để không lộ token trên thanh địa chỉ
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate("/", { replace: true });
          return;
        }

        if (portal === "student" && (userRole === "student" || userRole === "sinhvien")) {
          if (onSaveSession) {
            onSaveSession(user, true, authToken);
          } else {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userRole", "student");
            localStorage.setItem("studentUserKey", String(user.userKey || ""));
            localStorage.setItem("studentMoodleId", String(user.moodleUserId || ""));
            localStorage.setItem("studentName", user.fullName || "");
            localStorage.setItem("studentUsername", user.username || "");
            localStorage.setItem("studentEmail", user.email || "");
            localStorage.setItem("studentToken", authToken);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate("/", { replace: true });
          return;
        }
      } catch (err) {
        console.warn("[Auth Bridge] Lỗi phân tích auth token:", err);
      }
    }
  }, [portal, navigate, onSaveSession]);

  // =========================================================================
  // XỬ LÝ LƯU PHIÊN ĐĂNG NHẬP NỘI BỘ NẾU KHÔNG TRUYỀN onSaveSession
  // =========================================================================
  const handleSaveSessionInternal = (user, remember, token) => {
    if (onSaveSession) {
      onSaveSession(user, remember, token);
      return;
    }

    if (user.role === "teacher" || user.role === "giangvien") {
      const teacherId = String(user.moodleUserId || user.teacherId || "");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("currentTeacherId", teacherId);
      localStorage.setItem("currentUserKey", String(user.userKey || ""));
      localStorage.setItem("currentUsername", user.username || "");
      localStorage.setItem("currentUserName", user.fullName || "");
      localStorage.setItem("currentUserEmail", user.email || "");
      if (token) localStorage.setItem("teacherToken", token);
      localStorage.setItem(
        "teacherUser",
        JSON.stringify({
          fullName: user.fullName || "",
          degree: "ThS.",
          email: user.email || "",
          username: user.username || "",
        })
      );
      if (remember) localStorage.setItem("rememberLogin", "true");
    } else {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", "student");
      localStorage.setItem("studentUserKey", String(user.userKey || ""));
      localStorage.setItem("studentMoodleId", String(user.moodleUserId || ""));
      localStorage.setItem("studentName", user.fullName || "");
      localStorage.setItem("studentUsername", user.username || "");
      localStorage.setItem("studentEmail", user.email || "");
      if (token) localStorage.setItem("studentToken", token);
      localStorage.setItem(
        "studentUser",
        JSON.stringify({
          userKey: String(user.userKey || ""),
          moodleUserId: String(user.moodleUserId || ""),
          username: user.username || "",
          fullName: user.fullName || "",
          email: user.email || "",
          role: "student",
        })
      );
      if (remember) localStorage.setItem("rememberStudentLogin", "true");
    }
  };

  // =========================================================================
  // XỬ LÝ ĐĂNG NHẬP TÀI KHOẢN VÀ MẬT KHẨU
  // =========================================================================
  const handleLogin = async (event) => {
    event.preventDefault();

    const account = username.trim();

    if (!account || !password) {
      setError(
        activeTab === "teacher"
          ? "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu."
          : "Vui lòng nhập đầy đủ mã sinh viên và mật khẩu."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: account,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Tên đăng nhập hoặc mật khẩu không chính xác."
        );
      }

      const user = result.user;
      const token = result.token;
      const userRole = String(user.role || "").toLowerCase();

      // =====================================================================
      // 1. NGƯỜI DÙNG ĐANG CHỌN TAB GIẢNG VIÊN
      // =====================================================================
      if (activeTab === "teacher") {
        if (userRole !== "teacher" && userRole !== "giangvien") {
          setError(
            "Tài khoản của bạn là Sinh viên nhưng bạn đang chọn tab Giảng viên. Vui lòng chuyển sang tab 'Sinh viên' để tiếp tục."
          );
          return;
        }

        // Hợp lệ vai trò Giảng viên
        if (portal === "teacher") {
          handleSaveSessionInternal(user, rememberMe, token);
          navigate("/", { replace: true });
        } else {
          // Đang ở Cổng Sinh viên (port 5174), chuyển sang Cổng Giảng viên (port 5173)
          const targetUrl = `http://localhost:5173/dang-nhap?auth_token=${encodeURIComponent(
            token
          )}&auth_user=${encodeURIComponent(JSON.stringify(user))}`;
          window.location.href = targetUrl;
        }
        return;
      }

      // =====================================================================
      // 2. NGƯỜI DÙNG ĐANG CHỌN TAB SINH VIÊN
      // =====================================================================
      if (activeTab === "student") {
        if (userRole !== "student" && userRole !== "sinhvien") {
          setError(
            "Tài khoản của bạn là Giảng viên nhưng bạn đang chọn tab Sinh viên. Vui lòng chuyển sang tab 'Giảng viên' để tiếp tục."
          );
          return;
        }

        // Hợp lệ vai trò Sinh viên
        if (portal === "student") {
          handleSaveSessionInternal(user, rememberMe, token);
          navigate("/", { replace: true });
        } else {
          // Đang ở Cổng Giảng viên (port 5173), chuyển sang Cổng Sinh viên (port 5174)
          const targetUrl = `http://localhost:5174/dang-nhap?auth_token=${encodeURIComponent(
            token
          )}&auth_user=${encodeURIComponent(JSON.stringify(user))}`;
          window.location.href = targetUrl;
        }
        return;
      }
    } catch (err) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // XỬ LÝ ĐĂNG NHẬP GOOGLE OAUTH
  // =========================================================================
  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured) {
      setShowGoogleConfigModal(true);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { credential } = await loginWithGooglePrompt();

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Xác thực Google không thành công.");
      }

      const user = result.user;
      const token = result.token;
      const userRole = String(user.role || "").toLowerCase();

      if (activeTab === "teacher") {
        if (userRole !== "teacher" && userRole !== "giangvien") {
          setError(
            "Tài khoản Google liên kết với vai trò Sinh viên. Vui lòng chuyển sang tab 'Sinh viên' để đăng nhập."
          );
          return;
        }

        if (portal === "teacher") {
          handleSaveSessionInternal(user, rememberMe, token);
          navigate("/", { replace: true });
        } else {
          window.location.href = `http://localhost:5173/dang-nhap?auth_token=${encodeURIComponent(
            token
          )}&auth_user=${encodeURIComponent(JSON.stringify(user))}`;
        }
        return;
      }

      if (activeTab === "student") {
        if (userRole !== "student" && userRole !== "sinhvien") {
          setError(
            "Tài khoản Google liên kết với vai trò Giảng viên. Vui lòng chuyển sang tab 'Giảng viên' để đăng nhập."
          );
          return;
        }

        if (portal === "student") {
          handleSaveSessionInternal(user, rememberMe, token);
          navigate("/", { replace: true });
        } else {
          window.location.href = `http://localhost:5174/dang-nhap?auth_token=${encodeURIComponent(
            token
          )}&auth_user=${encodeURIComponent(JSON.stringify(user))}`;
        }
        return;
      }
    } catch (err) {
      setError(err.message || "Đăng nhập bằng Google thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dlu-login-viewport">
      <div className="dlu-login-wrapper">

        {/* ===============================================================
            CỘT TRÁI - HERO FLYCAM ĐẠI HỌC ĐÀ LẠT
           =============================================================== */}
        <section
          className="dlu-login-hero"
          style={{ backgroundImage: `url(${dluHeroImg})` }}
          aria-label="Hình ảnh toàn cảnh Trường Đại học Đà Lạt"
        >
          <div className="dlu-hero-overlay" />

          {/* Huy hiệu trường góc trên */}
          <div className="dlu-hero-top-badge">
            <img src={dluOfficialLogo} alt="Logo Trường Đại học Đà Lạt" />
            <span>DALAT UNIVERSITY • ANALYTICS DASHBOARD</span>
          </div>

          {/* Khối Typography Dashboard trực quan trên nền ảnh */}
          <div className="dlu-hero-main-content">
            <div className="dlu-hero-tag">
              <Sparkles size={14} />
              <span>NỀN TẢNG PHÂN TÍCH & GIÁM SÁT HỌC TẬP</span>
            </div>
            <h2 className="dlu-hero-uni-name">TRƯỜNG ĐẠI HỌC ĐÀ LẠT</h2>
            <h1 className="dlu-hero-system-title">
              HỆ THỐNG DASHBOARD<br />PHÂN TÍCH HỌC TẬP
            </h1>
            <p className="dlu-hero-description">
              Trực quan hóa dữ liệu học tập toàn diện, theo dõi tiến độ đào tạo và cảnh báo sớm hỗ trợ ra quyết định thông minh dành cho Giảng viên & Sinh viên.
            </p>
          </div>

          {/* 3 Điểm nhấn tính năng Dashboard ở chân ảnh */}
          <div className="dlu-hero-footer-content">
            <div className="dlu-hero-highlights">
              <div className="dlu-highlight-card">
                <div className="dlu-highlight-icon-wrap">
                  <LineChart size={17} />
                </div>
                <strong>Phân tích học tập</strong>
                <p>Trực quan hóa tiến độ, điểm số và mức độ tham gia</p>
              </div>

              <div className="dlu-highlight-card">
                <div className="dlu-highlight-icon-wrap">
                  <BarChart3 size={17} />
                </div>
                <strong>Quản lý hiệu quả</strong>
                <p>Theo dõi lớp học và phát hiện sớm sinh viên cần hỗ trợ</p>
              </div>

              <div className="dlu-highlight-card">
                <div className="dlu-highlight-icon-wrap">
                  <Activity size={17} />
                </div>
                <strong>Hỗ trợ ra quyết định</strong>
                <p>Báo cáo trực quan và tương tác đa chiều thông minh</p>
              </div>
            </div>
          </div>

          {/* Đường cong luxury mềm mại ngăn cách giữa ảnh hero và form */}
          <div className="dlu-hero-curve" aria-hidden="true">
            <svg viewBox="0 0 100 1000" preserveAspectRatio="none">
              <path
                d="M100 0 C 32 280, 24 720, 100 1000 L100 1000 L100 0 Z"
                className="dlu-curve-path"
              />
            </svg>
          </div>
        </section>

        {/* ===============================================================
            CỘT PHẢI - CARD FORM ĐĂNG NHẬP
           =============================================================== */}
        <section className="dlu-login-form-side">
          <div className="dlu-form-inner-wrap">

            {/* Header Form */}
            <div className="dlu-form-header">
              <div className="dlu-form-brand-row">
                <img
                  src={dluOfficialLogo}
                  alt="Logo Trường Đại học Đà Lạt"
                  className="dlu-form-logo"
                />
                <div className="dlu-form-brand-text">
                  <h3>TRƯỜNG ĐẠI HỌC ĐÀ LẠT</h3>
                  <p>Hệ thống Dashboard Phân tích Học tập</p>
                </div>
              </div>

              <h1 className="dlu-form-title">Đăng nhập Dashboard</h1>
              <p className="dlu-form-subtitle">
                Truy cập cổng phân tích và giám sát học tập dành cho Giảng viên & Sinh viên
              </p>
            </div>

            {/* TABS PHÂN VAI TRÒ */}
            <div className="dlu-role-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "teacher"}
                className={`dlu-tab-button ${activeTab === "teacher" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("teacher");
                  setError("");
                }}
              >
                <Sparkles size={15} />
                Giảng viên
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "student"}
                className={`dlu-tab-button ${activeTab === "student" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("student");
                  setError("");
                }}
              >
                <GraduationCap size={15} />
                Sinh viên
              </button>
            </div>

            {/* FORM ĐĂNG NHẬP - HIỂN THỊ ĐẦY ĐỦ CHO CẢ HAI VAI TRÒ */}
            <form onSubmit={handleLogin} noValidate>
              {/* TÊN ĐĂNG NHẬP / MÃ SINH VIÊN */}
              <div className="dlu-input-group">
                <label className="dlu-input-label" htmlFor="dlu-account-input">
                  {activeTab === "teacher" ? "Tên đăng nhập" : "Mã sinh viên"}
                </label>
                <div className="dlu-input-container">
                  <UserRound size={17} className="dlu-input-icon" />
                  <input
                    id="dlu-account-input"
                    type="text"
                    className="dlu-text-input"
                    placeholder={
                      activeTab === "teacher"
                        ? "Ví dụ: gv_nguyenan hoặc nguyenan@dlu.edu.vn"
                        : "Ví dụ: sv2310001 hoặc 2310001@dlu.edu.vn"
                    }
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="username"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* MẬT KHẨU */}
              <div className="dlu-input-group">
                <label className="dlu-input-label" htmlFor="dlu-password-input">
                  Mật khẩu
                </label>
                <div className="dlu-input-container">
                  <LockKeyhole size={17} className="dlu-input-icon" />
                  <input
                    id="dlu-password-input"
                    type={showPassword ? "text" : "password"}
                    className="dlu-text-input"
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="dlu-toggle-password-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* TÙY CHỌN: GHI NHỚ & QUÊN MẬT KHẨU */}
              <div className="dlu-form-options">
                <label className="dlu-remember-label">
                  <input
                    type="checkbox"
                    className="dlu-remember-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <button
                  type="button"
                  className="dlu-forgot-link"
                  onClick={() => setShowForgotModal(true)}
                  disabled={loading}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* THÔNG BÁO LỖI INLINE */}
              {error && (
                <div className="dlu-error-box" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* NÚT SUBMIT */}
              <button
                type="submit"
                className="dlu-submit-button"
                disabled={loading}
              >
                {loading
                  ? "Đang xác thực..."
                  : activeTab === "teacher"
                  ? "Đăng nhập Giảng viên"
                  : "Đăng nhập Sinh viên"}
              </button>

              {/* DIVIDER */}
              <div className="dlu-auth-divider">
                <span>hoặc tiếp tục với</span>
              </div>

              {/* KHỐI SSO GOOGLE */}
              <div className="dlu-sso-group">
                <button
                  type="button"
                  className="dlu-sso-button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  title={
                    isGoogleConfigured
                      ? "Đăng nhập tài khoản Google Workspace"
                      : "Chưa cấu hình Google Client ID. Nhấn để xem hướng dẫn."
                  }
                >
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google Workspace</span>
                  {!isGoogleConfigured && (
                    <span className="dlu-sso-badge-help" title="Cần cấu hình">
                      <HelpCircle size={11} />
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* FOOTER */}
            <div className="dlu-form-footer">
              <p>© 2026 Trường Đại học Đà Lạt • Hệ thống Dashboard Phân tích Học tập</p>
            </div>
          </div>
        </section>
      </div>

      {/* ===============================================================
          MODAL HƯỚNG DẪN QUÊN MẬT KHẨU
         =============================================================== */}
      {showForgotModal && (
        <div className="dlu-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="dlu-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Khôi phục mật khẩu tài khoản</h3>
            <p>
              {activeTab === "teacher"
                ? "Để bảo đảm an toàn dữ liệu học tập và thông tin giảng dạy, mật khẩu tài khoản Giảng viên được quản lý tập trung bởi Phòng Đào tạo & CNTT Trường Đại học Đà Lạt."
                : "Để khôi phục mật khẩu tài khoản Sinh viên, các bạn vui lòng liên hệ Phòng Đào tạo & Khảo thí hoặc Trung tâm CNTT Trường Đại học Đà Lạt."}
            </p>
            <p>
              {activeTab === "teacher" ? "Quý Thầy/Cô" : "Sinh viên"} vui lòng liên hệ:
              <br />
              <strong>• Email hỗ trợ:</strong> admin@dlu.edu.vn
              <br />
              <strong>• Hotline:</strong> (0263) 3822246
              <br />
              <strong>• Địa chỉ:</strong> Số 01 Phù Đổng Thiên Vương, Phường 8, TP. Đà Lạt
            </p>
            <div className="dlu-modal-actions">
              <button
                type="button"
                className="dlu-modal-btn-close"
                onClick={() => setShowForgotModal(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===============================================================
          MODAL HƯỚNG DẪN CẤU HÌNH GOOGLE OAUTH
         =============================================================== */}
      {showGoogleConfigModal && (
        <div
          className="dlu-modal-backdrop"
          onClick={() => setShowGoogleConfigModal(false)}
        >
          <div className="dlu-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Cấu hình Đăng nhập Google (OAuth 2.0)</h3>
            <p>
              Tính năng Đăng nhập bằng Google đã được tích hợp mã nguồn đầy đủ ở cả Client và Server. Để kích hoạt:
            </p>
            <ol style={{ fontSize: "13px", paddingLeft: "18px", color: "var(--dlu-text-muted)", lineHeight: 1.6 }}>
              <li>Truy cập Google Cloud Console & tạo dự án mới.</li>
              <li>Tạo <strong>OAuth 2.0 Client ID</strong> (Web application).</li>
              <li>
                Thêm Authorized JavaScript origins: <code>http://localhost:5173</code> và <code>http://localhost:5174</code>.
              </li>
              <li>
                Thêm biến <code>VITE_GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</code> vào file <code>.env</code> của Frontend.
              </li>
            </ol>
            <div className="dlu-modal-actions">
              <button
                type="button"
                className="dlu-modal-btn-close"
                onClick={() => setShowGoogleConfigModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
