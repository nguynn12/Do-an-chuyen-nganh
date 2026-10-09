import pool from "../../config/database.js";
import {
  PARTICIPATION_WEIGHTS,
  RISK_WEIGHTS,
  INACTIVE_DAYS,
  LATE_RATE,
  GRADE_DROP_POINTS,
  RISK_LEVEL_THRESHOLDS,
  SUBMIT_STYLES,
  SEGMENT_LABELS,
} from "./analyticsConfig.js";

/**
 * Tính giá trị trung vị (Median) của một mảng số thực.
 * @param {number[]} numbers Mảng số
 * @returns {number|null} Giá trị trung vị hoặc null nếu mảng rỗng
 */
export function calculateMedian(numbers) {
  const validNumbers = numbers
    .filter((n) => n !== null && n !== undefined && !Number.isNaN(n))
    .sort((a, b) => a - b);

  if (validNumbers.length === 0) return null;

  const mid = Math.floor(validNumbers.length / 2);
  if (validNumbers.length % 2 !== 0) {
    return validNumbers[mid];
  }
  return Number(((validNumbers[mid - 1] + validNumbers[mid]) / 2).toFixed(2));
}

/**
 * Phân loại bài nộp vào bucket theo thời gian nộp sớm/trễ.
 * Ghi chú độ chính xác: Dim_Date trong DW lưu Full_Date (độ chính xác theo ngày),
 * nên Lead_Hours được tính theo bước DATEDIFF * 24.
 *
 * @param {number|null} leadHours Số giờ nộp sớm so với hạn (âm là trễ)
 * @param {boolean} isSubmitted Đã nộp hay chưa
 * @returns {string} Tên bucket
 */
export function categorizeLeadBucket(leadHours, isSubmitted) {
  if (!isSubmitted || leadHours === null || leadHours === undefined) {
    return "Chưa nộp";
  }
  if (leadHours < 0) {
    return "Trễ hạn";
  }
  if (leadHours < 24) {
    return "Dưới 24 giờ";
  }
  if (leadHours <= 72) {
    return "1-3 ngày";
  }
  return "Sớm hơn 3 ngày";
}

/**
 * Gắn nhãn phong cách nộp bài của sinh viên dựa trên số ngày nộp trước hạn trung bình.
 * @param {number|null} avgLeadDays Số ngày nộp trước hạn trung bình
 * @returns {string} Nhãn phong cách nộp bài
 */
export function getSubmitStyle(avgLeadDays) {
  if (avgLeadDays === null || avgLeadDays === undefined) {
    return SUBMIT_STYLES.NO_DATA;
  }
  if (avgLeadDays < 0) {
    return SUBMIT_STYLES.LATE;
  }
  if (avgLeadDays < 1) {
    return SUBMIT_STYLES.LAST_MINUTE;
  }
  if (avgLeadDays <= 3) {
    return SUBMIT_STYLES.REGULAR;
  }
  return SUBMIT_STYLES.EARLY;
}

/**
 * Hàm tính toán chỉ số hành vi, phân khúc 2x2 và điểm cảnh báo sớm cho toàn bộ sinh viên trong 1 môn học.
 * Dùng chung giữa phân hệ Giảng viên và phân hệ Sinh viên để đảm bảo số liệu 100% đồng nhất.
 *
 * @param {object} dbConnection Kết nối MySQL (pool hoặc connection)
 * @param {number|string} courseIdentifier Course_Key hoặc Moodle_Course_ID
 * @param {object} options Các tùy chọn mở rộng (cutOffDate phục vụ Task 7)
 * @returns {Promise<object>} Dữ liệu phân tích lớp học
 */
