import {
  getTeacherCalendar as getTeacherCalendarService,
} from "../services/calendarService.js";


// ============================================================
// GET CALENDAR GIẢNG VIÊN
//
// GET /api/teachers/:teacherId/calendar
//
// Ví dụ:
// /api/teachers/2/calendar
// ============================================================

export async function getTeacherCalendar(req, res) {
  try {
    const { teacherId } = req.params;

    // ========================================================
    // VALIDATE TEACHER ID
    // ========================================================

    const parsedTeacherId = Number(teacherId);

    if (
      !Number.isInteger(parsedTeacherId) ||
      parsedTeacherId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "teacherId không hợp lệ.",
      });
    }


    // ========================================================
    // GỌI SERVICE
    // ========================================================

    const result =
      await getTeacherCalendarService(
        parsedTeacherId
      );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error(
      "Lỗi getTeacherCalendar:",
      error
    );

    const statusCode =
      error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,

      message:
        error.message ||
        "Không thể lấy dữ liệu lịch giảng viên.",
    });
  }
}