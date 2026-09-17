const API_URL = "http://localhost:3000/api";


// ======================================================
// HELPER
// ======================================================

async function parseResponse(response) {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Có lỗi xảy ra khi gọi API."
    );
  }

  return result;
}


// ======================================================
// THÔNG TIN GIẢNG VIÊN
// GET /api/teachers/:teacherId
// ======================================================

export async function getTeacher(
  teacherId
) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}`
  );

  const result = await parseResponse(
    response
  );

  return result.data;
}


// ======================================================
// DASHBOARD TỔNG QUAN
// GET /api/teachers/:teacherId/dashboard
// ======================================================

export async function getTeacherDashboard(
  teacherId
) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/dashboard`
  );

  return await parseResponse(
    response
  );
}


// ======================================================
// DANH SÁCH MÔN GIẢNG VIÊN ĐANG DẠY
// GET /api/teachers/:teacherId/courses
// ======================================================

export async function getTeacherCourses(
  teacherId
) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/courses`
  );

  const result = await parseResponse(
    response
  );

  return result.data;
}


// ======================================================
// DANH SÁCH BÀI CHỜ CHẤM
//
// TẤT CẢ:
// GET /api/teachers/:teacherId/grading
//
// THEO MÔN:
// GET /api/teachers/:teacherId/grading?courseId=101
// ======================================================

export async function getTeacherGrading(
  teacherId,
  courseId = null
) {
  let url =
    `${API_URL}/teachers/${teacherId}/grading`;

  if (courseId) {
    url +=
      `?courseId=${encodeURIComponent(
        courseId
      )}`;
  }

  const response =
    await fetch(url);

  const result =
    await parseResponse(
      response
    );

  return result.data;
}


// ======================================================
// SINH VIÊN TRONG MÔN
//
// QUAN TRỌNG:
// cohort = K45 / K46 / K47
//
// Ví dụ:
// GET /api/courses/104/students?cohort=K46
// ======================================================

export async function getCourseStudents(
  courseId,
  cohort = "K47"
) {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/students?cohort=${encodeURIComponent(
      cohort
    )}`
  );

  const result = await parseResponse(
    response
  );

  return result.data;
}


// ======================================================
// THỐNG KÊ SINH VIÊN TRONG MÔN
//
// Ví dụ:
// GET /api/courses/104/student-analytics?cohort=K46
// ======================================================

export async function getCourseStudentAnalytics(
  courseId,
  cohort = "K47"
) {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/student-analytics?cohort=${encodeURIComponent(
      cohort
    )}`
  );

  const result = await parseResponse(
    response
  );

  return result.data;
}


// ======================================================
// PHÂN BỐ ĐIỂM SỐ
//
// Ví dụ:
// GET /api/courses/104/grade-distribution?cohort=K46
// ======================================================

export async function getCourseGradeDistribution(
  courseId,
  cohort = "K47"
) {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/grade-distribution?cohort=${encodeURIComponent(
      cohort
    )}`
  );

  const result = await parseResponse(
    response
  );

  return result.data;
}


// ======================================================
// XU HƯỚNG ENGAGEMENT LỚP THEO TUẦN
//
// Ví dụ:
// GET /api/courses/104/engagement-trend?cohort=K46
// ======================================================

export async function getCourseEngagementTrend(
  courseId,
  cohort = "K47"
) {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/engagement-trend?cohort=${encodeURIComponent(
      cohort
    )}`
  );

  const result = await parseResponse(
    response
  );

  return result.data || [];
}


// ======================================================
// LẤY LỊCH GIẢNG VIÊN
//
// GET /api/teachers/:teacherId/schedule
//
// THEO THÁNG:
// GET /api/teachers/:teacherId/schedule?month=2026-08
// ======================================================

export async function getTeacherScheduleApi(
  teacherId,
  month = null
) {
  let url =
    `${API_URL}/teachers/${teacherId}/calendar`;

  if (month) {
    const [year, monthNumber] =
      month.split("-");

    url +=
      `?year=${encodeURIComponent(
        year
      )}&month=${encodeURIComponent(
        Number(monthNumber)
      )}`;
  }

  const response =
    await fetch(url);

  const result =
    await parseResponse(
      response
    );

  // API calendar mới trả:
  // result.data.events
  const events =
    result?.data?.events || [];

  // Chuẩn hóa để Calendar.jsx có thể so sánh
  // item.date === "YYYY-MM-DD"
  return events.map((event) => {
    let date = "";

    if (event.date) {
      date = String(
        event.date
      ).substring(0, 10);
    }

    return {
      ...event,

      date,

      // LMS không được sửa/xóa
      editable:
        event.source === "lms"
          ? false
          : event.editable !== false,
    };
  });
}


// ======================================================
// TẠO LỊCH
//
// POST /api/teachers/:teacherId/schedule
// ======================================================

export async function createTeacherScheduleApi(
  teacherId,
  scheduleData
) {
  const response =
    await fetch(
      `${API_URL}/teachers/${teacherId}/schedule`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          date:
            scheduleData.date,

          time:
            scheduleData.time ||
            null,

          title:
            scheduleData.title,

          type:
            scheduleData.type ||
            "class",

          description:
            scheduleData.description ||
            "",
        }),
      }
    );

  const result =
    await parseResponse(
      response
    );

  return result.data;
}


// ======================================================
// CẬP NHẬT LỊCH
//
// PUT
// /api/teachers/:teacherId/schedule/:scheduleId
// ======================================================

export async function updateTeacherScheduleApi(
  teacherId,
  scheduleId,
  scheduleData
) {
  const response =
    await fetch(
      `${API_URL}/teachers/${teacherId}/schedule/${scheduleId}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          date:
            scheduleData.date,

          time:
            scheduleData.time ||
            null,

          title:
            scheduleData.title,

          type:
            scheduleData.type ||
            "class",

          description:
            scheduleData.description ||
            "",
        }),
      }
    );

  const result =
    await parseResponse(
      response
    );

  return result.data;
}


// ======================================================
// XÓA LỊCH
//
// DELETE
// /api/teachers/:teacherId/schedule/:scheduleId
// ======================================================

export async function deleteTeacherScheduleApi(
  teacherId,
  scheduleId
) {
  const response =
    await fetch(
      `${API_URL}/teachers/${teacherId}/schedule/${scheduleId}`,
      {
        method:
          "DELETE",
      }
    );

  return await parseResponse(
    response
  );
}