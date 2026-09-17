import { useState } from "react";

import {
  Bell,
  BookOpen,
  ClipboardList,
  FileCheck2,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/notificationApi";


// ======================================================
// FORMAT THỜI GIAN THÔNG BÁO
// ======================================================

function formatNotificationTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const diff =
    now.getTime() -
    date.getTime();

  const minutes =
    Math.floor(
      diff / 60000
    );


  if (
    minutes >= 0 &&
    minutes < 1
  ) {
    return "Vừa xong";
  }


  if (
    minutes >= 1 &&
    minutes < 60
  ) {
    return `${minutes} phút trước`;
  }


  const hours =
    Math.floor(
      minutes / 60
    );


  if (
    hours >= 1 &&
    hours < 24
  ) {
    return `${hours} giờ trước`;
  }


  return date.toLocaleString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}


// ======================================================
// ICON THEO LOẠI THÔNG BÁO
// ======================================================

function getIcon(type) {
  switch (type) {
    case "ASSIGNMENT":
      return (
        <ClipboardList
          size={14}
        />
      );

    case "COURSE":
      return (
        <BookOpen
          size={14}
        />
      );

    case "SUBMISSION":
      return (
        <FileCheck2
          size={14}
        />
      );

    case "SYSTEM":
      return (
        <Settings
          size={14}
        />
      );

    default:
      return (
        <Bell
          size={14}
        />
      );
  }
}


// ======================================================
// COMPONENT
// ======================================================

