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

function Login() {
  const navigate = useNavigate();

  // =========================================================================
  // KHAI BÁO STATE QUẢN LÝ FORM VÀ TRẠNG THÁI GIAO DIỆN
  // =========================================================================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Bật/tắt hiển thị mật khẩu
  const [rememberMe, setRememberMe] = useState(false);     // Ghi nhớ đăng nhập
  const [error, setError] = useState("");                   // Thông báo lỗi hiển thị cho người dùng
  const [loading, setLoading] = useState(false);           // Trạng thái gửi request lên server

  // =========================================================================
  // XỬ LÝ SUBMIT FORM ĐĂNG NHẬP
  // =========================================================================
  const handleLogin = async (event) => {
    event.preventDefault();

    const account = username.trim();

    // 1. Kiểm tra dữ liệu đầu vào phía Client
    if (!account || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 2. Gửi thông tin xác thực đến Auth API chung của hệ thống
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

      // Bắt lỗi HTTP hoặc thông báo thất bại từ Auth Controller
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Tên đăng nhập hoặc mật khẩu không đúng."
        );
      }

      const user = result.user;

      // =====================================================================
      // 3. CHỐT CHẶN PHÂN QUYỀN (CLIENT-SIDE ROLE GUARD)
      // Ngăn tài khoản Sinh viên đăng nhập vào cổng Giảng viên nhằm tránh
      // tình trạng lưu nhầm Moodle_User_ID của sinh viên gây lỗi 404 Dashboard.
      // =====================================================================
      if (user.role !== "teacher") {
        setError(
          "Tài khoản này là Sinh viên. Vui lòng đăng nhập tại Cổng thông tin Sinh viên."
        );
        return;
      }

      // =====================================================================
      // 4. LƯU THÔNG TIN PHIÊN ĐĂNG NHẬP VÀO LOCALSTORAGE
      // Chỉ lưu khi đã xác thực chính xác vai trò Giảng viên
      // =====================================================================
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentTeacherId", String(user.moodleUserId)); // Dùng để truy vấn API giảng viên
      localStorage.setItem("currentUserKey", String(user.userKey));       // Khóa chính trong Dim_User
      localStorage.setItem("currentUsername", user.username);
      localStorage.setItem("currentUserName", user.fullName || "");
      localStorage.setItem("currentUserEmail", user.email || "");
      localStorage.setItem("userRole", user.role);

      // Lưu tùy chọn ghi nhớ đăng nhập
      if (rememberMe) {
        localStorage.setItem("rememberLogin", "true");
      } else {
        localStorage.removeItem("rememberLogin");
      }

      // 5. Điều hướng vào trang chủ Dashboard của Giảng viên
      navigate("/", { replace: true });
    } catch (err) {
      // Xử lý lỗi ngoại lệ (mất kết nối backend, lỗi server, v.v.)
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
          {/* Logo & Tên Trường */}
          <div className="login-brand">
            <div className="login-brand-logo">DLU</div>
            <div>
              <strong>TRƯỜNG ĐẠI HỌC ĐÀ LẠT</strong>
              <span>DALAT UNIVERSITY</span>
            </div>
          </div>

          {/* Tiêu đề giới thiệu nền tảng */}
          <div className="login-left-content">
            <span className="login-label">LMS ANALYTICS</span>
            <h1>LMS Analytics Platform</h1>
            <p>
              Nền tảng phân tích dữ liệu học tập dành cho giảng viên và sinh
              viên.
            </p>

            {/* Các biểu đồ trang trí tượng trưng */}
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

          {/* Họa tiết lượn sóng nền */}
          <div className="login-wave wave-one"></div>
          <div className="login-wave wave-two"></div>
        </section>

        {/* ================= KHỐI PHẢI: FORM ĐIỀN THÔNG TIN ĐĂNG NHẬP ================= */}
        <section className="login-right">
          <div className="login-form-container">
            <div className="login-heading">
              <h2>ĐĂNG NHẬP</h2>
              <p>Truy cập cổng Giảng viên để tiếp tục</p>
            </div>

            <form onSubmit={handleLogin}>
              {/* Trường nhập Tên đăng nhập */}
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <div className="input-wrapper">
                  <UserRound size={17} />
                  <input
                    type="text"
                    placeholder="Nhập tài khoản"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setError(""); // Xóa thông báo lỗi khi người dùng gõ lại
                    }}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Trường nhập Mật khẩu */}
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
                      setError(""); // Xóa thông báo lỗi khi người dùng gõ lại
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  {/* Nút ẩn/hiện mật khẩu */}
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

              {/* Tùy chọn Ghi nhớ & Quên mật khẩu */}
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

              {/* Vùng hiển thị thông báo lỗi */}
              {error && <div className="login-error">{error}</div>}

              {/* Nút hành động Đăng nhập */}
              <button
                type="submit"
                className="login-main-button"
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              {/* Đường kẻ phân cách */}
              <div className="login-divider">
                <span></span>
                <p>hoặc</p>
                <span></span>
              </div>

              {/* Tùy chọn Đăng nhập Google */}
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

export default Login;