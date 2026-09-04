import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Notifications({ notifications }) {
  const navigate = useNavigate();
  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <div className="right-card">
      <div className="right-heading">
        <div>
          <Bell size={18} />
          <strong>Thông báo lớp học & Hệ thống</strong>
        </div>

        <span className="badge">{unreadCount}</span>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-row">Không có thông báo mới.</div>
      ) : (
        notifications.slice(0, 3).map((notification) => (
          <div
            className="notification"
            key={notification.id}
            onClick={() => navigate("/tin-nhan")}
          >
            <i></i>
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.time}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Notifications;
