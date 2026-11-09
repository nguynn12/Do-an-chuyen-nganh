import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearTeacherSession } from "./services/authService";

import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/TeacherPageBackground.css";

import Login from "./pages/Login";
import TeacherOverview from "./pages/TeacherOverview";
import TeachingSchedule from "./pages/TeachingSchedule";
import FloatingClassroomChat from './components/ai-assistant/FloatingClassroomChat';
import Courses from "./pages/Courses";
import Grading from "./pages/Grading";
import ClassManagement from "./pages/ClassManagement";
import Messages from "./pages/Messages";
import Support from "./pages/Support";
import SimplePage from "./pages/SimplePage";
import Analytics from "./pages/Analytics";
import TeacherProfile from "./pages/TeacherProfile";
import AssignmentManagement from "./pages/AssignmentManagement";

// ============================================================
// THÊM - TRANG SO SÁNH LỚP HỌC
// ============================================================
import ClassComparison from "./pages/ClassComparison/ClassComparison";
import './styles/TeacherDesignSystem.css';


function PrivatePage({ children }) {
  return <ProtectedRoute><div className="teacher-page-background">{children}<FloatingClassroomChat /></div></ProtectedRoute>;
}


function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Khi nhận thông báo phiên đăng nhập LMS hết hạn (401)
    // Tự động dọn dẹp phiên LMS nội bộ và điều hướng về trang đăng nhập
    // TUÂN THỦ: Bảo toàn nguyên vẹn token Microsoft MSAL trong sessionStorage
    const handleAuthExpired = () => {
      clearTeacherSession();
      navigate("/dang-nhap", { replace: true });
    };

    window.addEventListener("lms-teacher-auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("lms-teacher-auth-expired", handleAuthExpired);
    };
  }, [navigate]);

  return (
    <Routes>

      {/* =====================================================
          ĐĂNG NHẬP
      ===================================================== */}

      <Route
        path="/dang-nhap"
        element={<Login />}
      />


      {/* =====================================================
          TỔNG QUAN
      ===================================================== */}

      <Route
        path="/"
        element={
          <PrivatePage>
            <TeacherOverview />
          </PrivatePage>
        }
      />


      {/* =====================================================
          KHÓA HỌC
      ===================================================== */}

      <Route
        path="/khoa-hoc"
        element={
          <PrivatePage>
            <Courses />
          </PrivatePage>
        }
      />


      {/* =====================================================
          QUẢN LÝ LỚP
      ===================================================== */}

      <Route
        path="/quan-ly-lop/:courseId"
        element={
          <PrivatePage>
            <ClassManagement />
          </PrivatePage>
        }
      />


      {/* =====================================================
          THEO DÕI CHẤM ĐIỂM
      ===================================================== */}

      <Route
        path="/cham-diem/:courseId"
        element={
          <PrivatePage>
            <Grading />
          </PrivatePage>
        }
      />

      <Route
        path="/cham-diem"
        element={
          <PrivatePage>
            <Grading />
          </PrivatePage>
        }
      />


      {/* =====================================================
          QUẢN LÝ BÀI TẬP, GIAO BÀI & CHẤM ĐIỂM (MODULE MẠNH)
      ===================================================== */}

      <Route
        path="/quan-ly-bai-tap"
        element={
          <PrivatePage>
            <AssignmentManagement />
          </PrivatePage>
        }
      />

      <Route
        path="/quan-ly-bai-tap/:courseId"
        element={
          <PrivatePage>
            <AssignmentManagement />
          </PrivatePage>
        }
      />

      <Route
        path="/bai-cho-cham"
        element={
          <PrivatePage>
            <AssignmentManagement />
          </PrivatePage>
        }
      />


      {/* =====================================================
          THÔNG BÁO HỆ THỐNG
      ===================================================== */}

      <Route
        path="/tin-nhan"
        element={
          <PrivatePage>
            <Messages />
          </PrivatePage>
        }
      />


      {/* =====================================================
          HỖ TRỢ
      ===================================================== */}

      <Route
        path="/ho-tro"
        element={
          <PrivatePage>
            <Support />
          </PrivatePage>
        }
      />

      <Route
        path="/yeu-cau-ho-tro"
        element={
          <PrivatePage>
            <Support />
          </PrivatePage>
        }
      />


      {/* =====================================================
          LỊCH GIẢNG DẠY
      ===================================================== */}

      <Route
        path="/lich"
        element={
          <PrivatePage>
            <TeachingSchedule />
          </PrivatePage>
        }
      />


      {/* =====================================================
          POWER BI - PHÂN TÍCH
      ===================================================== */}

      <Route
        path="/phan-tich"
        element={
          <PrivatePage>
            <Analytics />
          </PrivatePage>
        }
      />

      {/* =====================================================
          AI DASHBOARD STUDIO
      ===================================================== */}

      <Route
        path="/ai-studio"
        element={
          <PrivatePage>
            <Analytics defaultStudioOpen={true} />
          </PrivatePage>
        }
      />


      {/* =====================================================
          HỒ SƠ GIẢNG VIÊN
      ===================================================== */}

      <Route
        path="/ho-so"
        element={
          <PrivatePage>
            <TeacherProfile />
          </PrivatePage>
        }
      />


      {/* =====================================================
          SO SÁNH LỚP HỌC
          
          Ví dụ URL:
          /so-sanh-lop
            ?courseA=12
            &cohortA=K47
            &courseB=10
            &cohortB=K45
      ===================================================== */}

      <Route
        path="/so-sanh-lop"
        element={
          <PrivatePage>
            <ClassComparison />
          </PrivatePage>
        }
      />


      {/* =====================================================
          ROUTE KHÔNG TỒN TẠI
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}


export default App;
