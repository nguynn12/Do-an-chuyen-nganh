import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  HelpCircle,
  ShieldCheck,
  Building2,
  GraduationCap,
  Headphones,
  BarChart3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";

import useTeacherDashboard from "../hooks/useTeacherDashboard";

import "../styles/TeacherOverview.css";


function Support() {
  const navigate = useNavigate();

  // ======================================================
  // LẤY THÔNG TIN GIẢNG VIÊN
  // để Header hiển thị đúng người đang đăng nhập
  // ======================================================

  const {
    teacher,
    loading,
    error,
  } = useTeacherDashboard();


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return <LoadingScreen />;
  }


  // ======================================================
  // ERROR
  // ======================================================

  if (error || !teacher) {
    return (
      <ErrorScreen
        message={
          error ||
          "Không thể tải thông tin giảng viên."
        }
      />
    );
  }


  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="app support-page">

      {/* ==================================================
          HEADER GIỐNG TRANG TỔNG QUAN
      ================================================== */}

      <Header teacher={teacher} />


      {/* ==================================================
          SIDEBAR GIỐNG TRANG TỔNG QUAN
      ================================================== */}

      <Sidebar />


      {/* ==================================================
          SUPPORT CONTENT
      ================================================== */}

      <main className="support-main">

        <button
          className="support-back"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={16} />
          Quay lại Tổng quan
        </button>


        <div className="support-container">

          {/* ================= HERO ================= */}

          <section className="support-hero">

            <div className="support-hero-icon">
              <HelpCircle size={25} />
            </div>

            <div className="support-hero-content">

              <div className="support-eyebrow">
                HỖ TRỢ & HƯỚNG DẪN
              </div>

              <h1>
                Trung tâm Hỗ trợ & Hướng dẫn Giảng viên
              </h1>

              <p>
                Đồng hành cùng giảng viên trong quá trình
                khai thác và sử dụng Hệ thống Phân tích
                Dữ liệu Học tập DLU LMS Analytics.
              </p>

            </div>

          </section>


          {/* ================= CONTACT CARDS ================= */}

          <div className="support-grid">

            {/* TECHNICAL SUPPORT */}

            <section className="support-card">

              <div className="support-card-header">

                <div className="support-card-icon support-card-icon-green">
                  <Phone size={18} />
                </div>

                <div className="support-card-heading">
                  <h2>
                    Hỗ trợ kỹ thuật & Hệ thống
                  </h2>

                  <p>
                    Liên hệ khi gặp vấn đề về tài khoản,
                    dữ liệu hoặc kỹ thuật hệ thống.
                  </p>
                </div>

              </div>


              <div className="support-card-divider" />


              <div className="support-info-list">

                <div className="support-info-row">
                  <Building2 size={15} />

                  <div>
                    <span>Đơn vị</span>
                    <strong>
                      Trung tâm CNTT & Thư viện DLU
                    </strong>
                  </div>
                </div>


                <div className="support-info-row">
                  <Phone size={15} />

                  <div>
                    <span>Hotline</span>
                    <strong>
                      (0263) 3822 246
                    </strong>
                  </div>
                </div>


                <div className="support-info-row">
                  <Mail size={15} />

                  <div>
                    <span>Email</span>
                    <strong>
                      itc@dlu.edu.vn
                    </strong>
                  </div>
                </div>

              </div>


              <a
                className="support-action support-action-green"
                href="tel:02633822246"
              >
                <Phone size={15} />
                Liên hệ ngay
              </a>

            </section>


            {/* ACADEMIC SUPPORT */}

            <section className="support-card">

              <div className="support-card-header">

                <div className="support-card-icon support-card-icon-blue">
                  <GraduationCap size={19} />
                </div>

                <div className="support-card-heading">
                  <h2>
                    Hỗ trợ Học vụ & Đào tạo
                  </h2>

                  <p>
                    Liên hệ khi cần hướng dẫn sử dụng hoặc
                    hỗ trợ nghiệp vụ giảng dạy.
                  </p>
                </div>

              </div>


              <div className="support-card-divider" />


              <div className="support-info-list">

                <div className="support-info-row">
                  <Building2 size={15} />

                  <div>
                    <span>Đơn vị</span>
                    <strong>
                      Phòng Quản lý Đào tạo
                    </strong>
                  </div>
                </div>


                <div className="support-info-row">
                  <Mail size={15} />

                  <div>
                    <span>Email</span>
                    <strong>
                      phongdaotao@dlu.edu.vn
                    </strong>
                  </div>
                </div>


                <div className="support-info-row">
                  <Globe size={15} />

                  <div>
                    <span>Website</span>
                    <strong>
                      dlu.edu.vn
                    </strong>
                  </div>
                </div>

              </div>


              <a
                className="support-action support-action-blue"
                href="mailto:phongdaotao@dlu.edu.vn"
              >
                <Mail size={15} />
                Gửi email hỗ trợ
              </a>

            </section>

          </div>


          {/* ================= SYSTEM SCOPE ================= */}

          <section className="support-scope">

            <div className="support-scope-icon">
              <ShieldCheck size={18} />
            </div>

            <div className="support-scope-content">

              <h3>
                Phạm vi hệ thống
              </h3>

              <p>
                Đây là Cổng phân tích dữ liệu học tập
                (LMS Data Warehouse Analytics). Các thao tác
                vận hành nghiệp vụ trực tiếp như biên soạn đề thi,
                nộp bài kiểm tra và chấm bài chi tiết được thực hiện
                trên hệ thống Moodle LMS gốc tại{" "}

                <a
                  href="https://lms.dlu.edu.vn"
                  target="_blank"
                  rel="noreferrer"
                >
                  lms.dlu.edu.vn
                </a>.
              </p>

            </div>

          </section>


          {/* ================= BOTTOM INFO ================= */}

          <div className="support-highlights">

            <div className="support-highlight">

              <div className="support-highlight-icon">
                <Headphones size={16} />
              </div>

              <div>
                <strong>
                  Hỗ trợ nhanh chóng
                </strong>

                <span>
                  Luôn sẵn sàng hỗ trợ giảng viên
                </span>
              </div>

            </div>


            <div className="support-highlight">

              <div className="support-highlight-icon">
                <GraduationCap size={16} />
              </div>

              <div>
                <strong>
                  Đồng hành giảng dạy
                </strong>

                <span>
                  Hỗ trợ khai thác dữ liệu học tập
                </span>
              </div>

            </div>


            <div className="support-highlight">

              <div className="support-highlight-icon">
                <BarChart3 size={16} />
              </div>

              <div>
                <strong>
                  Dữ liệu trực quan
                </strong>

                <span>
                  Phục vụ theo dõi và phân tích
                </span>
              </div>

            </div>

          </div>


          <div className="support-footer">
            DLU LMS Analytics · Hệ thống Phân tích Dữ liệu Học tập
          </div>

        </div>

      </main>

    </div>
  );
}


export default Support;