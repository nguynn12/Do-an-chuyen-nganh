import pool from "../../config/database.js";


// ======================================================
// HELPER: TÌM GIẢNG VIÊN
// teacherId = Moodle User ID
// Ví dụ Trần Bình Trần = 2
// ======================================================

async function findTeacherByMoodleId(teacherId) {
  const [rows] = await pool.query(
    `
      SELECT
        User_Key,
        Moodle_User_ID,
        Username,
        Full_Name,
        Email
      FROM Dim_User
      WHERE Moodle_User_ID = ?
        AND Primary_Role = 'Teacher'
        AND Is_Active = 1
      LIMIT 1
    `,
    [teacherId]
  );

  return rows[0] || null;
}


// ======================================================
// 1. LẤY DEADLINE THẬT TỪ MOODLE
// ======================================================

async function getMoodleDeadlines(moodleUserId) {
  const [rows] = await pool.query(
    `
      SELECT DISTINCT
        c.id AS course_id,
        c.shortname AS course_code,
        c.fullname AS course_name,

        a.id AS assignment_id,
        a.name AS assignment_name,
        a.duedate,

        FROM_UNIXTIME(a.duedate) AS event_datetime

      FROM lms_moodle_source.mdl_user u

      JOIN lms_moodle_source.mdl_role_assignments ra
        ON ra.userid = u.id

      JOIN lms_moodle_source.mdl_role r
        ON r.id = ra.roleid

      JOIN lms_moodle_source.mdl_context ctx
        ON ctx.id = ra.contextid
        AND ctx.contextlevel = 50

      JOIN lms_moodle_source.mdl_course c
        ON c.id = ctx.instanceid

      JOIN lms_moodle_source.mdl_assign a
        ON a.course = c.id

      WHERE u.id = ?
        AND r.shortname IN ('teacher', 'editingteacher')
        AND a.duedate > 0

      ORDER BY a.duedate
    `,
    [moodleUserId]
  );

  return rows.map((row) => ({
    id: `lms-${row.assignment_id}`,

    source: "lms",
    type: "deadline",

    title: row.assignment_name,

    courseId: row.course_id,
    courseCode: row.course_code,
    courseName: row.course_name,

    date: row.event_datetime,

    assignmentId: row.assignment_id,

    editable: false,
  }));
}


// ======================================================
// 2. LẤY LỊCH GIẢNG VIÊN TỰ TẠO
// ======================================================

async function getTeacherSchedules(userKey) {
  const [rows] = await pool.query(
    `
      SELECT
        Schedule_ID,
        Event_Date,
        Event_Time,
        Title,
        Event_Type,
        Description,
        Created_At,
        Updated_At

      FROM teacher_schedule

      WHERE Teacher_User_Key = ?

      ORDER BY
        Event_Date,
        Event_Time
    `,
    [userKey]
  );

  return rows.map((row) => ({
    id: `schedule-${row.Schedule_ID}`,

    scheduleId: row.Schedule_ID,

    source: "teacher",
    type: row.Event_Type,

    title: row.Title,
    description: row.Description,

    date: row.Event_Date,
    time: row.Event_Time,

    editable: true,

    createdAt: row.Created_At,
    updatedAt: row.Updated_At,
  }));
}


// ======================================================
// 3. GỘP LMS + LỊCH TỰ TẠO
// ======================================================

export async function getTeacherCalendar(teacherId) {
  const teacher = await findTeacherByMoodleId(teacherId);

  if (!teacher) {
    const error = new Error(
      "Không tìm thấy giảng viên."
    );

    error.statusCode = 404;

    throw error;
  }

  const [
    moodleDeadlines,
    teacherSchedules,
  ] = await Promise.all([
    getMoodleDeadlines(
      teacher.Moodle_User_ID
    ),

    getTeacherSchedules(
      teacher.User_Key
    ),
  ]);

  const events = [
    ...moodleDeadlines,
    ...teacherSchedules,
  ];

  events.sort((a, b) => {
    const dateA = new Date(
      a.time
        ? `${formatDateOnly(a.date)}T${a.time}`
        : a.date
    );

    const dateB = new Date(
      b.time
        ? `${formatDateOnly(b.date)}T${b.time}`
        : b.date
    );

    return dateA - dateB;
  });

  return {
    teacher: {
      userKey: teacher.User_Key,
      moodleUserId:
        teacher.Moodle_User_ID,
      username: teacher.Username,
      fullName: teacher.Full_Name,
      email: teacher.Email,
    },

    total: events.length,

    lmsEvents: moodleDeadlines.length,

    customEvents: teacherSchedules.length,

    events,
  };
}


// ======================================================
// HELPER DATE
// ======================================================

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" &&
    value.length >= 10
  ) {
    return value.substring(0, 10);
  }

  const date = new Date(value);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}