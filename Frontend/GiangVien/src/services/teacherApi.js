const API_URL = "http://localhost:3000/api";


// ======================================================
// HELPER
// ======================================================

async function parseResponse(response) {
  const result =
    await response.json();

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
  const response =
    await fetch(
      `${API_URL}/teachers/${teacherId}`
    );

  const result =
    await parseResponse(
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
  const response =
    await fetch(
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
  const response =
    await fetch(
      `${API_URL}/teachers/${teacherId}/courses`
    );

  const result =
    await parseResponse(
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
// GET /api/courses/:courseId/students
// ======================================================

export async function getCourseStudents(
  courseId
) {
  const response =
    await fetch(
      `${API_URL}/courses/${courseId}/students`
    );

  const result =
    await parseResponse(
      response
    );

  return result.data;
}


// ======================================================
// THỐNG KÊ SINH VIÊN TRONG MÔN
// GET /api/courses/:courseId/student-analytics
// ======================================================

export async function getCourseStudentAnalytics(
  courseId
) {
  const response =
    await fetch(
      `${API_URL}/courses/${courseId}/student-analytics`
    );

  const result =
    await parseResponse(
      response
    );

  return result.data;
}


// ======================================================
// PHÂN BỐ ĐIỂM SỐ THEO TỪNG BÀI ĐÁNH GIÁ (HISTOGRAM)
// GET /api/courses/:courseId/grade-distribution
// ======================================================

export async function getCourseGradeDistribution(
  courseId
) {
  const response =
    await fetch(
      `${API_URL}/courses/${courseId}/grade-distribution`
    );

  const result =
    await parseResponse(
      response
    );

  return result.data;
}


// ======================================================
// XU HƯỚNG ENGAGEMENT LỚP THEO TUẦN (LINE CHART)
// GET /api/courses/:courseId/engagement-trend
// ======================================================

export async function getCourseEngagementTrend(
  courseId
) {
  const response =
    await fetch(
      `${API_URL}/courses/${courseId}/engagement-trend`
    );

  const result =
    await parseResponse(
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
    `${API_URL}/teachers/${teacherId}/schedule`;

  if (month) {
    url +=
      `?month=${encodeURIComponent(
        month
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