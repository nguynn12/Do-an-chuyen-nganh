import { getTeacherToken, ensureTeacherToken } from "./authService";

const API_URL = "http://localhost:3000/api";

// ======================================================
// AUTHENTICATED FETCH WRAPPER
// Tự động đính kèm Authorization: Bearer <token> cho mọi API request của giảng viên
// ======================================================

const nativeFetch =
  typeof window !== "undefined" && window.fetch
    ? window.fetch.bind(window)
    : globalThis.fetch;

async function authFetch(url, options = {}) {
  const token = getTeacherToken();
  const headers = {
    ...(options.headers || {}),
  };
  if (token && !headers["Authorization"] && !headers["authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return nativeFetch(url, { ...options, headers });
}

// Ghi đè fetch ở phạm vi module để tự động bảo vệ tất cả 28 endpoint trong service này
const fetch = authFetch;

export async function chatWithClassroomAssistant(courseId, prompt, period, conversationId, signal) {
  const response = await fetch(`${API_URL}/ai/assistant/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ courseId, prompt, period, conversationId }),
  });
  return (await parseResponse(response)).data;
}

export async function getLmsGradeItems(courseId) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grade-sources/lms-items`));
}
export async function syncLmsGrades(courseId) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grade-sources/sync`,{method:'POST'}));
}
export async function linkLmsGradeItem(courseId,itemKey,lmsItemId) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grade-items/${encodeURIComponent(itemKey)}/lms-source`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lmsItemId})}));
}
export async function createIngestGradeItem(courseId,groupKey,name) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grade-sources/items`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupKey,name})}));
}
export async function downloadGradeTemplate(courseId,itemKey) {
  const response=await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grade-items/${encodeURIComponent(itemKey)}/import-template`);
  if(!response.ok) return parseResponse(response);
  return response.blob();
}
export async function importGradeFile(courseId,itemKey,file,mode,digest='') {
  const body=new FormData();body.append('file',file);body.append('mode',mode);body.append('digest',digest);
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grade-items/${encodeURIComponent(itemKey)}/import`,{method:'POST',body}));
}

export async function getSavedGrades(courseId, studentId) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}/saved-grades`));
}

export async function saveGradeGroup(courseId, studentId, group, scores) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}/grade-groups/${encodeURIComponent(group.key)}`, {
    method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({group, scores}),
  }));
}

export async function saveFinalGrade(courseId, studentId) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}/final-grade`, {method:'PUT'}));
}

export async function saveGradeAdjustment(courseId, studentId, itemKey, adjustment) {
  return parseResponse(await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}/grade-items/${encodeURIComponent(itemKey)}/adjustment`, {
    method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(adjustment),
  }));
}

// ======================================================
// HELPER
// ======================================================

async function parseResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("lms-teacher-auth-expired", {
          detail: { message: result?.message || "Phiên đăng nhập LMS đã hết hạn." },
        })
      );
    }
    throw new Error(
      result?.message ||
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
// ĐỌC TOÀN BỘ ĐIỂM ĐÃ CÓ CỦA MỘT SINH VIÊN (READ-ONLY)
//
// GET /api/courses/:courseId/students/:studentId/grades
// ======================================================

export async function getStudentCourseGrades(
  courseId,
  studentId
) {
  const response = await fetch(
    `${API_URL}/courses/${encodeURIComponent(
      courseId
    )}/students/${encodeURIComponent(
      studentId
    )}/grades`
  );

  const result = await parseResponse(
    response
  );

  return result;
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
          endTime: scheduleData.endTime,
          location: scheduleData.location,
          meetingUrl: scheduleData.meetingUrl,
          repeatWeekly: scheduleData.repeatWeekly,
          repeatUntil: scheduleData.repeatUntil,
          allowConflicts: scheduleData.allowConflicts,
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

  return result.events || [result.data];
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
          endTime: scheduleData.endTime,
          location: scheduleData.location,
          meetingUrl: scheduleData.meetingUrl,
          repeatWeekly: scheduleData.repeatWeekly,
          repeatUntil: scheduleData.repeatUntil,
          allowConflicts: scheduleData.allowConflicts,
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


// ======================================================
// LẤY CẢNH BÁO HỌC TẬP TỪ CƠ SỞ DỮ LIỆU THẬT
//
// GET /api/teachers/:teacherId/learning-alerts
// ======================================================

export async function getTeacherLearningAlertsApi(teacherId) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/learning-alerts`
  );

  const result = await parseResponse(response);
  return result.data || [];
}


// ======================================================
// DANH SÁCH KHÓA/COHORT THỰC TẾ CỦA MÔN HỌC
//
// GET /api/courses/:courseId/cohorts
// ======================================================

export async function getCourseCohorts(courseId) {
  const response = await fetch(`${API_URL}/courses/${courseId}/cohorts`);
  const result = await parseResponse(response);
  return result?.data ?? result ?? [];
}


// ======================================================
// THÔNG TIN CHI TIẾT MÔN HỌC
//
// GET /api/courses/:courseId
// ======================================================

export async function getCourseDetails(courseId) {
  const response = await fetch(`${API_URL}/courses/${courseId}`);
  const result = await parseResponse(response);
  return result?.data ?? result;
}


