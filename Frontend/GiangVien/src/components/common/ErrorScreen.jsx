function ErrorScreen({ message }) {
  return (
    <div className="dashboard-state">
      <h2>Không thể tải dashboard</h2>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>Tải lại</button>
    </div>
  );
}

export default ErrorScreen;
