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

function PrivatePage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  return (
    <Routes>
      {/* Đăng nhập */}
      <Route path="/dang-nhap" element={<Login />} />

      {/* Tổng quan */}
      <Route
        path="/"
        element={
          <PrivatePage>
            <TeacherOverview />
          </PrivatePage>
        }
      />

      {/* Khóa học */}
      <Route
        path="/khoa-hoc"
        element={
          <PrivatePage>
            <Courses />
          </PrivatePage>
        }
      />

      {/* Quản lý lớp */}
      <Route
        path="/quan-ly-lop/:courseId"
        element={
          <PrivatePage>
            <ClassManagement />
          </PrivatePage>
        }
      />

      {/* Chấm điểm */}
      <Route
        path="/cham-diem/:courseId"
        element={
          <PrivatePage>
            <Grading />
          </PrivatePage>
        }
      />

      <Route
        path="/bai-cho-cham"
        element={
          <PrivatePage>
            <Grading />
          </PrivatePage>
        }
      />

      {/* Tin nhắn */}
      <Route
        path="/tin-nhan"
        element={
          <PrivatePage>
            <Messages />
          </PrivatePage>
        }
      />

      {/* Hỗ trợ */}
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

      {/* Lịch */}
      <Route
        path="/lich"
        element={
          <PrivatePage>
            <SimplePage title="Lịch giảng dạy" />
          </PrivatePage>
        }
      />

      {/* POWER BI - PHÂN TÍCH */}
      <Route
        path="/phan-tich"
        element={
          <PrivatePage>
            <Analytics />
          </PrivatePage>
        }
      />

      {/* Phúc khảo */}
      <Route
        path="/phuc-khao"
        element={
          <PrivatePage>
            <SimplePage title="Xét duyệt phúc khảo" />
          </PrivatePage>
        }
      />

      {/* Đề thi */}
      <Route
        path="/de-thi"
        element={
          <PrivatePage>
            <SimplePage title="Quản lý đề thi" />
          </PrivatePage>
        }
      />

      {/* Route không tồn tại */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;