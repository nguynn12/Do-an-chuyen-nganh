export const mockDatabase = {
  teachers: [
    {
      id: "GV001",
      fullName: "Nguyễn Văn A.",
      degree: "ThS.",
      department: "Khoa CNTT",
      teacherCode: "10123",
      schoolYear: "2022-2027",
      semester: "Học kỳ 1 (2026-2027)",
      initials: "GV",
    },

    {
      id: "GV002",
      fullName: "Trần Minh B.",
      degree: "TS.",
      department:
        "Khoa Công nghệ Thông tin",
      teacherCode: "10456",
      schoolYear: "2022-2027",
      semester: "Học kỳ 1 (2026-2027)",
      initials: "GV",
    },
  ],

  /* =============================
     COURSES
  ============================= */

  courses: [
    {
      id: "WEB-K47",
      teacherId: "GV001",
      title: "Lập trình Web-K47",
      attendance: 92,
      submissionRate: 85,
      studentCount: 42,
      averageScore: 8.5,
      color: "#3d7f3d",
      status: "active",
    },

    {
      id: "CSHARP-K46",
      teacherId: "GV001",
      title: "Lập trình C#-K46",
      attendance: 92,
      submissionRate: 85,
      studentCount: 38,
      averageScore: 6.0,
      color: "#266f65",
      status: "active",
    },

    {
      id: "DS-K47",
      teacherId: "GV001",
      title: "Cấu trúc dữ liệu-K47",
      attendance: 90,
      submissionRate: 85,
      studentCount: 40,
      averageScore: 9.0,
      color: "#647d89",
      status: "active",
    },

    {
      id: "JAVA-K47",
      teacherId: "GV001",
      title: "Lập trình Java-K47",
      attendance: 88,
      submissionRate: 81,
      studentCount: 41,
      averageScore: 7.6,
      color: "#557f58",
      status: "active",
    },

    {
      id: "AI-K47",
      teacherId: "GV002",
      title: "Trí tuệ nhân tạo-K47",
      attendance: 95,
      submissionRate: 90,
      studentCount: 36,
      averageScore: 8.1,
      color: "#3c6f71",
      status: "active",
    },

    {
      id: "ML-K47",
      teacherId: "GV002",
      title: "Học máy-K47",
      attendance: 89,
      submissionRate: 84,
      studentCount: 33,
      averageScore: 7.7,
      color: "#6c7c5d",
      status: "active",
    },
  ],

  /* =============================
     STUDENTS
  ============================= */

  students: [
    {
      id: "SV001",
      courseId: "CSHARP-K46",
      studentCode: "2311001",
      fullName: "Nguyễn Minh Anh",
      email:
        "2311001@student.dlu.edu.vn",
      attendance: 96,
      submissionRate: 92,
      averageScore: 8.4,
    },

    {
      id: "SV002",
      courseId: "CSHARP-K46",
      studentCode: "2311002",
      fullName: "Trần Hoàng Nam",
      email:
        "2311002@student.dlu.edu.vn",
      attendance: 88,
      submissionRate: 84,
      averageScore: 7.2,
    },

    {
      id: "SV003",
      courseId: "CSHARP-K46",
      studentCode: "2311003",
      fullName: "Lê Thị Thu Hà",
      email:
        "2311003@student.dlu.edu.vn",
      attendance: 76,
      submissionRate: 70,
      averageScore: 6.1,
    },

    {
      id: "SV004",
      courseId: "CSHARP-K46",
      studentCode: "2311004",
      fullName: "Phạm Quốc Huy",
      email:
        "2311004@student.dlu.edu.vn",
      attendance: 62,
      submissionRate: 55,
      averageScore: 4.7,
    },

    {
      id: "SV005",
      courseId: "CSHARP-K46",
      studentCode: "2311005",
      fullName: "Đỗ Ngọc Mai",
      email:
        "2311005@student.dlu.edu.vn",
      attendance: 91,
      submissionRate: 88,
      averageScore: 8.0,
    },

    {
      id: "SV006",
      courseId: "CSHARP-K46",
      studentCode: "2311006",
      fullName: "Võ Thành Đạt",
      email:
        "2311006@student.dlu.edu.vn",
      attendance: 68,
      submissionRate: 72,
      averageScore: 5.8,
    },

    {
      id: "SV007",
      courseId: "CSHARP-K46",
      studentCode: "2311007",
      fullName: "Bùi Khánh Linh",
      email:
        "2311007@student.dlu.edu.vn",
      attendance: 97,
      submissionRate: 95,
      averageScore: 9.1,
    },

    {
      id: "SV008",
      courseId: "CSHARP-K46",
      studentCode: "2311008",
      fullName: "Nguyễn Đức Long",
      email:
        "2311008@student.dlu.edu.vn",
      attendance: 82,
      submissionRate: 78,
      averageScore: 6.9,
    },

    {
      id: "SV009",
      courseId: "WEB-K47",
      studentCode: "2412001",
      fullName: "Trần Gia Hân",
      email:
        "2412001@student.dlu.edu.vn",
      attendance: 94,
      submissionRate: 90,
      averageScore: 8.6,
    },

    {
      id: "SV010",
      courseId: "WEB-K47",
      studentCode: "2412002",
      fullName: "Nguyễn Tuấn Kiệt",
      email:
        "2412002@student.dlu.edu.vn",
      attendance: 71,
      submissionRate: 68,
      averageScore: 5.7,
    },

    {
      id: "SV011",
      courseId: "DS-K47",
      studentCode: "2413001",
      fullName: "Lê Minh Khang",
      email:
        "2413001@student.dlu.edu.vn",
      attendance: 96,
      submissionRate: 93,
      averageScore: 9.0,
    },

    {
      id: "SV012",
      courseId: "JAVA-K47",
      studentCode: "2414001",
      fullName: "Hoàng Ngọc Anh",
      email:
        "2414001@student.dlu.edu.vn",
      attendance: 86,
      submissionRate: 80,
      averageScore: 7.4,
    },

    {
      id: "SV013",
      courseId: "AI-K47",
      studentCode: "2415001",
      fullName: "Trần Minh Quân",
      email:
        "2415001@student.dlu.edu.vn",
      attendance: 93,
      submissionRate: 91,
      averageScore: 8.3,
    },

    {
      id: "SV014",
      courseId: "ML-K47",
      studentCode: "2416001",
      fullName: "Nguyễn Hoài Nam",
      email:
        "2416001@student.dlu.edu.vn",
      attendance: 87,
      submissionRate: 83,
      averageScore: 7.5,
    },
  ],

  /* =============================
     SUBMISSIONS
  ============================= */

  submissions: [
    {
      id: 1,
      teacherId: "GV001",
      courseId: "WEB-K47",
      status: "pending",
      late: false,
    },

    {
      id: 2,
      teacherId: "GV001",
      courseId: "WEB-K47",
      status: "pending",
      late: false,
    },

    {
      id: 3,
      teacherId: "GV001",
      courseId: "CSHARP-K46",
      status: "pending",
      late: true,
    },

    {
      id: 4,
      teacherId: "GV001",
      courseId: "CSHARP-K46",
      status: "pending",
      late: true,
    },

    {
      id: 5,
      teacherId: "GV001",
      courseId: "DS-K47",
      status: "pending",
      late: false,
    },

    {
      id: 6,
      teacherId: "GV001",
      courseId: "JAVA-K47",
      status: "pending",
      late: false,
    },

    {
      id: 7,
      teacherId: "GV002",
      courseId: "AI-K47",
      status: "pending",
      late: false,
    },

    {
      id: 8,
      teacherId: "GV002",
      courseId: "AI-K47",
      status: "pending",
      late: false,
    },

    {
      id: 9,
      teacherId: "GV002",
      courseId: "ML-K47",
      status: "pending",
      late: true,
    },
  ],

  /* =============================
     SUPPORT
  ============================= */

  supportRequests: [
    {
      id: 1,
      teacherId: "GV001",
      title:
        "Thắc mắc mới môn Game",
      unread: true,
    },

    {
      id: 2,
      teacherId: "GV001",
      title:
        "Đăng ký nộp muộn môn Web",
      unread: true,
    },

    {
      id: 3,
      teacherId: "GV001",
      title:
        "Yêu cầu mở lại Quiz",
      unread: true,
    },

    {
      id: 4,
      teacherId: "GV002",
      title:
        "Xin gia hạn Assignment",
      unread: true,
    },
  ],

  /* =============================
     MESSAGES
  ============================= */

  messages: [
    {
      id: 1,
      teacherId: "GV001",
      title:
        "Sinh viên hỏi lịch học bù",
      unread: true,
      time: "20 phút trước",
    },

    {
      id: 2,
      teacherId: "GV001",
      title:
        "Thông báo coi thi học kỳ 1",
      unread: true,
      time: "1 ngày trước",
    },

    {
      id: 3,
      teacherId: "GV001",
      title:
        "Phản hồi từ phòng đào tạo",
      unread: false,
      time: "2 ngày trước",
    },

    {
      id: 4,
      teacherId: "GV002",
      title:
        "Thông báo cập nhật LMS",
      unread: true,
      time: "35 phút trước",
    },
  ],

  /* =============================
     TASKS
  ============================= */

  tasks: [
    {
      id: 1,
      teacherId: "GV001",
      title: "Chấm Lab 3 - C#",
      description:
        "5 bài nộp muộn",
      dueDate: "2026-08-20",
      action: "Chấm ngay",
      type: "red",
      path:
        "/cham-diem/CSHARP-K46",
    },

    {
      id: 2,
      teacherId: "GV001",
      title:
        "Xét duyệt Phúc khảo (Web Dev, 2 đơn mới)",
      description: "Có 2 đơn mới",
      dueDate: "2026-08-22",
      action: "Xem đơn",
      type: "orange",
      path: "/phuc-khao",
    },

    {
      id: 3,
      teacherId: "GV001",
      title:
        "Công bố đề GK - Java",
      description:
        "Chuẩn bị công bố đề",
      dueDate: "2026-08-26",
      action: "Upload đề",
      type: "green",
      path: "/de-thi",
    },

    {
      id: 4,
      teacherId: "GV002",
      title:
        "Chấm Assignment AI",
      description:
        "8 bài đang chờ",
      dueDate: "2026-08-29",
      action: "Chấm ngay",
      type: "red",
      path:
        "/cham-diem/AI-K47",
    },
  ],

  /* =============================
     SCHEDULE
  ============================= */

  schedule: [
    {
      id: 1,
      teacherId: "GV001",
      date: "2026-08-05",
      title:
        "Lập trình Web-K47",
      type: "class",
    },

    {
      id: 2,
      teacherId: "GV001",
      date: "2026-08-12",
      title: "Coi thi",
      type: "exam",
    },

    {
      id: 3,
      teacherId: "GV001",
      date: "2026-08-19",
      title: "Coi thi",
      type: "exam",
    },

    {
      id: 4,
      teacherId: "GV001",
      date: "2026-08-20",
      title: "Nộp điểm",
      type: "deadline",
    },

    {
      id: 5,
      teacherId: "GV002",
      date: "2026-08-07",
      title:
        "Trí tuệ nhân tạo-K47",
      type: "class",
    },

    {
      id: 6,
      teacherId: "GV002",
      date: "2026-08-21",
      title: "Nộp điểm",
      type: "deadline",
    },
  ],

  /* =============================
     ATTENDANCE ANALYTICS
  ============================= */

  attendanceTrend: [
    {
      teacherId: "GV001",
      week: "Tuần 1",
      rate: 88,
    },

    {
      teacherId: "GV001",
      week: "Tuần 2",
      rate: 91,
    },

    {
      teacherId: "GV001",
      week: "Tuần 3",
      rate: 89,
    },

    {
      teacherId: "GV001",
      week: "Tuần 4",
      rate: 94,
    },

    {
      teacherId: "GV002",
      week: "Tuần 1",
      rate: 90,
    },

    {
      teacherId: "GV002",
      week: "Tuần 2",
      rate: 92,
    },

    {
      teacherId: "GV002",
      week: "Tuần 3",
      rate: 93,
    },

    {
      teacherId: "GV002",
      week: "Tuần 4",
      rate: 91,
    },
  ],
};