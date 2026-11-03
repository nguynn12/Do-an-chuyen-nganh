function LoadingScreen({ message = "Đang tải dữ liệu giảng viên..." }) {
  return (
    <div className="dashboard-state" role="status" aria-live="polite">
      <div className="loader" aria-hidden="true"></div>
      <p>{message}</p>
    </div>
  );
}

export default LoadingScreen;
