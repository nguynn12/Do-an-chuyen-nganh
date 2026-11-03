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

import { useNavigate, useLocation } from "react-router-dom";
import { clearStudentSession } from "../services/teacherAuth.js";

import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    const account = username.trim();

    if (!account || !password) {
      setError(
        "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: account,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Tên đăng nhập hoặc mật khẩu không đúng."
        );
      }

      const user = result.user;

      if (user.role !== "teacher") {
        setError(
          user.role === "student"
            ? "Tài khoản này là Sinh viên, vui lòng đăng nhập tại Cổng Sinh viên"
            : "Tài khoản không có quyền giảng viên."
        );
        return;
      }

      // Xóa các khóa phiên Sinh viên cũ (nếu có) trước khi lưu phiên Giảng viên
      clearStudentSession();

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentTeacherId", String(user.moodleUserId));
      localStorage.setItem("currentUserKey", String(user.userKey));
      localStorage.setItem("currentUsername", user.username);
      localStorage.setItem("currentUserName", user.fullName || "");
      localStorage.setItem("currentUserEmail", user.email || "");
      localStorage.setItem("userRole", user.role);

      if (rememberMe) {
        localStorage.setItem("rememberLogin", "true");
      } else {
        localStorage.removeItem("rememberLogin");
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Không thể kết nối đến máy chủ."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* ================= LEFT ================= */}

        <section className="login-left">
          <div className="login-brand">

            <div className="login-brand-logo">
              DLU
            </div>

            <div>
              <strong>
                TRƯỜNG ĐẠI HỌC ĐÀ LẠT
              </strong>

              <span>
                DALAT UNIVERSITY
              </span>
            </div>

          </div>

          <div className="login-left-content">

            <span className="login-label">
              LMS ANALYTICS
            </span>

            <h1>
              LMS Analytics Platform
            </h1>

            <p>
              Nền tảng phân tích dữ liệu học tập dành cho
              giảng viên và sinh viên.
            </p>

            <div className="analytics-decoration">

              <div className="mini-chart line-card">

                <div className="mini-card-title">
                  <TrendingUp size={15} />

                  <span>
                    Learning Progress
                  </span>
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

                <span>
                  Performance
                </span>

              </div>

              <div className="mini-chart bar-card">

                <BarChart3 size={50} />

                <span>
                  Analytics
                </span>

              </div>

            </div>

          </div>

          <div className="login-wave wave-one"></div>
          <div className="login-wave wave-two"></div>

        </section>


        {/* ================= RIGHT ================= */}

        <section className="login-right">

          <div className="login-form-container">

            <div className="login-heading">

              <h2>
                ĐĂNG NHẬP
              </h2>

              <p>
                Truy cập để tiếp tục
              </p>

            </div>

            <form onSubmit={handleLogin}>

              {/* USERNAME */}

              <div className="form-group">

                <label>
                  Tên đăng nhập
                </label>

                <div className="input-wrapper">

                  <UserRound size={17} />

                  <input
                    type="text"
                    placeholder="Nhập tài khoản"
                    value={username}
                    onChange={(event) => {
                      setUsername(
                        event.target.value
                      );

                      setError("");
                    }}
                    autoComplete="username"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="form-group">

                <label>
                  Mật khẩu
                </label>

                <div className="input-wrapper">

                  <LockKeyhole size={17} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      setError("");
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Ẩn mật khẩu"
                        : "Hiện mật khẩu"
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>

                </div>

              </div>


              {/* OPTIONS */}

              <div className="login-options">

                <label className="remember">

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                  />

                  <span>
                    Ghi nhớ đăng nhập
                  </span>

                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    alert(
                      "Chức năng quên mật khẩu sẽ được kết nối sau."
                    )
                  }
                >
                  Quên mật khẩu?
                </button>

              </div>


              {/* ERROR */}

              {error && (
                <div className="login-error">
                  <div>{error}</div>
                  {error.includes("Cổng Sinh viên") && (
                    <div style={{ marginTop: "8px" }}>
                      <a
                        href="/sinhvien/dang-nhap"
                        style={{
                          color: "#18734f",
                          fontWeight: 600,
                          fontSize: "13px",
                          textDecoration: "underline",
                        }}
                      >
                        Chuyển sang Cổng Sinh viên &rarr;
                      </a>
                    </div>
                  )}
                </div>
              )}


              {/* LOGIN */}

              <button
                type="submit"
                className="login-main-button"
                disabled={loading}
              >
                {loading
                  ? "Đang đăng nhập..."
                  : "Đăng nhập"}
              </button>


              {/* DIVIDER */}

              <div className="login-divider">

                <span></span>

                <p>
                  hoặc
                </p>

                <span></span>

              </div>


              {/* GOOGLE */}

              <button
                type="button"
                className="google-button"
                onClick={() =>
                  alert(
                    "Google Login sẽ được tích hợp sau."
                  )
                }
                disabled={loading}
              >
                <span className="google-logo">
                  G
                </span>

                Đăng nhập bằng Google

              </button>

            </form>

            <p className="login-note">
              Sử dụng tài khoản LMS của
              Trường Đại học Đà Lạt
            </p>

          </div>

        </section>

      </div>
    </div>
  );
}

export default Login;