export async function calculateCourseBehaviorMetrics(
  dbConnection = pool,
  courseIdentifier,
  options = {}
) {
  const { cutOffDate = null } = options;

  // 1. Xác định thông tin môn học trong Dim_Course
  const [courseRows] = await dbConnection.query(
    `SELECT Course_Key, Moodle_Course_ID, Course_Code, Course_Name, Start_Date, End_Date 
     FROM Dim_Course 
     WHERE Course_Key = ? OR Moodle_Course_ID = ? 
     LIMIT 1`,
    [courseIdentifier, courseIdentifier]
  );

  if (courseRows.length === 0) {
    throw new Error(`Không tìm thấy môn học với mã định danh: ${courseIdentifier}`);
  }

  const course = courseRows[0];
  const courseKey = course.Course_Key;

  // 2. Xác định ngày "hiện tại" của bộ dữ liệu trong Data Warehouse
  // Quy tắc: Là dữ liệu quá khứ, không dùng NOW()/TODAY(). Dùng MAX(Full_Date) của Fact_Daily_Engagement.
  let dateCondition = "";
  const dateParams = [];

  if (cutOffDate) {
    dateCondition = "AND dd.Full_Date <= ?";
    dateParams.push(cutOffDate);
  }

  const [[{ maxDataDate }]] = await dbConnection.query(
    `SELECT MAX(dd.Full_Date) AS maxDataDate 
     FROM Fact_Daily_Engagement fde 
     INNER JOIN Dim_Date dd ON dd.Date_Key = fde.Date_Key 
     WHERE 1=1 ${dateCondition}`,
    dateParams
  );

  const referenceDate = maxDataDate ? new Date(maxDataDate) : new Date("2026-05-28");

  // 3. Lấy danh sách tất cả sinh viên ghi danh trong môn
  const [students] = await dbConnection.query(
    `SELECT 
       du.User_Key AS userKey,
       du.Moodle_User_ID AS moodleUserId,
       du.Username AS username,
       du.First_Name AS firstName,
       du.Last_Name AS lastName,
       du.Full_Name AS fullName,
       du.Email AS email,
       fe.Status AS enrolmentStatus
     FROM Fact_Enrolment fe
     INNER JOIN Dim_User du ON du.User_Key = fe.User_Key
     WHERE fe.Course_Key = ? AND du.Primary_Role = 'Student'
     ORDER BY du.Full_Name ASC`,
    [courseKey]
  );

  const totalStudents = students.length;
  const isLowSample = totalStudents < 5;

  // 4. Lấy tất cả bài tập (assignments) của môn học
  const [activities] = await dbConnection.query(
    `SELECT 
       da.Activity_Key AS activityKey,
       da.Moodle_Module_ID AS moodleModuleId,
       da.Activity_Name AS activityName,
       da.Activity_Type AS activityType,
       da.Due_Date_Key AS dueDateKey,
       dd.Full_Date AS dueDate,
       da.Max_Grade AS maxGrade
     FROM Dim_Activity da
     LEFT JOIN Dim_Date dd ON dd.Date_Key = da.Due_Date_Key
     WHERE da.Course_Key = ? 
       AND da.Activity_Type IN ('assign', 'assignment')
       AND da.Is_Visible = 1
     ORDER BY da.Activity_Key ASC`,
    [courseKey]
  );

  // 5. Lấy toàn bộ bài nộp của môn
  const [submissionRows] = await dbConnection.query(
    `SELECT 
       fas.Submission_Key AS submissionKey,
       fas.User_Key AS userKey,
       fas.Activity_Key AS activityKey,
       fas.Submit_Date_Key AS submitDateKey,
       fas.Due_Date_Key AS dueDateKey,
       fas.Submission_Status AS submissionStatus,
       fas.Is_Submitted_On_Time AS isSubmittedOnTime,
       fas.Grade AS grade,
       fas.Is_Graded AS isGraded,
       d_sub.Full_Date AS submitDate,
       d_due.Full_Date AS dueDate
     FROM Fact_Assignment_Submission fas
     LEFT JOIN Dim_Date d_sub ON d_sub.Date_Key = fas.Submit_Date_Key
     LEFT JOIN Dim_Date d_due ON d_due.Date_Key = fas.Due_Date_Key
     WHERE fas.Course_Key = ?
     ${cutOffDate ? "AND (d_sub.Full_Date IS NULL OR d_sub.Full_Date <= ?)" : ""}`,
    cutOffDate ? [courseKey, cutOffDate] : [courseKey]
  );

  // 6. Lấy toàn bộ điểm số của môn
  const [gradeRows] = await dbConnection.query(
    `SELECT 
       fcg.Grade_Key AS gradeKey,
       fcg.User_Key AS userKey,
       fcg.Grade_Item_ID AS gradeItemId,
       fcg.Grade_Item_Name AS gradeItemName,
       fcg.Grade_Item_Type AS gradeItemType,
       fcg.Activity_Key AS activityKey,
       fcg.Date_Key AS dateKey,
       fcg.Grade AS grade,
       fcg.Max_Grade AS maxGrade,
       fcg.Grade_Percentage AS gradePercentage,
       fcg.Is_Passed AS isPassed,
       dd.Full_Date AS gradeDate
     FROM Fact_Course_Grade fcg
     LEFT JOIN Dim_Date dd ON dd.Date_Key = fcg.Date_Key
     WHERE fcg.Course_Key = ?
     ${cutOffDate ? "AND (dd.Full_Date IS NULL OR dd.Full_Date <= ?)" : ""}
     ORDER BY fcg.Date_Key ASC, fcg.Grade_Key ASC`,
    cutOffDate ? [courseKey, cutOffDate] : [courseKey]
  );

  // 7. Lấy toàn bộ tương tác học tập của môn
  const [engagementRows] = await dbConnection.query(
    `SELECT 
       fde.User_Key AS userKey,
       fde.Date_Key AS dateKey,
       fde.Time_Spent_Seconds AS timeSpentSeconds,
       fde.Last_Access_Time AS lastAccessTime,
       dd.Full_Date AS date
     FROM Fact_Daily_Engagement fde
     INNER JOIN Dim_Date dd ON dd.Date_Key = fde.Date_Key
     WHERE fde.Course_Key = ?
     ${cutOffDate ? "AND dd.Full_Date <= ?" : ""}`,
    cutOffDate ? [courseKey, cutOffDate] : [courseKey]
  );

  // Gom nhóm dữ liệu theo từng User_Key
  const submissionsByUser = new Map();
  submissionRows.forEach((row) => {
    if (!submissionsByUser.has(row.userKey)) {
      submissionsByUser.set(row.userKey, []);
    }
    submissionsByUser.get(row.userKey).push(row);
  });

  const gradesByUser = new Map();
  gradeRows.forEach((row) => {
    if (!gradesByUser.has(row.userKey)) {
      gradesByUser.set(row.userKey, []);
    }
    gradesByUser.get(row.userKey).push(row);
  });

  const engagementByUser = new Map();
  engagementRows.forEach((row) => {
    if (!engagementByUser.has(row.userKey)) {
      engagementByUser.set(row.userKey, []);
    }
    engagementByUser.get(row.userKey).push(row);
  });

  // Tính toán sơ bộ các giá trị engagement để chuẩn hóa toàn lớp
  const studentRawMetrics = [];
  let maxClassHours = 0;
  let sumClassHours = 0;

  for (const student of students) {
    const userKey = student.userKey;
    const userEngs = engagementByUser.get(userKey) || [];

    const totalSeconds = userEngs.reduce(
      (sum, e) => sum + Number(e.timeSpentSeconds || 0),
      0
    );
    const hours = Number((totalSeconds / 3600).toFixed(2));

    // Tìm ngày hoạt động gần nhất có tương tác (> 0 giây)
    let lastActiveDate = null;
    userEngs.forEach((e) => {
      if (Number(e.timeSpentSeconds) > 0 && e.date) {
        const d = new Date(e.date);
        if (!lastActiveDate || d > lastActiveDate) {
          lastActiveDate = d;
        }
      }
    });

    let inactiveDays = null;
    if (lastActiveDate) {
      const diffMs = referenceDate.getTime() - lastActiveDate.getTime();
      inactiveDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      // Nếu không có ngày active nào, tính khoảng cách từ ngày bắt đầu môn hoặc mặc định
      inactiveDays = INACTIVE_DAYS + 1;
    }

    if (hours > maxClassHours) maxClassHours = hours;
    sumClassHours += hours;

    studentRawMetrics.push({
      student,
      engagementHours: hours,
      totalSeconds,
      inactiveDays,
      lastActiveDate,
    });
  }

  const classAvgHours =
    totalStudents > 0 ? Number((sumClassHours / totalStudents).toFixed(2)) : 0;

  // Thống kê đếm bucket bài nộp của cả lớp cho biểu đồ histogram
  const classBucketCounts = {
    "Trễ hạn": 0,
    "Dưới 24 giờ": 0,
    "1-3 ngày": 0,
    "Sớm hơn 3 ngày": 0,
    "Chưa nộp": 0,
  };

  // 8. Tính toán chi tiết cho từng sinh viên
  const studentMetrics = [];

  for (const item of studentRawMetrics) {
    const { student, engagementHours, inactiveDays } = item;
    const userKey = student.userKey;
    const userSubs = submissionsByUser.get(userKey) || [];
    const userGrades = gradesByUser.get(userKey) || [];

    // --- A. BÀI NỘP VÀ LEAD TIME ---
    let totalAssignments = activities.length;
    let submittedCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let sumLeadDays = 0;
    let validLeadDaysCount = 0;

    const studentSubmissionsDetail = activities.map((act) => {
      const sub = userSubs.find((s) => s.activityKey === act.activityKey);
      const isSubmitted =
        sub &&
        (sub.submissionStatus === "submitted" ||
          (sub.submitDateKey && sub.submissionStatus !== "draft"));

      let leadDays = null;
      let leadHours = null;

      if (isSubmitted && sub.submitDate && sub.dueDate) {
        const dSub = new Date(sub.submitDate);
        const dDue = new Date(sub.dueDate);
        // Chênh lệch ngày = Due - Submit
        leadDays = Math.round((dDue.getTime() - dSub.getTime()) / (1000 * 60 * 60 * 24));
        leadHours = leadDays * 24;
      }

      const bucket = categorizeLeadBucket(leadHours, isSubmitted);
      classBucketCounts[bucket] = (classBucketCounts[bucket] || 0) + 1;

      if (isSubmitted) {
        submittedCount++;
        if (sub.isSubmittedOnTime === 1 || (leadHours !== null && leadHours >= 0)) {
          onTimeCount++;
        } else {
          lateCount++;
        }

        if (leadDays !== null) {
          sumLeadDays += leadDays;
          validLeadDaysCount++;
        }
      }

      return {
        activityKey: act.activityKey,
        activityName: act.activityName,
        dueDate: act.dueDate,
        submitDate: sub?.submitDate || null,
        submissionStatus: sub?.submissionStatus || "not_submitted",
        isSubmittedOnTime: sub?.isSubmittedOnTime ?? null,
        leadHours,
        leadDays,
        bucket,
        grade: sub?.grade !== null && sub?.grade !== undefined ? Number(sub.grade) : null,
      };
    });

    const onTimeRate =
      submittedCount > 0
        ? Number(((onTimeCount / submittedCount) * 100).toFixed(1))
        : null;

    const avgLeadDays =
      validLeadDaysCount > 0
        ? Number((sumLeadDays / validLeadDaysCount).toFixed(2))
        : null;

    const submitStyle = getSubmitStyle(avgLeadDays);

    // --- B. ĐIỂM SỐ VÀ XU HƯỚNG (GRADE TREND) ---
    let avgGradePct = null;
    let avgGrade10 = null;
    let gradeTrend = "Ổn định";
    let gradeDiff = 0;
    let isGradeDrop = false;

    if (userGrades.length > 0) {
      const validGradePcts = userGrades
        .map((g) => Number(g.gradePercentage))
        .filter((g) => !Number.isNaN(g));

      if (validGradePcts.length > 0) {
        const sumPct = validGradePcts.reduce((a, b) => a + b, 0);
        avgGradePct = Number((sumPct / validGradePcts.length).toFixed(2));
        avgGrade10 = Number((avgGradePct / 10).toFixed(2));
      }

      // Đánh giá xu hướng điểm (so sánh nửa sau với nửa trước)
      if (validGradePcts.length >= 2) {
        const mid = Math.floor(validGradePcts.length / 2);
        const earlierGrades = validGradePcts.slice(0, mid);
        const recentGrades = validGradePcts.slice(mid);

        const earlierAvg =
          earlierGrades.reduce((a, b) => a + b, 0) / earlierGrades.length;
        const recentAvg =
          recentGrades.reduce((a, b) => a + b, 0) / recentGrades.length;

        gradeDiff = Number((recentAvg - earlierAvg).toFixed(2));

        if (gradeDiff <= -GRADE_DROP_POINTS) {
          gradeTrend = "Giảm";
          isGradeDrop = true;
        } else if (gradeDiff >= GRADE_DROP_POINTS) {
          gradeTrend = "Tăng";
        }
      }
    }

    // --- C. ĐIỂM THAM GIA (PARTICIPATION SCORE: 0 - 100) ---
    // Tổ hợp: 40% OnTimeRate + 30% Giờ học chuẩn hóa + 30% Điểm trung bình
    let participationScore = null;
    const hasAnyData =
      onTimeRate !== null || engagementHours > 0 || avgGradePct !== null;

    if (hasAnyData) {
      const normOnTime = onTimeRate !== null ? onTimeRate / 100 : 0;
      const normEngagement =
        maxClassHours > 0 ? Math.min(1, engagementHours / maxClassHours) : 0;
      const normGrade = avgGradePct !== null ? avgGradePct / 100 : 0;

      participationScore = Math.round(
        100 *
          (PARTICIPATION_WEIGHTS.onTime * normOnTime +
            PARTICIPATION_WEIGHTS.engagement * normEngagement +
            PARTICIPATION_WEIGHTS.grade * normGrade)
      );
    }

    // --- D. CỜ CẢNH BÁO VÀ ĐIỂM RỦI RO (RISK SCORE) ---
    const flagLateSubmit =
      (onTimeRate !== null && onTimeRate < LATE_RATE * 100) || lateCount >= 2
        ? 1
        : 0;
    const flagInactive =
      inactiveDays !== null && inactiveDays >= INACTIVE_DAYS ? 1 : 0;
    const flagGradeDrop = isGradeDrop ? 1 : 0;
    const flagLowEngagement =
      classAvgHours > 0 && engagementHours < classAvgHours * 0.5 ? 1 : 0;

    const flags = {
      lateSubmit: flagLateSubmit,
      inactive: flagInactive,
      gradeDrop: flagGradeDrop,
      lowEngagement: flagLowEngagement,
      absent: 0,
      quizDrop: 0,
    };

    const riskReasons = [];
    if (flagLateSubmit) {
      riskReasons.push(
        onTimeRate !== null
          ? `Hay nộp trễ (tỷ lệ đúng hạn ${onTimeRate}%)`
          : `Có ${lateCount} bài nộp trễ hạn`
      );
    }
    if (flagInactive) {
      riskReasons.push(`Lâu không hoạt động (${inactiveDays} ngày)`);
    }
    if (flagGradeDrop) {
      riskReasons.push(`Điểm gần đây giảm so với trước (giảm ${Math.abs(gradeDiff)}%)`);
    }
    if (flagLowEngagement) {
      riskReasons.push(
        `Ít tương tác so với lớp (${engagementHours}h / TB lớp ${classAvgHours}h)`
      );
    }

    const riskScore = Math.round(
      100 *
        (RISK_WEIGHTS.lateSubmit * flagLateSubmit +
          RISK_WEIGHTS.inactive * flagInactive +
          RISK_WEIGHTS.gradeDrop * flagGradeDrop +
          RISK_WEIGHTS.lowEngagement * flagLowEngagement)
    );

    let riskLevel = "thấp";
    if (riskScore >= RISK_LEVEL_THRESHOLDS.high) {
      riskLevel = "cao";
    } else if (riskScore >= RISK_LEVEL_THRESHOLDS.medium) {
      riskLevel = "trung bình";
    }

    studentMetrics.push({
      userKey,
      moodleUserId: student.moodleUserId,
      username: student.username,
      fullName: student.fullName,
      email: student.email,
      // Metrics
      totalAssignments,
      submittedCount,
      onTimeCount,
      lateCount,
      onTimeRate,
      avgLeadDays,
      submitStyle,
      engagementHours,
      inactiveDays,
      avgGradePct,
      avgGrade10,
      gradeTrend,
      gradeDiff,
      participationScore,
      // Risk
      flags,
      riskScore,
      riskLevel,
      riskReasons,
      // Submissions list
      submissions: studentSubmissionsDetail,
    });
  }

  // 9. Tính ngưỡng trung vị toàn lớp để phân khúc 2x2
  const validParticipationScores = studentMetrics
    .map((s) => s.participationScore)
    .filter((p) => p !== null && p !== undefined);

  const validAvgGradePcts = studentMetrics
    .map((s) => s.avgGradePct)
    .filter((g) => g !== null && g !== undefined);

  const participationThreshold = calculateMedian(validParticipationScores) ?? 50;
  const gradeThreshold = calculateMedian(validAvgGradePcts) ?? 50;

  // Gán nhãn phân khúc (segment) cho từng sinh viên
  const segmentCounts = {
    [SEGMENT_LABELS.HIGH_PARTICIPATION_HIGH_GRADE]: 0,
    [SEGMENT_LABELS.HIGH_PARTICIPATION_LOW_GRADE]: 0,
    [SEGMENT_LABELS.LOW_PARTICIPATION_HIGH_GRADE]: 0,
    [SEGMENT_LABELS.LOW_PARTICIPATION_LOW_GRADE]: 0,
  };

  studentMetrics.forEach((student) => {
    const p = student.participationScore;
    const g = student.avgGradePct;

    if (p === null || g === null) {
      student.segment = null;
      return;
    }

    if (p >= participationThreshold && g >= gradeThreshold) {
      student.segment = SEGMENT_LABELS.HIGH_PARTICIPATION_HIGH_GRADE;
    } else if (p >= participationThreshold && g < gradeThreshold) {
      student.segment = SEGMENT_LABELS.HIGH_PARTICIPATION_LOW_GRADE;
    } else if (p < participationThreshold && g >= gradeThreshold) {
      student.segment = SEGMENT_LABELS.LOW_PARTICIPATION_HIGH_GRADE;
    } else {
      student.segment = SEGMENT_LABELS.LOW_PARTICIPATION_LOW_GRADE;
    }

    segmentCounts[student.segment] = (segmentCounts[student.segment] || 0) + 1;
  });

  // Phân bố điểm rủi ro cho biểu đồ histogram (Risk Distribution)
  const riskDistribution = [
    { range: "0-19", min: 0, max: 19, count: 0 },
    { range: "20-39", min: 20, max: 39, count: 0 },
    { range: "40-59", min: 40, max: 59, count: 0 },
    { range: "60-79", min: 60, max: 79, count: 0 },
    { range: "80-100", min: 80, max: 100, count: 0 },
  ];

  studentMetrics.forEach((s) => {
    const r = s.riskScore;
    const bucket = riskDistribution.find((b) => r >= b.min && r <= b.max);
    if (bucket) {
      bucket.count++;
    }
  });

  return {
    course: {
      courseKey: course.Course_Key,
      moodleCourseId: course.Moodle_Course_ID,
      code: course.Course_Code,
      name: course.Course_Name,
      startDate: course.Start_Date,
      endDate: course.End_Date,
    },
    referenceDate: referenceDate.toISOString().slice(0, 10),
    summary: {
      totalStudents,
      lowSample: isLowSample,
      maxClassHours,
      classAvgHours,
      thresholds: {
        participation: participationThreshold,
        grade: gradeThreshold,
      },
      segmentCounts,
      submissionBuckets: Object.keys(classBucketCounts).map((b) => ({
        bucket: b,
        count: classBucketCounts[b],
      })),
      riskDistribution,
    },
    students: studentMetrics,
  };
}
