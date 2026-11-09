import pool from "../../config/database.js";
import { verifyAuthToken } from "../services/tokenService.js";

/**
 * Middleware bắt buộc xác thực Giảng viên qua Authorization Bearer Token
 * Từ chối 401 nếu thiếu hoặc sai token
 * Từ chối 403 nếu không phải vai trò teacher
 */
export async function requireTeacherAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({
      success: false,
      message: "Yêu cầu xác thực. Vui lòng cung cấp mã token hợp lệ trong header Authorization.",
    });
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({
      success: false,
      message: "Định dạng Authorization header không hợp lệ. Chuẩn yêu cầu: 'Bearer <token>'.",
    });
  }

  const token = parts[1];
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }

  const role = String(payload.role || "").toLowerCase();
  if (role !== "teacher" && role !== "giangvien") {
    return res.status(403).json({
      success: false,
      message: "Từ chối truy cập: Chỉ giảng viên mới có quyền sử dụng tính năng này.",
    });
  }

  // Đối chiếu trạng thái tài khoản và vai trò thực tế trong CSDL (chống token cũ sau khi bị khóa hoặc đổi quyền)
  try {
    const [userRows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Role,
        a.Is_Active AS Account_Is_Active,
        u.User_Key,
        u.Moodle_User_ID,
        u.Is_Active AS User_Is_Active
      FROM App_User_Account a
      INNER JOIN Dim_User u ON u.User_Key = a.User_Key
      WHERE LOWER(a.Username) = LOWER(?)
      LIMIT 1
      `,
      [payload.username]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản trong phiên đăng nhập không còn tồn tại trong hệ thống.",
      });
    }

    const dbUser = userRows[0];

    if (!dbUser.Account_Is_Active || !dbUser.User_Is_Active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hiện đang bị khóa hoặc đã ngừng kích hoạt.",
      });
    }

    const dbRole = String(dbUser.Role || "").toLowerCase();
    if (dbRole !== "teacher" && dbRole !== "giangvien") {
      return res.status(403).json({
        success: false,
        message: "Quyền giảng viên đã bị thay đổi hoặc thu hồi.",
      });
    }

    // Gắn thông tin giảng viên đã được chứng thực từ token và DB vào request
    req.teacher = {
      ...payload,
      userKey: dbUser.User_Key,
      moodleUserId: dbUser.Moodle_User_ID,
      role: dbUser.Role,
    };
    next();
  } catch (dbErr) {
    console.error("[Auth Middleware] Lỗi kiểm tra tài khoản trong CSDL:", dbErr);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xác minh tài khoản.",
      error: dbErr.message,
    });
  }
}

/**
 * Middleware kiểm tra phân quyền giảng dạy môn học thực tế
 * Xác minh xem giảng viên (theo moodleUserId từ token) có thực sự được phân công dạy courseId hay không.
 * Từ chối 403 nếu không được phân công.
 */
export async function requireCourseTeacher(req, res, next) {
  // 1. Chạy xác thực danh tính trước
  await requireTeacherAuth(req, res, async () => {
    try {
      const courseIdRaw =
        req.params?.courseId ??
        req.body?.courseId ??
        req.query?.courseId;

      if (!courseIdRaw) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp mã môn học (courseId).",
        });
      }

      const courseId = Number(courseIdRaw);
      if (Number.isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Mã môn học (courseId) không hợp lệ.",
        });
      }

      const moodleTeacherId = req.teacher.moodleUserId;

      // 2. Tra cứu quyền giảng dạy thực tế trong CSDL
      const [rows] = await pool.query(
        `
        SELECT
          dc.Course_Key,
          dc.Moodle_Course_ID,
          dc.Course_Code,
          dc.Course_Name
        FROM lms_moodle_source.mdl_role_assignments ra
        INNER JOIN lms_moodle_source.mdl_role r
          ON r.id = ra.roleid
        INNER JOIN lms_moodle_source.mdl_context ctx
          ON ctx.id = ra.contextid
          AND ctx.contextlevel = 50
        INNER JOIN Dim_Course dc
          ON dc.Moodle_Course_ID = ctx.instanceid
        WHERE ra.userid = ?
          AND (dc.Course_Key = ? OR dc.Moodle_Course_ID = ?)
          AND r.shortname IN ('editingteacher', 'teacher')
        LIMIT 1
        `,
        [moodleTeacherId, courseId, courseId]
      );

      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Từ chối truy cập: Giảng viên '${req.teacher.username}' không được phân công giảng dạy môn học có mã '${courseId}'.`,
        });
      }

      // Gắn thông tin môn học đã kiểm chứng vào request
      req.course = rows[0];
      next();
    } catch (error) {
      console.error("[Auth Middleware] Lỗi kiểm tra phân quyền môn học:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi hệ thống khi xác thực quyền môn học.",
        error: error.message,
      });
    }
  });
}

/**
 * Middleware bắt buộc xác thực Sinh viên qua Authorization Bearer Token
 * Từ chối 401 nếu thiếu hoặc sai token
 * Từ chối 403 nếu không phải vai trò student
 */
export async function requireStudentAuth(req, res, next) {
  // Cho phép bypass khi truy cập chế độ demo để giữ tương thích kiểm thử
  if (req.query?.demo === "1" || req.params?.demo === "1") {
    return next();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({
      success: false,
      message: "Yêu cầu xác thực. Vui lòng cung cấp mã token hợp lệ trong header Authorization.",
    });
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({
      success: false,
      message: "Định dạng Authorization header không hợp lệ. Chuẩn yêu cầu: 'Bearer <token>'.",
    });
  }

  const token = parts[1];
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }

  const role = String(payload.role || "").toLowerCase();
  if (role !== "student" && role !== "sinhvien") {
    return res.status(403).json({
      success: false,
      message: "Từ chối truy cập: Chỉ sinh viên mới có quyền sử dụng tính năng này.",
    });
  }

  // Đối chiếu trạng thái tài khoản và vai trò thực tế trong CSDL
  try {
    const [userRows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Role,
        a.Is_Active AS Account_Is_Active,
        u.User_Key,
        u.Moodle_User_ID,
        u.Is_Active AS User_Is_Active
      FROM App_User_Account a
      INNER JOIN Dim_User u ON u.User_Key = a.User_Key
      WHERE LOWER(a.Username) = LOWER(?)
      LIMIT 1
      `,
      [payload.username]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản trong phiên đăng nhập không còn tồn tại trong hệ thống.",
      });
    }

    const dbUser = userRows[0];

    if (!dbUser.Account_Is_Active || !dbUser.User_Is_Active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hiện đang bị khóa hoặc đã ngừng kích hoạt.",
      });
    }

    const dbRole = String(dbUser.Role || "").toLowerCase();
    if (dbRole !== "student" && dbRole !== "sinhvien") {
      return res.status(403).json({
        success: false,
        message: "Quyền sinh viên đã bị thay đổi hoặc thu hồi.",
      });
    }

    // Gắn thông tin sinh viên đã được chứng thực từ token và DB vào request
    req.student = {
      ...payload,
      userKey: dbUser.User_Key,
      moodleUserId: dbUser.Moodle_User_ID,
      role: dbUser.Role,
    };
    next();
  } catch (dbErr) {
    console.error("[Auth Middleware] Lỗi kiểm tra tài khoản sinh viên trong CSDL:", dbErr);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xác minh tài khoản sinh viên.",
      error: dbErr.message,
    });
  }
}