function Notifications({
  notifications = [],
  onNotificationsChange,
  teacherId,
}) {

  // ====================================================
  // XEM TẤT CẢ / THU GỌN
  // ====================================================

  const [
    showAll,
    setShowAll,
  ] = useState(false);


  // ====================================================
  // SỐ THÔNG BÁO CHƯA ĐỌC
  // ====================================================

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.isRead
    ).length;


  // ====================================================
  // SORT
  //
  // 1. Chưa đọc lên trước
  // 2. Mới nhất lên trước
  // ====================================================

  const sortedNotifications =
    [...notifications].sort(
      (a, b) => {

        if (
          a.isRead !==
          b.isRead
        ) {
          return a.isRead
            ? 1
            : -1;
        }


        const timeA =
          new Date(
            a.createdAt
          ).getTime();

        const timeB =
          new Date(
            b.createdAt
          ).getTime();


        return timeB - timeA;
      }
    );


  // ====================================================
  // DANH SÁCH HIỂN THỊ
  // ====================================================

  const displayNotifications =
    showAll
      ? sortedNotifications
      : sortedNotifications.slice(
          0,
          3
        );


  // ====================================================
  // CLICK 1 THÔNG BÁO
  // ====================================================

  const handleNotificationClick =
    async (notification) => {

      // ----------------------------------------------
      // Đã đọc rồi thì không gọi API lại
      // ----------------------------------------------

      if (notification.isRead) {
        return;
      }


      // ----------------------------------------------
      // Kiểm tra dữ liệu cần thiết
      // ----------------------------------------------

      if (!teacherId) {
        console.error(
          "Không tìm thấy teacherId."
        );

        return;
      }


      if (!notification.id) {
        console.error(
          "Thông báo không có id:",
          notification
        );

        return;
      }


      try {

        // --------------------------------------------
        // UPDATE DATABASE
        // --------------------------------------------

        await markNotificationAsRead(
          teacherId,
          notification.id
        );


        // --------------------------------------------
        // UPDATE STATE FRONTEND
        // --------------------------------------------

        if (onNotificationsChange) {

          const updatedNotifications =
            notifications.map(
              (item) => {

                if (
                  item.id ===
                  notification.id
                ) {
                  return {
                    ...item,
                    isRead: true,
                    readAt:
                      new Date().toISOString(),
                  };
                }


                return item;
              }
            );


          onNotificationsChange(
            updatedNotifications
          );
        }

      } catch (error) {

        console.error(
          "Lỗi đánh dấu thông báo đã đọc:",
          error
        );
      }
    };


  // ====================================================
  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
  // ====================================================

  const handleMarkAllAsRead =
    async () => {

      if (
        unreadCount === 0
      ) {
        return;
      }


      if (!teacherId) {
        console.error(
          "Không tìm thấy teacherId."
        );

        return;
      }


      try {

        // --------------------------------------------
        // UPDATE DATABASE
        // --------------------------------------------

        await markAllNotificationsAsRead(
          teacherId
        );


        // --------------------------------------------
        // UPDATE FRONTEND
        // --------------------------------------------

        if (onNotificationsChange) {

          const now =
            new Date().toISOString();


          const updatedNotifications =
            notifications.map(
              (item) => ({
                ...item,

                isRead: true,

                readAt:
                  item.readAt ||
                  now,
              })
            );


          onNotificationsChange(
            updatedNotifications
          );
        }

      } catch (error) {

        console.error(
          "Lỗi đánh dấu tất cả đã đọc:",
          error
        );
      }
    };


  // ====================================================
  // KEYBOARD
  // ====================================================

  const handleKeyDown =
    (
      event,
      notification
    ) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();

        handleNotificationClick(
          notification
        );
      }
    };


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="right-card">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="right-heading">

        <div>

          <Bell size={18} />

          <strong>
            Thông báo lớp học & Hệ thống
          </strong>

        </div>


        {unreadCount > 0 && (

          <span className="badge">
            {unreadCount}
          </span>

        )}

      </div>


      {/* =================================================
          EMPTY
      ================================================= */}

      {notifications.length === 0 ? (

        <div className="empty-row">
          Không có thông báo.
        </div>

      ) : (

        <>
          {/* =============================================
              NOTIFICATION LIST
          ============================================= */}

          <div
            className={
              showAll
                ? "notification-list notification-list-expanded"
                : "notification-list"
            }
          >

            {displayNotifications.map(
              (notification) => (

                <div
                  key={
                    notification.id
                  }

                  className={
                    `notification ${
                      notification.isRead
                        ? "notification-read"
                        : "notification-unread"
                    }`
                  }

                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }

                  onKeyDown={(
                    event
                  ) =>
                    handleKeyDown(
                      event,
                      notification
                    )
                  }

                  role="button"

                  tabIndex={0}

                  title={
                    notification.message ||
                    notification.title
                  }

                  style={{
                    cursor:
                      notification.isRead
                        ? "default"
                        : "pointer",
                  }}
                >

                  {/* ==============================
                      TRẠNG THÁI
                  ============================== */}

                  <i />


                  {/* ==============================
                      ICON
                  ============================== */}

                  <div className="notification-small-icon">

                    {getIcon(
                      notification.type
                    )}

                  </div>


                  {/* ==============================
                      CONTENT
                  ============================== */}

                  <div className="notification-content">

                    <strong>
                      {notification.title}
                    </strong>


                    <span>
                      {formatNotificationTime(
                        notification.createdAt
                      )}
                    </span>

                  </div>

                </div>

              )
            )}

          </div>


          {/* =============================================
              ACTIONS
          ============================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                unreadCount > 0
                  ? "space-between"
                  : "flex-end",
              alignItems: "center",
              gap: "12px",
              marginTop: "10px",
            }}
          >

            {/* ===========================================
                MARK ALL
            =========================================== */}

            {unreadCount > 0 && (

              <button
                type="button"

                onClick={
                  handleMarkAllAsRead
                }

                style={{
                  border: "none",
                  background:
                    "transparent",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "#666",
                  padding: 0,
                }}
              >
                Đánh dấu tất cả đã đọc
              </button>

            )}


            {/* ===========================================
                XEM TẤT CẢ / THU GỌN
            =========================================== */}

            {notifications.length > 3 && (

              <button
                type="button"

                onClick={() =>
                  setShowAll(
                    (current) =>
                      !current
                  )
                }

                style={{
                  border: "none",
                  background:
                    "transparent",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "#666",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >

                {showAll ? (
                  <>
                    Thu gọn

                    <ChevronUp
                      size={13}
                    />
                  </>
                ) : (
                  <>
                    Xem tất cả

                    <ChevronDown
                      size={13}
                    />
                  </>
                )}

              </button>

            )}

          </div>
        </>
      )}

    </div>
  );
}


export default Notifications;