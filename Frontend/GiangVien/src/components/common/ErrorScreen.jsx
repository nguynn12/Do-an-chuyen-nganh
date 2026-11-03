function ErrorScreen({ message, onRetry }) {
  return (
    <div className="dashboard-state" role="alert" aria-live="assertive">
      <h2>Không thể tải dashboard</h2>
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry || (() => window.location.reload())}
      >
        Tải lại
      </button>
    </div>
  );
}

export default ErrorScreen;
