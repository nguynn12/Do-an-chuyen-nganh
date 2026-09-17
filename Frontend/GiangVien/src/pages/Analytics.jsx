import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";

import useTeacherDashboard from "../hooks/useTeacherDashboard";

import "../styles/Analytics.css";

function Analytics() {
  const {
    teacher,
    loading,
    error,
  } = useTeacherDashboard();

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !teacher) {
    return (
      <ErrorScreen
        message={
          error ||
          "Thiếu dữ liệu giảng viên."
        }
      />
    );
  }

  return (
    <div className="app">

      {/* HEADER */}
      <Header teacher={teacher} />

      {/* SIDEBAR */}
      <Sidebar />

      {/* PAGE CONTENT */}
      <main className="page analytics-layout">

        <div className="analytics-page">

          <div className="analytics-header">
            <h1>Phân tích học tập</h1>

            <p>
              Theo dõi mức độ sử dụng tài liệu học tập
              và mức độ tương tác của sinh viên.
            </p>
          </div>

          <div className="powerbi-container">
  <iframe
    title="LMS_Analytics"
    src="https://app.powerbi.com/view?r=eyJrIjoiN2NkMjk3MzUtMWU4MS00ODIwLWE5Y2YtYWYzNTA1N2EzMWI3IiwidCI6Ijg0NTAzNjliLTExZmEtNDQxMy04ZGM3LTA2MGFiOWYzNGY0MSIsImMiOjEwfQ%3D%3D&pageName=ee15a79c9e07c0ed161c"
    frameBorder="0"
    allowFullScreen
  />
</div>

        </div>

      </main>

    </div>
  );
}

export default Analytics;