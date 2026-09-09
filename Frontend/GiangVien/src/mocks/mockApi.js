import { mockDatabase } from "./mockDatabase";

const wait = (ms = 180) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getCurrentTeacherId() {
  const saved = localStorage.getItem("currentTeacherId");

  if (!saved) {
    throw new Error("Không có giảng viên đang đăng nhập.");
  }

  return saved;
}

function byTeacher(items = [], teacherId) {
  return items.filter(
    (item) => item.teacherId === teacherId
  );
}

export async function mockGetCurrentUser() {
  await wait();

  const teacherId = getCurrentTeacherId();

  const teacher = mockDatabase.teachers.find(
    (item) => item.id === teacherId
  );

  if (!teacher) {
    throw new Error(
      "Không tìm thấy giảng viên đang đăng nhập."
    );
  }

  return teacher;
}

export async function mockGetDashboard(teacherId) {
  await wait();

  const courses = byTeacher(
    mockDatabase.courses,
    teacherId
  );

  const pendingSubmissions = byTeacher(
    mockDatabase.submissions,
    teacherId
  ).filter(
    (item) => item.status === "pending"
  );

  const unreadSupport = byTeacher(
    mockDatabase.supportRequests,
    teacherId
  ).filter(
    (item) => item.unread
  );

  const unreadMessages = byTeacher(
    mockDatabase.messages,
    teacherId
  ).filter(
    (item) => item.unread
  );

  return {
    totalCourses: courses.length,

    totalStudents: courses.reduce(
      (sum, course) =>
        sum + (course.studentCount || 0),
      0
    ),

    pendingGrading:
      pendingSubmissions.length,

    unreadSupportRequests:
      unreadSupport.length,

    unreadMessages:
      unreadMessages.length,
  };
}

export async function mockGetCourses(
  teacherId
) {
  await wait();

  return byTeacher(
    mockDatabase.courses,
    teacherId
  );
}

export async function mockGetTasks(
  teacherId
) {
  await wait();

  return byTeacher(
    mockDatabase.tasks,
    teacherId
  );
}

export async function mockGetNotifications(
  teacherId
) {
  await wait();

  const supports = byTeacher(
    mockDatabase.supportRequests,
    teacherId
  ).map((item) => ({
    id: `support-${item.id}`,
    title: item.title,
    time: "Gần đây",
    unread: item.unread,
  }));

  const messages = byTeacher(
    mockDatabase.messages,
    teacherId
  ).map((item) => ({
    id: `message-${item.id}`,
    title: item.title,
    time: item.time,
    unread: item.unread,
  }));

  return [
    ...supports,
    ...messages,
  ].slice(0, 5);
}

export async function mockGetSchedule(
  teacherId,
  month
) {
  await wait();

  return byTeacher(
    mockDatabase.schedule,
    teacherId
  ).filter((item) =>
    item.date.startsWith(month)
  );
}

export async function mockGetAnalytics(
  teacherId
) {
  await wait();

  const topCourses = byTeacher(
    mockDatabase.courses,
    teacherId
  )
    .slice()
    .sort(
      (a, b) =>
        b.averageScore -
        a.averageScore
    )
    .slice(0, 3)
    .map((course) => ({
      courseId: course.id,
      label: course.title,
      value: course.averageScore,
    }));

  const attendanceTrend =
    byTeacher(
      mockDatabase.attendanceTrend,
      teacherId
    );

  return {
    topCourses,
    attendanceTrend,
  };
}

export async function mockGetCourse(
  courseId
) {
  await wait();

  const course =
    mockDatabase.courses.find(
      (item) =>
        item.id === courseId
    );

  if (!course) {
    throw new Error(
      "Không tìm thấy khóa học."
    );
  }

  return course;
}

export async function mockGetGrading(
  courseId,
  teacherId
) {
  await wait();

  return mockDatabase.submissions.filter(
    (item) =>
      item.teacherId === teacherId &&
      (!courseId ||
        item.courseId === courseId) &&
      item.status === "pending"
  );
}

/* =============================
   STUDENTS
============================= */

export async function mockGetCourseStudents(
  courseId
) {
  await wait();

  if (!mockDatabase.students) {
    return [];
  }

  return mockDatabase.students.filter(
    (student) =>
      student.courseId === courseId
  );
}