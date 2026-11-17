/**
 * Dịch vụ lưu trữ và quản lý Dashboard AI vĩnh viễn (MySQL Persistence)
 * Phục vụ AI Dashboard Studio - Task 03C.2
 */

import pool from "../../config/database.js";
import { getCachedSource, cacheSource, cacheMultiTableSource } from "./excelParserService.js";
import { getAuthorizedCourses, getCourseAggregatedProfile } from "./lmsDataService.js";
import { computeChartRealData } from "./chartAggregationService.js";

/**
 * Đảm bảo nguồn dữ liệu tệp (Excel/CSV) đã được lưu bền vững trong MySQL
 * @param {string} sourceId
 * @param {object} teacherContext { userKey, moodleUserId, username }
 */
export async function ensureSourcePersisted(sourceId, teacherContext) {
  if (!sourceId || !(sourceId.startsWith("file_") || sourceId.startsWith("src_multi_"))) {
    return null;
  }

  // 1. Kiểm tra xem nguồn đã tồn tại trong bảng app_ai_dashboard_source chưa
  const [existing] = await pool.query(
    `SELECT Source_ID FROM app_ai_dashboard_source WHERE Source_ID = ? AND User_Key = ? AND Teacher_Moodle_ID = ? LIMIT 1`,
    [sourceId, teacherContext.userKey, teacherContext.moodleUserId]
  );
  if (existing.length > 0) {
    return existing[0];
  }

  // 2. Nếu chưa có trong MySQL, tìm trong RAM cache để lưu bền vững
  const cached = getCachedSource(sourceId);
  if (!cached) {
    throw new Error(
      `Không tìm thấy dữ liệu tệp nguồn (ID: ${sourceId}) để lưu trữ. Vui lòng tải lại tệp.`
    );
  }

  const descriptor = cached.descriptor || {};
  const profile = cached.profile || {};
  const rows = cached.rows || [];

  const normSourceType = (descriptor.fileType === "csv" || String(descriptor.sourceType).includes("csv"))
    ? "file_csv"
    : "file_excel";

  await pool.query(
    `
    INSERT INTO app_ai_dashboard_source (
      Source_ID,
      User_Key,
      Teacher_Moodle_ID,
      Source_Type,
      File_Name,
      Mime_Type,
      Total_Rows,
      Total_Columns,
      Columns_Meta,
      Rows_Data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sourceId,
      teacherContext.userKey || 0,
      teacherContext.moodleUserId || 0,
      normSourceType,
      descriptor.fileName || descriptor.name || profile.name || "Tệp dữ liệu",
      descriptor.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      profile.totalRows || rows.length,
      profile.totalColumns || (profile.columns ? profile.columns.length : 0),
      JSON.stringify(profile.contractVersion===1 ? {contractVersion:1,profile} : profile.columns || []),
      JSON.stringify(rows),
    ]
  );

  return { sourceId };
}

/**
 * Tải lại nguồn dữ liệu tệp từ MySQL vào bộ nhớ đệm nếu RAM cache bị xóa (sau khi restart backend)
 * @param {string} sourceId
 * @param {object} teacherContext
 */
export async function restoreSourceFromDbIfMissing(sourceId, teacherContext) {
  if (!sourceId || !(sourceId.startsWith("file_") || sourceId.startsWith("src_multi_"))) return null;

  const existingInRam = getCachedSource(sourceId);
  if (existingInRam) {
    return existingInRam;
  }

  // Truy vấn từ MySQL
  const [rows] = await pool.query(
    `
    SELECT *
    FROM app_ai_dashboard_source
    WHERE Source_ID = ? AND User_Key = ? AND Teacher_Moodle_ID = ?
    LIMIT 1
    `,
    [sourceId, teacherContext.userKey, teacherContext.moodleUserId]
  );

  if (rows.length === 0) {
    return null;
  }

  const dbSource = rows[0];
  let columnsMeta = [];
  let parsedRows = [];
  try {
    columnsMeta = typeof dbSource.Columns_Meta === "string" ? JSON.parse(dbSource.Columns_Meta) : dbSource.Columns_Meta;
    parsedRows = typeof dbSource.Rows_Data === "string" ? JSON.parse(dbSource.Rows_Data) : dbSource.Rows_Data;
  } catch (err) {
    console.error("[Storage Service] Lỗi parse JSON nguồn từ DB:", err);
  }

  const descriptor = {
    sourceId: dbSource.Source_ID,
    sourceType: dbSource.Source_Type,
    name: dbSource.File_Name,
    mimeType: dbSource.Mime_Type,
    uploadedAt: dbSource.Created_At,
  };

  const profile = {
    sourceId: dbSource.Source_ID,
    name: dbSource.File_Name,
    totalRows: dbSource.Total_Rows,
    totalColumns: dbSource.Total_Columns,
    columns: columnsMeta,
    previewRows: parsedRows.slice(0, 10),
  };

  if(columnsMeta?.contractVersion===1) {
    const restored=columnsMeta.profile;
    cacheSource(sourceId,descriptor,restored,parsedRows,teacherContext);
    const cached=getCachedSource(sourceId);
    Object.assign(cached,{tables:restored.tables,relationships:restored.relationships,isMultiTable:restored.isMultiTable});
    return cached;
  }

  // Nạp lại vào RAM cache
  cacheSource(
    dbSource.Source_ID,
    descriptor,
    profile,
    parsedRows,
    { moodleUserId: dbSource.Teacher_Moodle_ID, username: teacherContext?.username }
  );

  return { descriptor, profile, rows: parsedRows };
}

/**
 * Lưu Dashboard mới hoặc Cập nhật Dashboard hiện có
 * @param {object} payload { dashboardId?, title, description, sourceType, sourceId, courseKey?, charts, metadata? }
 * @param {object} teacherContext { userKey, moodleUserId, username }
 */
export async function saveDashboard(payload, teacherContext) {
  const {
    dashboardId,
    title,
    description,
    sourceType,
    sourceId,
    courseKey,
    charts,
    selectedCharts,
    metadata = {},
  } = payload;

  if (!title || !title.trim()) {
    throw new Error("Tên Dashboard là bắt buộc.");
  }

  // Chuẩn hóa loại nguồn dữ liệu
  let normSourceType = "file_excel";
  const stLower = String(sourceType || "").toLowerCase();
  if (stLower.includes("lms")) {
    normSourceType = "lms_datawarehouse";
  } else if (stLower.includes("csv")) {
    normSourceType = "file_csv";
  } else if (stLower.includes("file") || stLower.includes("excel")) {
    normSourceType = "file_excel";
  } else {
    throw new Error("Loại nguồn dữ liệu không hợp lệ.");
  }

  const chartsList = Array.isArray(selectedCharts) && selectedCharts.length > 0
    ? selectedCharts
    : (Array.isArray(charts) ? charts : []);

  if (chartsList.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 biểu đồ để lưu vào Dashboard.");
  }

  let normSourceId = sourceId;
  if (!normSourceId) {
    if (normSourceType === "lms_datawarehouse") {
      normSourceId = courseKey ? `lms_course_${courseKey}` : "lms_datawarehouse";
    } else {
      throw new Error("Mã nguồn dữ liệu (sourceId) không được để trống.");
    }
  }

  // 1. Nếu là nguồn Excel/CSV, đảm bảo đã lưu bền vững vào bảng app_ai_dashboard_source
  if (normSourceType === "file_excel" || normSourceType === "file_csv") {
    await ensureSourcePersisted(normSourceId, teacherContext);
  } else if (normSourceType === "lms_datawarehouse") {
    // Xác thực quyền giảng viên đối với môn học
    const authCourses = await getAuthorizedCourses(teacherContext.moodleUserId);
    const targetCourseKey = Number(courseKey);
    const isAuthorized = authCourses.some((c) => Number(c.Course_Key) === targetCourseKey);
    if (!isAuthorized) {
      throw new Error("Từ chối quyền: Giảng viên không được phân công giảng dạy môn học này.");
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let targetDashboardId = Number(dashboardId) || null;

    if (targetDashboardId) {
      // Chế độ cập nhật Dashboard hiện có: Kiểm tra quyền sở hữu
      const [existingDash] = await connection.query(
        `
        SELECT Dashboard_ID, Teacher_Moodle_ID, User_Key
        FROM app_ai_dashboard
        WHERE Dashboard_ID = ?
        FOR UPDATE
        `,
        [targetDashboardId]
      );

      if (existingDash.length === 0) {
        throw new Error("Dashboard không tồn tại.");
      }

      const owner = existingDash[0];
      if (
        Number(owner.Teacher_Moodle_ID) !== Number(teacherContext.moodleUserId) ||
        Number(owner.User_Key) !== Number(teacherContext.userKey)
      ) {
        throw new Error("Từ chối truy cập: Bạn không có quyền chỉnh sửa Dashboard này.");
      }

      // Cập nhật thông tin Dashboard
      await connection.query(
        `
        UPDATE app_ai_dashboard
        SET
          Title = ?,
          Description = ?,
          Chart_Count = ?,
          Metadata_Json = ?,
          Updated_At = NOW()
        WHERE Dashboard_ID = ?
        `,
        [
          title.trim(),
          description ? description.trim() : null,
          chartsList.length,
          JSON.stringify(metadata),
          targetDashboardId,
        ]
      );

      // Xóa các biểu đồ cũ để chèn lại danh sách biểu đồ đã chọn mới nhất
      await connection.query(
        `DELETE FROM app_ai_dashboard_chart WHERE Dashboard_ID = ?`,
        [targetDashboardId]
      );
    } else {
      // Chế độ tạo mới Dashboard
      const [insertResult] = await connection.query(
        `
        INSERT INTO app_ai_dashboard (
          User_Key,
          Teacher_Moodle_ID,
          Title,
          Description,
          Source_Type,
          Source_ID,
          Course_Key,
          Status,
          Chart_Count,
          Metadata_Json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `,
        [
          teacherContext.userKey,
          teacherContext.moodleUserId,
          title.trim(),
          description ? description.trim() : null,
          normSourceType,
          normSourceId,
          courseKey ? Number(courseKey) : null,
          chartsList.length,
          JSON.stringify(metadata),
        ]
      );
      targetDashboardId = insertResult.insertId;
    }

    // Chèn danh sách biểu đồ đã chọn
    for (let i = 0; i < chartsList.length; i++) {
      const c = chartsList[i];
      await connection.query(
        `
        INSERT INTO app_ai_dashboard_chart (
          Dashboard_ID,
          Client_Chart_ID,
          Chart_Type,
          Title,
          Description,
          X_Axis,
          Y_Axis,
          Aggregation,
          Filter_Rule,
          Reasoning,
          Sort_Order,
          Layout_Config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          targetDashboardId,
          c.chartId || `chart_${i + 1}`,
          c.chartType || "bar",
          c.title || `Biểu đồ ${i + 1}`,
          c.description || null,
          c.xAxis || null,
          c.yAxis || null,
          c.aggregation || "AVG",
          c.filter || "none",
          c.reasoning || null,
          i,
          JSON.stringify(c.layoutConfig || {}),
        ]
      );
    }

    await connection.commit();

    return {
      dashboardId: targetDashboardId,
      title: title.trim(),
      chartCount: chartsList.length,
      sourceType: normSourceType,
      sourceId: normSourceId,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Lấy danh sách Dashboard của Giảng viên hiện tại
 * @param {object} teacherContext { userKey, moodleUserId }
 */
export async function listTeacherDashboards(teacherContext) {
  const [rows] = await pool.query(
    `
    SELECT
      d.Dashboard_ID as dashboardId,
      d.Title as title,
      d.Description as description,
      d.Source_Type as sourceType,
      d.Source_ID as sourceId,
      d.Course_Key as courseKey,
      d.Status as status,
      d.Chart_Count as chartCount,
      d.Metadata_Json as metadataJson,
      d.Created_At as createdAt,
      d.Updated_At as updatedAt,
      c.Course_Code as courseCode,
      c.Course_Name as courseName,
      s.File_Name as fileName
    FROM app_ai_dashboard d
    LEFT JOIN dim_course c ON c.Course_Key = d.Course_Key
    LEFT JOIN app_ai_dashboard_source s ON s.Source_ID = d.Source_ID
    WHERE (d.Teacher_Moodle_ID = ? AND d.User_Key = ?)
      AND d.Status != 'deleted'
    ORDER BY d.Updated_At DESC
    `,
    [teacherContext.moodleUserId, teacherContext.userKey]
  );

  return rows;
}

/**
 * Lấy chi tiết một Dashboard kèm số liệu biểu đồ thật được tái dựng sống
 * @param {number} dashboardId
 * @param {object} teacherContext
 * @param {boolean} forceRefresh
 */
export async function getDashboardDetail(dashboardId, teacherContext, forceRefresh = false) {
  const [dashRows] = await pool.query(
    `
    SELECT
      d.*,
      c.Course_Code as courseCode,
      c.Course_Name as courseName,
      s.File_Name as fileName
    FROM app_ai_dashboard d
    LEFT JOIN dim_course c ON c.Course_Key = d.Course_Key
    LEFT JOIN app_ai_dashboard_source s ON s.Source_ID = d.Source_ID
    WHERE d.Dashboard_ID = ?
    LIMIT 1
    `,
    [dashboardId]
  );

  if (dashRows.length === 0) {
    const error = new Error("Không tìm thấy Dashboard yêu cầu.");
    error.statusCode = 404;
    throw error;
  }

  const dash = dashRows[0];

  // Kiểm tra quyền sở hữu
  if (
    Number(dash.Teacher_Moodle_ID) !== Number(teacherContext.moodleUserId) ||
    Number(dash.User_Key) !== Number(teacherContext.userKey)
  ) {
    const error = new Error("Từ chối truy cập: Bạn không có quyền xem Dashboard này.");
    error.statusCode = 403;
    throw error;
  }

  // Lấy danh sách cấu hình biểu đồ đã lưu
  const [chartRows] = await pool.query(
    `
    SELECT
      Chart_ID as dbChartId,
      Client_Chart_ID as chartId,
      Chart_Type as chartType,
      Title as title,
      Description as description,
      X_Axis as xAxis,
      Y_Axis as yAxis,
      Aggregation as aggregation,
      Filter_Rule as filter,
      Reasoning as reasoning,
      Sort_Order as sortOrder,
      Layout_Config as layoutConfig
    FROM app_ai_dashboard_chart
    WHERE Dashboard_ID = ?
    ORDER BY Sort_Order ASC
    `,
    [dashboardId]
  );

  // Tái tạo hoặc truy vấn nguồn dữ liệu sống
  let dataRows = [];
  let sourceOptions = {};
  let datasetProfile = null;

  if (dash.Source_Type === "lms_datawarehouse") {
    // Luôn xác thực quyền và lấy dữ liệu mới nhất từ LMS Data Warehouse
    const lmsProfileResult = await getCourseAggregatedProfile(
      dash.Course_Key,
      teacherContext.moodleUserId
    );
    datasetProfile = lmsProfileResult.profile;
    sourceOptions = {
      sourceType: "lms_datawarehouse",
      sourceName: `${dash.courseCode || "LMS"} — ${dash.courseName || "Khóa học"}`,
      summary: lmsProfileResult.summary,
    };
    const cached = getCachedSource(dash.Source_ID);
    dataRows = cached?.rows || datasetProfile.previewRows || [];
  } else {
    // Nguồn tệp Excel/CSV: khôi phục từ MySQL nếu RAM cache đã bị giải phóng
    const restored = await restoreSourceFromDbIfMissing(dash.Source_ID, teacherContext);
    if (restored) {
      dataRows = restored.rows || [];
      datasetProfile = restored.profile || null;
      sourceOptions = {
        sourceType: dash.Source_Type,
        sourceName: dash.fileName || restored.descriptor?.name || "Tệp dữ liệu",
      };
    }
  }

  // Tái dựng số liệu thực tế (Real Data) cho từng biểu đồ
  const hydratedCharts = chartRows.map((c) => {
    const spec = {
      chartType: c.chartType,
      xAxis: c.xAxis,
      yAxis: c.yAxis,
      aggregation: c.aggregation,
      filter: c.filter,
      title: c.title,
    };
    const realData = computeChartRealData(spec, dataRows, sourceOptions);
    return {
      ...c,
      realData,
    };
  });

  let parsedMetadata = {};
  try {
    parsedMetadata = typeof dash.Metadata_Json === "string" ? JSON.parse(dash.Metadata_Json) : (dash.Metadata_Json || {});
  } catch {}

  return {
    dashboardId: dash.Dashboard_ID,
    title: dash.Title,
    description: dash.Description,
    sourceType: dash.Source_Type,
    sourceId: dash.Source_ID,
    courseKey: dash.Course_Key,
    courseCode: dash.courseCode,
    courseName: dash.courseName,
    fileName: dash.fileName,
    status: dash.Status,
    chartCount: hydratedCharts.length,
    charts: hydratedCharts,
    datasetProfile,
    metadata: parsedMetadata,
    createdAt: dash.Created_At,
    updatedAt: dash.Updated_At,
  };
}

/**
 * Xóa một Dashboard
 * @param {number} dashboardId
 * @param {object} teacherContext
 */
export async function deleteDashboard(dashboardId, teacherContext) {
  const [dashRows] = await pool.query(
    `SELECT Dashboard_ID, Teacher_Moodle_ID, User_Key, Title FROM app_ai_dashboard WHERE Dashboard_ID = ?`,
    [dashboardId]
  );

  if (dashRows.length === 0) {
    const error = new Error("Dashboard không tồn tại.");
    error.statusCode = 404;
    throw error;
  }

  const dash = dashRows[0];
  if (
    Number(dash.Teacher_Moodle_ID) !== Number(teacherContext.moodleUserId) ||
    Number(dash.User_Key) !== Number(teacherContext.userKey)
  ) {
    const error = new Error("Từ chối truy cập: Bạn không có quyền xóa Dashboard này.");
    error.statusCode = 403;
    throw error;
  }

  await pool.query(`DELETE FROM app_ai_dashboard WHERE Dashboard_ID = ?`, [dashboardId]);

  return {
    success: true,
    message: `Đã xóa Dashboard "${dash.Title}" thành công.`,
  };
}

/**
 * Nhân bản một Dashboard
 * @param {number} dashboardId
 * @param {object} teacherContext
 */
export async function duplicateDashboard(dashboardId, teacherContext) {
  const detail = await getDashboardDetail(dashboardId, teacherContext);

  const duplicatedTitle = `[Bản sao] ${detail.title}`.slice(0, 255);

  const newDashboardPayload = {
    title: duplicatedTitle,
    description: detail.description ? `Bản sao từ "${detail.title}". ${detail.description}` : `Bản sao từ "${detail.title}".`,
    sourceType: detail.sourceType,
    sourceId: detail.sourceId,
    courseKey: detail.courseKey,
    charts: detail.charts,
    metadata: detail.metadata,
  };

  return await saveDashboard(newDashboardPayload, teacherContext);
}
