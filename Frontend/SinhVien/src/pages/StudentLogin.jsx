import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  BarChart3,
  PieChart,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function StudentLogin() {
  const navigate = useNavigate();

  // =========================================================================
  // KHAI BÁO STATE QUẢN LÝ FORM VÀ TRẠNG THÁI
  // =========================================================================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // XỬ LÝ ĐĂNG NHẬP CỔNG SINH VIÊN
  // =========================================================================
  const handleLogin = async (event) => {
    event.preventDefault();

    const account = username.trim();

    if (!account || !password) {
      setError("Vui lòng nhập đầy đủ mã sinh viên và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:3000/api/auth/login", {
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
          result.message || "Mã sinh viên hoặc mật khẩu không chính xác."
        );
      }

      const user = result.user;

      // =====================================================================
      // CHỐT CHẶN VAI TRÒ: Ngăn tài khoản Giảng viên đăng nhập Cổng Sinh viên
      // =====================================================================
      if (user.role !== "student") {
        setError(
          "Tài khoản này là Giảng viên. Vui lòng đăng nhập tại Cổng Giảng viên."
        );
        return;
      }

      // =====================================================================
      // LƯU PHIÊN ĐĂNG NHẬP SINH VIÊN VÀO LOCALSTORAGE
      // =====================================================================
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("studentUserKey", String(user.userKey));
      localStorage.setItem("studentMoodleId", String(user.moodleUserId));
      localStorage.setItem("studentUsername", user.username);
      localStorage.setItem("studentName", user.fullName || "");
      localStorage.setItem("studentEmail", user.email || "");
      localStorage.setItem("userRole", user.role);

      if (rememberMe) {
        localStorage.setItem("rememberStudentLogin", "true");
      } else {
        localStorage.removeItem("rememberStudentLogin");
      }

      // Điều hướng vào Dashboard Sinh viên
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* ================= KHỐI TRÁI: NHẬN DIỆN THƯƠNG HIỆU & HỌA TIẾT ================= */}
        <section className="login-left">
          <div className="login-brand">
            <div className="login-brand-logo">DLU</div>
            <div>
              <strong>TRƯỜNG ĐẠI HỌC ĐÀ LẠT</strong>
              <span>DALAT UNIVERSITY</span>
            </div>
          </div>

          <div className="login-left-content">
            <span className="login-label">LMS ANALYTICS</span>
            <h1>LMS Analytics Platform</h1>
            <p>
              Nền tảng phân tích dữ liệu học tập dành cho giảng viên và sinh
              viên.
            </p>

            {/* Các biểu đồ trang trí */}
            <div className="analytics-decoration">
              <div className="mini-chart line-card">
                <div className="mini-card-title">
                  <TrendingUp size={15} />
                  <span>Learning Progress</span>
                </div>
                <div className="fake-line-chart">
                  <span className="line-point p1"></span>
                  <span className="line-point p2"></span>
                  <span className="line-point p3"></span>
                  <span className="line-point p4"></span>
                  <span className="line-point p5"></span>
                  <div className="fake-line"></div>
                </div>
              </div>

              <div className="mini-chart donut-card">
                <PieChart size={42} />
                <span>Performance</span>
              </div>

              <div className="mini-chart bar-card">
                <BarChart3 size={50} />
                <span>Analytics</span>
              </div>
            </div>
          </div>

          <div className="login-wave wave-one"></div>
          <div className="login-wave wave-two"></div>
        </section>

        {/* ================= KHỐI PHẢI: FORM ĐIỀN THÔNG TIN ĐĂNG NHẬP ================= */}
        <section className="login-right">
          <div className="login-form-container">
            <div className="login-heading">
              <h2>ĐĂNG NHẬP</h2>
              <p>Truy cập cổng Sinh viên để tiếp tục</p>
            </div>

            <form onSubmit={handleLogin}>
              {/* TÊN ĐĂNG NHẬP / MÃ SINH VIÊN */}
              <div className="form-group">
                <label>Mã sinh viên</label>
                <div className="input-wrapper">
                  <UserRound size={17} />
                  <input
                    type="text"
                    placeholder="Nhập mã sinh viên (ví dụ: sv2310001)"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setError("");
                    }}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* MẬT KHẨU */}
              <div className="form-group">
                <label>Mật khẩu</label>
                <div className="input-wrapper">
                  <LockKeyhole size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* TÙY CHỌN */}
              <div className="login-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={loading}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    alert("Chức năng quên mật khẩu sẽ được kết nối sau.")
                  }
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* THÔNG BÁO LỖI */}
              {error && <div className="login-error">{error}</div>}

              {/* NÚT ĐĂNG NHẬP CHÍNH */}
              <button
                type="submit"
                className="login-main-button"
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập Cổng Sinh viên"}
              </button>

              {/* ĐƯỜNG KẺ PHÂN CÁCH */}
              <div className="login-divider">
                <span></span>
                <p>hoặc</p>
                <span></span>
              </div>

              {/* ĐĂNG NHẬP GOOGLE */}
              <button
                type="button"
                className="google-button"
                onClick={() =>
                  alert("Google Login sẽ được tích hợp sau.")
                }
                disabled={loading}
              >
                <span className="google-logo">G</span>
                Đăng nhập bằng Google
              </button>
            </form>

            <p className="login-note">
              Sử dụng tài khoản LMS của Trường Đại học Đà Lạt
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentLogin;