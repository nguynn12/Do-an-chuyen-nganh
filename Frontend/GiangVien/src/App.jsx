import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import TeacherOverview from "./pages/TeacherOverview";
import Courses from "./pages/Courses";
import Grading from "./pages/Grading";
import ClassManagement from "./pages/ClassManagement";
import Messages from "./pages/Messages";
import Support from "./pages/Support";
import SimplePage from "./pages/SimplePage";
import Analytics from "./pages/Analytics";
import TeacherProfile from "./pages/TeacherProfile";

// ============================================================
// THÊM - TRANG SO SÁNH LỚP HỌC
// ============================================================
import ClassComparison from "./pages/ClassComparison/ClassComparison";


function PrivatePage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}


function App() {
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
          CHẤM ĐIỂM
      ===================================================== */}

      <Route
        path="/cham-diem/:courseId"
        element={
          <PrivatePage>
            <Grading />
          </PrivatePage>
        }
      />


      {/* =====================================================
          BÀI CHỜ CHẤM
      ===================================================== */}

      <Route
        path="/bai-cho-cham"
        element={
          <PrivatePage>
            <Grading />
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
            <TeacherOverview />
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