// ======================================================
// HÀNH VI NỘP BÀI (NƯỚC RÚT / TRÌ HOÃN)
//
// GET /api/courses/:courseId/submission-behavior?cohort=K47
// ======================================================

export async function getCourseSubmissionBehavior(courseId, cohort = null) {
  let url = `${API_URL}/courses/${courseId}/submission-behavior`;
  if (cohort) {
    url += `?cohort=${encodeURIComponent(cohort)}`;
  }
  const response = await fetch(url);
  return await parseResponse(response);
}


// ======================================================
// PHÂN KHÚC SINH VIÊN 2x2
//
// GET /api/courses/:courseId/segments?cohort=K47
// ======================================================

export async function getCourseSegments(courseId, cohort = null) {
  let url = `${API_URL}/courses/${courseId}/segments`;
  if (cohort) {
    url += `?cohort=${encodeURIComponent(cohort)}`;
  }
  const response = await fetch(url);
  return await parseResponse(response);
}


// ======================================================
// CẢNH BÁO SỚM & ĐÁNH GIÁ RỦI RO
//
// GET /api/courses/:courseId/risk?cohort=K47
// ======================================================

export async function getCourseRisk(courseId, cohort = null) {
  let url = `${API_URL}/courses/${courseId}/risk`;
  if (cohort) {
    url += `?cohort=${encodeURIComponent(cohort)}`;
  }
  const response = await fetch(url);
  return await parseResponse(response);
}


// NGÂN HÀNG BÀI TẬP & GIAO BÀI & CHẤM ĐIỂM
// ======================================================

export async function getAssignmentBankApi(teacherId, courseId, filters = {}) {
  const params = new URLSearchParams({ courseId, ...filters });
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/assignments/bank?${params.toString()}`
  );
  return await parseResponse(response);
}

export async function createAssignmentBankItemApi(teacherId, data) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/assignments/bank`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  return await parseResponse(response);
}

export async function updateAssignmentBankItemApi(teacherId, itemId, data) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/assignments/bank/${itemId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  return await parseResponse(response);
}

export async function previewRandomDistributionApi(teacherId, payload) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/assignments/campaigns/preview-random`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return await parseResponse(response);
}

export async function confirmAssignmentCampaignApi(teacherId, payload) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/assignments/campaigns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return await parseResponse(response);
}

export async function getAssignmentCampaignsApi(teacherId, courseId) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/assignments/campaigns?courseId=${encodeURIComponent(courseId)}`
  );
  return await parseResponse(response);
}

export async function getGradingSubmissionsApi(teacherId, filters = {}) {
  const cleanParams = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      cleanParams.append(k, v);
    }
  });

  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/grading/submissions?${cleanParams.toString()}`
  );
  return await parseResponse(response);
}

export async function submitGradingApi(teacherId, submissionId, payload) {
  const response = await fetch(
    `${API_URL}/teachers/${teacherId}/grading/submissions/${submissionId}/grade`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return await parseResponse(response);
}

// ======================================================
// TRỢ LÝ AI LMS (TASK 02)
// POST /api/ai/assistant/query
// ======================================================

export async function queryAiAssistant(courseId, promptText) {
  let token = getTeacherToken();
  if (!token) {
    token = await ensureTeacherToken();
  }

  const response = await fetch(`${API_URL}/ai/assistant/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      courseId: Number(courseId),
      promptText: String(promptText || "").trim(),
    }),
  });

  return await parseResponse(response);
}


export async function getAssignmentMonitoringApi(teacherId,courseId,signal) {
  const response=await fetch(`${API_URL}/teachers/${teacherId}/assignments/monitor?courseId=${encodeURIComponent(courseId)}`,{signal});
  return parseResponse(response);
}

export async function updateLearningAlertApi(teacherId, alertId, read) {
  return parseResponse(await fetch(`${API_URL}/teachers/${teacherId}/learning-alerts/${encodeURIComponent(alertId)}`, {
    method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({read}),
  }));
}
export async function markAllLearningAlertsApi(teacherId) {
  return parseResponse(await fetch(`${API_URL}/teachers/${teacherId}/learning-alerts/read-all`, {
    method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({read:true}),
  }));
}
export async function deleteLearningAlertApi(teacherId, alertId) {
  return parseResponse(await fetch(`${API_URL}/teachers/${teacherId}/learning-alerts/${encodeURIComponent(alertId)}`, {method:'DELETE'}));
}
export async function broadcastLearningAlertApi(teacherId, payload) {
  return parseResponse(await fetch(`${API_URL}/teachers/${teacherId}/learning-alerts/broadcast`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
  }));
}
export async function getTeacherActivityApi(teacherId) {
  return (await parseResponse(await fetch(`${API_URL}/teachers/${teacherId}/activity`))).data;
}

export async function exportClassGradesApi(courseId, cohort) {
  const response = await fetch(`${API_URL}/courses/${encodeURIComponent(courseId)}/grades/export?cohort=${encodeURIComponent(cohort)}`);
  if (!response.ok) await parseResponse(response);
  return response.blob();
}
