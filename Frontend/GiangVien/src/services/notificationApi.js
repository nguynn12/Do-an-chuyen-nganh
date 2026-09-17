const API_BASE_URL = "http://localhost:3000/api";


// ======================================================
// LẤY DANH SÁCH THÔNG BÁO
//
// status:
// - ""       -> tất cả
// - "unread" -> chưa đọc
// - "read"   -> đã đọc
// ======================================================

export async function getNotifications(
  teacherId,
  status = ""
) {
  let url =
    `${API_BASE_URL}/teachers/${teacherId}/notifications`;

  if (status) {
    url += `?status=${encodeURIComponent(status)}`;
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        "Không thể lấy danh sách thông báo."
    );
  }

  return result;
}


// ======================================================
// ĐẾM THÔNG BÁO CHƯA ĐỌC
// ======================================================

export async function getUnreadNotificationCount(
  teacherId
) {
  const response = await fetch(
    `${API_BASE_URL}/teachers/${teacherId}/notifications/unread-count`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        "Không thể lấy số thông báo chưa đọc."
    );
  }

  return result;
}


// ======================================================
// ĐÁNH DẤU 1 THÔNG BÁO ĐÃ ĐỌC
// ======================================================

export async function markNotificationAsRead(
  teacherId,
  notificationId
) {
  const response = await fetch(
    `${API_BASE_URL}/teachers/${teacherId}/notifications/${notificationId}/read`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        "Không thể đánh dấu thông báo đã đọc."
    );
  }

  return result;
}


// ======================================================
// ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC
// ======================================================

export async function markAllNotificationsAsRead(
  teacherId
) {
  const response = await fetch(
    `${API_BASE_URL}/teachers/${teacherId}/notifications/read-all`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        "Không thể đánh dấu tất cả thông báo đã đọc."
    );
  }

  return result;
}