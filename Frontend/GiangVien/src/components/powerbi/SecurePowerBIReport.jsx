import { useEffect, useRef, useState, useCallback } from "react";
import * as pbi from "powerbi-client";
import {
  Lock,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  ExternalLink,
  Info,
  BookOpen,
  LayoutGrid,
} from "lucide-react";
import {
  powerBiEnv,
  checkPowerBiConfig,
  buildSecureEmbedUrl,
  validateSecureEmbedTarget,
  COURSE_FILTER_CONFIG,
  COHORT_FILTER_CONFIG,
  STUDENT_FILTER_CONFIG,
  POWER_BI_PAGES_CONFIG,
} from "../../config/powerBiConfig";
import {
  getPowerBiTokenSilent,
  loginMicrosoftPopup,
  getActiveAccount,
  getMsalDiagnosticTrace,
} from "../../services/powerBiAuthService";

const { models } = pbi;

/**
 * Tìm trang Power BI phù hợp nhất theo id, displayName hoặc key cấu hình
 */
function resolveTargetPage(pages, target) {
  if (!Array.isArray(pages) || !target) return null;
  const raw = String(target).trim();
  const lower = raw.toLowerCase();

  // 1. Khớp theo key trong POWER_BI_PAGES_CONFIG (vd 'QUIZ', 'KNOWLEDGE_GAP', 'COURSE_OVERVIEW', 'GRADE_SIMULATOR'...)
  if (POWER_BI_PAGES_CONFIG[target]) {
    const cfg = POWER_BI_PAGES_CONFIG[target];
    const matchById = pages.find((p) => p.name === cfg.id);
    if (matchById) return matchById;
    const matchByDisplayName = pages.find((p) => p.displayName === cfg.displayName);
    if (matchByDisplayName) return matchByDisplayName;
    if (Array.isArray(cfg.aliasDisplayNames)) {
      const matchByAlias = pages.find((p) =>
        cfg.aliasDisplayNames.some(
          (alias) => String(p.displayName || "").trim().toLowerCase() === String(alias).trim().toLowerCase()
        )
      );
      if (matchByAlias) return matchByAlias;
    }
  }

  // 2. Khớp tuyệt đối theo GUID (name)
  const byName = pages.find((p) => p.name === raw);
  if (byName) return byName;

  // 3. Khớp tuyệt đối theo displayName
  const byDisplayNameExact = pages.find((p) => p.displayName === raw);
  if (byDisplayNameExact) return byDisplayNameExact;

  // 4. Khớp qua alias trong toàn bộ POWER_BI_PAGES_CONFIG
  for (const key of Object.keys(POWER_BI_PAGES_CONFIG)) {
    const cfg = POWER_BI_PAGES_CONFIG[key];
    if (Array.isArray(cfg.aliasDisplayNames)) {
      const hasAlias = cfg.aliasDisplayNames.some(
        (alias) => String(alias).trim().toLowerCase() === lower
      );
      if (hasAlias) {
        const foundPage = pages.find((p) => p.name === cfg.id || p.displayName === cfg.displayName);
        if (foundPage) return foundPage;
      }
    }
  }

  // 5. Khớp chứa chuỗi (contains) theo displayName
  const byDisplayNamePartial = pages.find((p) =>
    String(p.displayName || "").toLowerCase().includes(lower)
  );
  if (byDisplayNamePartial) return byDisplayNamePartial;

  // 6. Khớp đặc thù cho trang "Chi tiết chuyên cần" / "What-if simulator"
  if (lower.includes("chuyên cần") && (lower.includes("chi tiết") || lower.includes("điểm điều chỉnh") || lower.includes("what-if") || lower.includes("simulator"))) {
    const simPage = pages.find(
      (p) =>
        p.name === POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR.id ||
        String(p.displayName || "").toLowerCase().includes("simulator") ||
        String(p.displayName || "").toLowerCase().includes("08")
    );
    if (simPage) return simPage;
  }

  return null;
}

// Khởi tạo instance service Power BI an toàn (tránh phụ thuộc biến toàn cục)
function getPowerBiService() {
  if (typeof window !== "undefined" && window.powerbi) {
    return window.powerbi;
  }
  return new pbi.service.Service(
    pbi.factories.hpmFactory,
    pbi.factories.wpmpFactory,
    pbi.factories.routerFactory
  );
}

/**
 * Component nhúng Power BI bảo mật (User owns data)
 * - Tự động xác thực qua Microsoft Entra ID
 * - Lọc tự động Course_Key trên bảng 'lms_datawarehouse dim_course'
 * - Không tải lại báo cáo khi đổi môn (chỉ cập nhật filter trên instance hiện tại)
 * - Container luôn hiển thị trong DOM để tính toán kích thước chuẩn, loading hiển thị overlay
 * - Hỗ trợ khám phá và điều hướng 7 trang báo cáo qua report.getPages() và report.setPage()
 * - Sẵn sàng hỗ trợ điều khiển Bookmark (CC_MO, GK_MO...)
 */
function SecurePowerBIReport({
  reportId: propReportId,
  embedUrl: propEmbedUrl,
  courseKey,
  cohort,
  userKey,
  username,
  targetPage = null,
  targetPageDisplayName = null,
  height = "auto",
  aspectRatio = "16 / 9",
  displayOption,
  displayMode = "fitToWidth",
  isExpanded = false,
  onLoaded,
  onError,
  onPagesLoaded,
  onPageNotFound,
  hidePageNavigation = true,
  filterMode = "lms",
  onStudentSelect,
}) {
  const containerRef = useRef(null);
  // Generic Studio reports have their own schema; LMS reports retain mandatory course filtering.
  const isStudioReport = filterMode === "report" && Boolean(propReportId);
  const reportRef = useRef(null);
  const isMountedRef = useRef(true);

  // Xác định display mode ưu tiên từ prop displayOption hoặc displayMode
  const activeDisplayOption = displayOption || displayMode || "fitToWidth";

  // Lưu trữ các tham số mới nhất bằng Ref
  const filterParamsRef = useRef({ courseKey, cohort, userKey, username });
  filterParamsRef.current = { courseKey, cohort, userKey, username };

  const displayModeRef = useRef(activeDisplayOption);
  displayModeRef.current = activeDisplayOption;

  const courseKeyRef = useRef(courseKey);
  courseKeyRef.current = courseKey;

  const currentFilteredKeyRef = useRef(null);

  const targetPageRef = useRef(targetPage || targetPageDisplayName);
  targetPageRef.current = targetPage || targetPageDisplayName;

  // Quản lý thứ tự yêu cầu lọc để chống race condition
  const filterSequenceRef = useRef(0);
  const currentFilteredStateRef = useRef("");

  // Trạng thái thành phần
  // 'checking' | 'unconfigured' | 'need_login' | 'loading' | 'filtering' | 'ready' | 'no_permission' | 'error' | 'invalid_course' | 'page_not_found'
  const [status, setStatus] = useState("checking");
  const [sdkPhase, setSdkPhase] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [userAccount, setUserAccount] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [missingConfigKeys, setMissingConfigKeys] = useState([]);

  // Danh sách trang nội bộ của báo cáo lấy động từ report.getPages()
  const [reportPages, setReportPages] = useState([]);
  const [activePageName, setActivePageName] = useState("");
  const [isPageSwitching, setIsPageSwitching] = useState(false);
  const [pageAspectRatio, setPageAspectRatio] = useState(aspectRatio || "16 / 9");

  // Nhật ký chẩn đoán xác thực Microsoft (không nhạy cảm)
  const [diagTrace, setDiagTrace] = useState(null);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  // Tạo bộ lọc Course_Key theo chuẩn Power BI Basic Filter
  const createCourseFilter = useCallback((targetKey) => {
    return {
      $schema: "http://powerbi.com/product/schema#basic",
      target: {
        table: COURSE_FILTER_CONFIG.table,
        column: COURSE_FILTER_CONFIG.column,
      },
      operator: "In",
      values: [Number(targetKey)],
      filterType: models.FilterType.Basic,
    };
  }, []);

  // Tạo các bộ lọc Cohort (hỗ trợ cả lms_datawarehouse dim_user và StudentAssignmentStatus)
  const createCohortFilters = useCallback((targetCohort) => {
    const norm = String(targetCohort || "").trim().toUpperCase();
    if (!norm) return [];

    const list = [];

    // 1. Bảng dim_user (bảng chứa thông tin sinh viên)
    if (COHORT_FILTER_CONFIG.userTable && COHORT_FILTER_CONFIG.userColumn) {
      list.push({
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: COHORT_FILTER_CONFIG.userTable,
          column: COHORT_FILTER_CONFIG.userColumn,
        },
        operator: "In",
        values: [norm],
        filterType: models.FilterType.Basic,
      });
    }

    // 2. Bảng primaryTable (StudentAssignmentStatus) nếu khác userTable
    if (
      COHORT_FILTER_CONFIG.primaryTable &&
      COHORT_FILTER_CONFIG.primaryColumn &&
      COHORT_FILTER_CONFIG.primaryTable.toLowerCase() !== (COHORT_FILTER_CONFIG.userTable || "").toLowerCase()
    ) {
      list.push({
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: COHORT_FILTER_CONFIG.primaryTable,
          column: COHORT_FILTER_CONFIG.primaryColumn,
        },
        operator: "In",
        values: [norm],
        filterType: models.FilterType.Basic,
      });
    }

    return list;
  }, []);

  const createCohortFilter = useCallback((targetCohort) => {
    const filters = createCohortFilters(targetCohort);
    return filters.length > 0 ? filters[0] : null;
  }, [createCohortFilters]);

  // Tạo bộ lọc Sinh viên (User_Key hoặc Username)
  const createStudentFilter = useCallback((targetUserKey, targetUsername) => {
    const numKey = Number(targetUserKey);
    if (Number.isFinite(numKey) && numKey > 0) {
      return {
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: STUDENT_FILTER_CONFIG.table,
          column: STUDENT_FILTER_CONFIG.column,
        },
        operator: "In",
        values: [numKey],
        filterType: models.FilterType.Basic,
      };
    }
    const cleanUser = String(targetUsername || "").trim();
    if (cleanUser) {
      return {
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: STUDENT_FILTER_CONFIG.table,
          column: STUDENT_FILTER_CONFIG.usernameColumn,
        },
        operator: "In",
        values: [cleanUser],
        filterType: models.FilterType.Basic,
      };
    }
    return null;
  }, []);

  /**
   * Áp dụng chế độ co giãn canvas (Fit to page / Fit to width) qua API chính thức powerbi-client
   * models.DisplayOption: FitToPage = 0, FitToWidth = 1, ActualSize = 2
   */
  const applyDisplayOptionToReport = useCallback(
    async (reportInstance, opt) => {
      if (!reportInstance) return;
      const rawMode = String(opt || displayModeRef.current || "fitToWidth").trim().toLowerCase();

      const isFitPage = rawMode === "fittopage" || rawMode === "fit_to_page" || rawMode === "fit-to-page";
      const isActualSize = rawMode === "actualsize" || rawMode === "actual_size" || rawMode === "actual-size";

      let pbiDisplayOption = models.DisplayOption.FitToWidth;
      let pageViewString = "fitToWidth";

      if (isFitPage) {
        pbiDisplayOption = models.DisplayOption.FitToPage;
        pageViewString = "fitToPage";
      } else if (isActualSize) {
        pbiDisplayOption = models.DisplayOption.ActualSize;
        pageViewString = "actualSize";
      }

      try {
        await reportInstance.updateSettings({
          layoutType: models.LayoutType.Custom,
          customLayout: {
            displayOption: pbiDisplayOption,
          },
        });
        console.log(
          `[PowerBI Embed] Áp dụng customLayout displayOption: ${
            isFitPage ? "FitToPage (0)" : isActualSize ? "ActualSize (2)" : "FitToWidth (1)"
          }`
        );
      } catch (customErr) {
        console.warn("[PowerBI Embed] updateSettings customLayout:", customErr?.message || customErr);
        try {
          await reportInstance.updateSettings({ pageView: pageViewString });
        } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ 
          // ignore
        }
      }
    },
    []
  );

  /**
   * Áp dụng đồng thời các bộ lọc Course_Key, Cohort và Student
   * Giữ lại các bộ lọc khác ngoài phạm vi LMS quản lý
   */
  const applyAllFiltersToReport = useCallback(
    async (reportInstance, params) => {
      if (!reportInstance) return;
      if (isStudioReport) {
        if (isMountedRef.current) setStatus("ready");
        return;
      }

      const seqId = ++filterSequenceRef.current;
      const { courseKey: cKey, cohort: coh, userKey: uKey, username: uName } = params;

      try {
        if (isMountedRef.current) {
          setStatus("filtering");
        }

        // Lấy danh sách filter hiện tại để bảo toàn filter khác
        let otherFilters = [];
        try {
          const currentFilters = await reportInstance.getFilters();
          if (Array.isArray(currentFilters)) {
            otherFilters = currentFilters.filter((f) => {
              const tbl = (f?.target?.table || "").toLowerCase();
              const col = (f?.target?.column || "").toLowerCase();

              const isCourse =
                tbl === COURSE_FILTER_CONFIG.table.toLowerCase() &&
                col === COURSE_FILTER_CONFIG.column.toLowerCase();

              const isCohort =
                (tbl === COHORT_FILTER_CONFIG.primaryTable.toLowerCase() &&
                  col === COHORT_FILTER_CONFIG.primaryColumn.toLowerCase()) ||
                (tbl === COHORT_FILTER_CONFIG.userTable.toLowerCase() &&
                  col === COHORT_FILTER_CONFIG.userColumn.toLowerCase());

              const isStudent =
                tbl === STUDENT_FILTER_CONFIG.table.toLowerCase() &&
                (col === STUDENT_FILTER_CONFIG.column.toLowerCase() ||
                  col === STUDENT_FILTER_CONFIG.usernameColumn.toLowerCase());

              return !isCourse && !isCohort && !isStudent;
            });
          }
        } catch (filterGetErr) {
          console.warn("[PowerBI] Không thể lấy filters hiện tại:", filterGetErr.message);
        }

        // Tạo mảng filter mới
        const newFilters = [];

        // 1. Course Filter
        const numCourseKey = Number(cKey);
        if (Number.isFinite(numCourseKey) && numCourseKey > 0) {
          newFilters.push(createCourseFilter(numCourseKey));
        }

        // 2. Cohort Filter (áp dụng cho cả dim_user và StudentAssignmentStatus)
        if (coh) {
          const cohortFilters = createCohortFilters(coh);
          if (cohortFilters.length > 0) {
            newFilters.push(...cohortFilters);
          }
        }

        // 3. Student Filter
        const studentFilter = createStudentFilter(uKey, uName);
        if (studentFilter) {
          newFilters.push(studentFilter);
        }

        const finalFilters = [...otherFilters, ...newFilters];
        console.log("[PBI FILTER REQUESTED]", JSON.stringify(finalFilters, null, 2));

        let applied = false;
        let lastError = null;
        try {
          await reportInstance.setFilters(finalFilters);
          applied = true;
          console.log("[PowerBI Embed] report.setFilters() thành công với đầy đủ filters!");
        } catch (setBothErr) {
          lastError = setBothErr;
          console.warn("[PowerBI Embed] Thử setFilters cả 2 bảng Cohort gặp lỗi:", setBothErr?.message || setBothErr);

          // Thử lần 1: Chỉ lọc userTable (lms_datawarehouse dim_user)
          try {
            const userOnlyFilters = finalFilters.filter(
              (f) => (f?.target?.table || "").toLowerCase() !== COHORT_FILTER_CONFIG.primaryTable.toLowerCase()
            );
            console.log("[PBI FILTER DEBUG RETRY dim_user only]", JSON.stringify(userOnlyFilters, null, 2));
            await reportInstance.setFilters(userOnlyFilters);
            applied = true;
            console.log("[PowerBI Embed] Thành công khi lọc Cohort theo 'lms_datawarehouse dim_user'!");
          } catch (dimErr) {
            lastError = dimErr;
            console.warn("[PowerBI Embed] Lọc dim_user thất bại:", dimErr?.message || dimErr);

            // Thử lần 2: Chỉ lọc primaryTable (StudentAssignmentStatus)
            try {
              const primaryOnlyFilters = finalFilters.filter(
                (f) => (f?.target?.table || "").toLowerCase() !== (COHORT_FILTER_CONFIG.userTable || "").toLowerCase()
              );
              console.log("[PBI FILTER DEBUG RETRY primaryTable only]", JSON.stringify(primaryOnlyFilters, null, 2));
              await reportInstance.setFilters(primaryOnlyFilters);
              applied = true;
              console.log("[PowerBI Embed] Thành công khi lọc Cohort theo primaryTable!");
            } catch (primErr) {
              lastError = primErr;
              console.error("[PowerBI Embed] Cả 2 cách lọc Cohort đều thất bại:", primErr?.message || primErr);
            }
          }
        }

        // Đọc lại filters thực tế từ Power BI để đối chiếu (Verification step)
        const verifiedFilters = await reportInstance.getFilters();
        console.log("[PBI GET FILTERS VERIFICATION]", JSON.stringify(verifiedFilters, null, 2));

        // Kiểm chứng: Nếu có chỉ định Course_Key, verifiedFilters phải chứa filter Course_Key hợp lệ
        if (numCourseKey > 0) {
          const hasVerifiedCourse = Array.isArray(verifiedFilters) && verifiedFilters.some((f) => {
            const col = (f?.target?.column || "").toLowerCase();
            return (
              (col === "course_key" || col === COURSE_FILTER_CONFIG.column.toLowerCase()) &&
              Array.isArray(f?.values) &&
              f.values.map(Number).includes(numCourseKey)
            );
          });

          if (!hasVerifiedCourse && !applied) {
            throw new Error(
              `Không thể áp dụng bộ lọc Môn '${numCourseKey}' vào Semantic Model Power BI (${lastError?.message || "Bảng hoặc cột Course_Key không tồn tại"})`
            );
          }
        }

        // Kiểm chứng: Nếu có chỉ định cohort, verifiedFilters phải chứa filter Cohort hợp lệ
        if (coh) {
          const normCoh = String(coh).trim().toUpperCase();
          const hasVerifiedCohort = Array.isArray(verifiedFilters) && verifiedFilters.some((f) => {
            const col = (f?.target?.column || "").toLowerCase();
            return col === "cohort" && Array.isArray(f?.values) && f.values.map((v) => String(v).toUpperCase()).includes(normCoh);
          });

          if (!hasVerifiedCohort && !applied) {
            throw new Error(
              `Không thể áp dụng bộ lọc Khóa '${normCoh}' vào Semantic Model Power BI (${lastError?.message || "Bảng hoặc cột Cohort không tồn tại"})`
            );
          }
        }

        // Kiểm tra và đồng bộ Page-level & Visual-level filters
        // Loại bỏ xung đột khi trang báo cáo có sẵn filter lưu cứng (ví dụ Course_Key = 12 được lưu khi publish)
        try {
          const pages = await reportInstance.getPages();
          const activePage = pages.find((p) => p.isActive) || pages[0];
          if (activePage) {
            const pageFilters = await activePage.getFilters();
            console.log(`[PBI PAGE FILTERS: ${activePage.displayName}]`, JSON.stringify(pageFilters, null, 2));

            // Đồng bộ page-level filter nếu có filter Course_Key, Cohort hoặc Student cố định
            if (Array.isArray(pageFilters) && pageFilters.length > 0) {
              let pageChanged = false;
              let hasPageStudentFilter = false;
              let hasPageCourseFilter = false;
              const updatedPageFilters = [];

              for (const pf of pageFilters) {
                const col = (pf?.target?.column || "").toLowerCase();
                const tbl = (pf?.target?.table || "").toLowerCase();

                // 1. Nhận diện bộ lọc Môn học (Course_Key hoặc Course_Name trên bất kỳ bảng nào)
                const isCourseKey =
                  col === "course_key" ||
                  (tbl === COURSE_FILTER_CONFIG.table.toLowerCase() &&
                    col === COURSE_FILTER_CONFIG.column.toLowerCase());

                const isCourseName =
                  col === "course_name" || col === "coursename" || col === "tên môn học";

                // 2. Nhận diện bộ lọc Khóa (Cohort)
                const isCohort =
                  col === "cohort" ||
                  (tbl === COHORT_FILTER_CONFIG.userTable.toLowerCase() &&
                    col === COHORT_FILTER_CONFIG.userColumn.toLowerCase()) ||
                  (tbl === COHORT_FILTER_CONFIG.primaryTable.toLowerCase() &&
                    col === COHORT_FILTER_CONFIG.primaryColumn.toLowerCase());

                // 3. Nhận diện bộ lọc Sinh viên (Username, User_Key trên dim_user)
                const isStudent =
                  col === "username" ||
                  col === "user_key" ||
                  col === "user key" ||
                  col === STUDENT_FILTER_CONFIG.column.toLowerCase() ||
                  col === STUDENT_FILTER_CONFIG.usernameColumn.toLowerCase() ||
                  tbl === STUDENT_FILTER_CONFIG.table.toLowerCase();

                // 4. Nhận diện bộ lọc What-if Slicer lưu cứng (Đầu điểm điều chỉnh động)
                const isWhatIfItemKey =
                  (tbl.includes("điều chỉnh") || tbl.includes("dieu chinh")) &&
                  (col === "item_key" || col === "item key");

                if (isCourseKey) {
                  if (numCourseKey > 0) {
                    const curVal = Array.isArray(pf.values) ? pf.values[0] : null;
                    if (Number(curVal) !== numCourseKey) {
                      pageChanged = true;
                    }
                    updatedPageFilters.push({ ...pf, values: [numCourseKey] });
                    hasPageCourseFilter = true;
                  } else {
                    pageChanged = true;
                  }
                } else if (isCourseName) {
                  // Gỡ bỏ filter Course_Name lưu cứng (ví dụ 'Phát triển ứng dụng Game nâng cao')
                  // để tránh xung đột với Course_Key
                  console.log(`[PBI Page Filter] Gỡ bỏ filter Course_Name lưu cứng: ${JSON.stringify(pf.values)}`);
                  pageChanged = true;
                } else if (isCohort) {
                  if (coh) {
                    const normCoh = String(coh).trim().toUpperCase();
                    const curVal = Array.isArray(pf.values) ? pf.values[0] : null;
                    if (String(curVal).toUpperCase() !== normCoh) {
                      pageChanged = true;
                    }
                    updatedPageFilters.push({ ...pf, values: [normCoh] });
                  } else {
                    pageChanged = true;
                  }
                } else if (isStudent) {
                  // Đồng bộ bộ lọc Sinh viên theo sinh viên được chọn trên web
                  const cleanUName = String(uName || "").trim();
                  const numUKey = Number(uKey);

                  if (cleanUName) {
                    const curVal = Array.isArray(pf.values) ? pf.values[0] : null;
                    if (String(curVal).toLowerCase() !== cleanUName.toLowerCase()) {
                      pageChanged = true;
                    }
                    updatedPageFilters.push({
                      $schema: "http://powerbi.com/product/schema#basic",
                      target: {
                        table: STUDENT_FILTER_CONFIG.table,
                        column: STUDENT_FILTER_CONFIG.usernameColumn,
                      },
                      operator: "In",
                      values: [cleanUName],
                      filterType: models.FilterType.Basic,
                    });
                    hasPageStudentFilter = true;
                  } else if (Number.isFinite(numUKey) && numUKey > 0) {
                    const curVal = Array.isArray(pf.values) ? pf.values[0] : null;
                    if (Number(curVal) !== numUKey) {
                      pageChanged = true;
                    }
                    updatedPageFilters.push({
                      $schema: "http://powerbi.com/product/schema#basic",
                      target: {
                        table: STUDENT_FILTER_CONFIG.table,
                        column: STUDENT_FILTER_CONFIG.column,
                      },
                      operator: "In",
                      values: [numUKey],
                      filterType: models.FilterType.Basic,
                    });
                    hasPageStudentFilter = true;
                  } else {
                    // Nếu chưa chọn sinh viên, gỡ bỏ filter sinh viên lưu cứng (ví dụ sv2210003)
                    console.log(`[PBI Page Filter] Gỡ bỏ filter Username lưu cứng: ${JSON.stringify(pf.values)}`);
                    pageChanged = true;
                  }
                } else if (isWhatIfItemKey) {
                  // Gỡ bỏ filter What-if lưu cứng (Item_Key = 8) để visual không bị khóa vào item của Game
                  console.log(`[PBI Page Filter] Gỡ bỏ filter What-if Item_Key lưu cứng: ${JSON.stringify(pf.values)}`);
                  pageChanged = true;
                } else {
                  updatedPageFilters.push(pf);
                }
              }

              // Nếu trên Page chưa có filter sinh viên và người dùng đang chọn sinh viên:
              if (!hasPageStudentFilter && (uName || uKey)) {
                const stFilter = createStudentFilter(uKey, uName);
                if (stFilter) {
                  updatedPageFilters.push(stFilter);
                  pageChanged = true;
                }
              }

              // Nếu trên Page chưa có filter Course_Key:
              if (!hasPageCourseFilter && numCourseKey > 0) {
                updatedPageFilters.push(createCourseFilter(numCourseKey));
                pageChanged = true;
              }

              if (pageChanged) {
                console.log(
                  `[PBI] Đồng bộ triệt để Page-level filters trên trang '${activePage.displayName}':`,
                  {
                    courseKey: numCourseKey,
                    cohort: coh,
                    studentUsername: uName,
                    studentUserKey: uKey,
                  }
                );
                await activePage.setFilters(updatedPageFilters);
                const newPf = await activePage.getFilters();
                console.log("[PBI UPDATED PAGE FILTERS]", JSON.stringify(newPf, null, 2));
              }
            } else if (uName || uKey || numCourseKey > 0) {
              // Trang chưa có page-level filter nào, bổ sung nếu cần
              const newPfList = [];
              if (numCourseKey > 0) newPfList.push(createCourseFilter(numCourseKey));
              if (uName || uKey) {
                const sf = createStudentFilter(uKey, uName);
                if (sf) newPfList.push(sf);
              }
              if (newPfList.length > 0) {
                console.log(`[PBI] Thêm Page-level filters mới trên '${activePage.displayName}'`);
                await activePage.setFilters(newPfList);
              }
            }

            // Kiểm tra và đồng bộ visual-level filters nếu có filter Course_Key hoặc Cohort
            const visuals = await activePage.getVisuals();
            for (const v of visuals) {
              try {
                const vFilters = await v.getFilters();
                if (Array.isArray(vFilters) && vFilters.length > 0) {
                  let vChanged = false;
                  const updatedVFilters = [];

                  for (const vf of vFilters) {
                    const col = (vf?.target?.column || "").toLowerCase();
                    const tbl = (vf?.target?.table || "").toLowerCase();

                    const isCourse =
                      (tbl === COURSE_FILTER_CONFIG.table.toLowerCase() || !tbl) &&
                      (col === COURSE_FILTER_CONFIG.column.toLowerCase() || col === "course_key");

                    const isCohort =
                      col === "cohort" ||
                      (tbl === COHORT_FILTER_CONFIG.userTable.toLowerCase() && col === COHORT_FILTER_CONFIG.userColumn.toLowerCase()) ||
                      (tbl === COHORT_FILTER_CONFIG.primaryTable.toLowerCase() && col === COHORT_FILTER_CONFIG.primaryColumn.toLowerCase());

                    if (isCourse) {
                      if (numCourseKey > 0) {
                        const curVal = Array.isArray(vf.values) ? vf.values[0] : null;
                        if (Number(curVal) !== numCourseKey) vChanged = true;
                        updatedVFilters.push({ ...vf, values: [numCourseKey] });
                      } else {
                        vChanged = true;
                      }
                    } else if (isCohort) {
                      if (coh) {
                        const normCoh = String(coh).trim().toUpperCase();
                        const curVal = Array.isArray(vf.values) ? vf.values[0] : null;
                        if (String(curVal).toUpperCase() !== normCoh) vChanged = true;
                        updatedVFilters.push({ ...vf, values: [normCoh] });
                      } else {
                        vChanged = true;
                      }
                    } else {
                      updatedVFilters.push(vf);
                    }
                  }

                  if (vChanged) {
                    console.log(`[PBI] Cập nhật Visual-level filter cho '${v.title || v.name}'`);
                    await v.setFilters(updatedVFilters);
                  }
                }
              } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ 
                // Ignore visuals that do not support getFilters
              }
            }
          }
        } catch (inspectErr) {
          console.warn("[PBI INSPECT ERROR]", inspectErr?.message);
        }

        // Cập nhật trạng thái nếu vẫn là yêu cầu mới nhất
        if (isMountedRef.current && filterSequenceRef.current === seqId) {
          currentFilteredStateRef.current = JSON.stringify({ cKey, coh, uKey, uName });
          setStatus("ready");
        }
      } catch (err) {
        console.error("[PowerBI Embed] Lỗi khi áp dụng bộ lọc:", err?.message || err, err);
        if (isMountedRef.current && filterSequenceRef.current === seqId) {
          // Báo lỗi rõ ràng, KHÔNG nuốt lỗi rồi fallback sang chỉ Course_Key và hiển thị ready sai lệch
          setErrorMessage(`Không thể áp dụng bộ lọc báo cáo Power BI: ${err?.message || "Lỗi cấu hình bộ lọc"}`);
          setStatus("error");
        }
      }
    },
    [createCourseFilter, createCohortFilters, createStudentFilter, isStudioReport]
  );

  /**
   * Khởi tạo và nhúng báo cáo Power BI
   * Lưu ý: Hàm này KHÔNG phụ thuộc vào courseKey để không bao giờ bị re-create hay re-embed khi đổi môn!
   */
  const embedReport = useCallback(
    async (accessToken) => {
      if (!containerRef.current) return;

      const reportId = propReportId || powerBiEnv.reportId;
      const embedUrl = propEmbedUrl || (reportId ? `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${powerBiEnv.workspaceId}` : buildSecureEmbedUrl());

      if (!embedUrl || !reportId) {
        if (isMountedRef.current) {
          setStatus("unconfigured");
          setErrorMessage("Thiếu thông tin Report ID hoặc Embed URL.");
        }
        return;
      }
      validateSecureEmbedTarget(reportId, embedUrl);
      setSdkPhase('loading');

      if (isMountedRef.current) {
        setStatus("loading");
      }

      const powerbi = getPowerBiService();

      // Dọn dẹp instance cũ trước khi nhúng mới
      powerbi.reset(containerRef.current);

      // Cấu hình ban đầu: nạp filter môn, khóa, sinh viên ngay trong embedConfig
      const initialFilters = [];
      const currentParams = filterParamsRef.current;
      const currentKey = Number(currentParams.courseKey);
      if (Number.isFinite(currentKey) && currentKey > 0) {
        initialFilters.push(createCourseFilter(currentKey));
      }
      if (currentParams.cohort) {
        const cFilters = createCohortFilters(currentParams.cohort);
        if (cFilters && cFilters.length > 0) initialFilters.push(...cFilters);
      }
      if (currentParams.userKey || currentParams.username) {
        const uFilter = createStudentFilter(currentParams.userKey, currentParams.username);
        if (uFilter) initialFilters.push(uFilter);
      }

      const isFitToPage = displayModeRef.current === "fitToPage";

      const embedConfig = {
        type: "report",
        tokenType: models.TokenType.Aad,
        accessToken,
        embedUrl,
        id: reportId,
        permissions: models.Permissions.Read,
        eventHooks: {
          accessTokenProvider: async () => {
            try {
              const token = await getPowerBiTokenSilent();
              if (!token && isMountedRef.current) { setSdkPhase('need_login'); setStatus('need_login'); }
              return token;
            } catch {
              if (isMountedRef.current) { setSdkPhase('need_login'); setStatus('need_login'); }
              return null;
            }
          },
        },
        filters: initialFilters,
        settings: {
          layoutType: models.LayoutType.Custom,
          customLayout: {
            displayOption: isFitToPage
              ? models.DisplayOption.FitToPage
              : models.DisplayOption.FitToWidth,
          },
          panes: {
            filters: {
              expanded: false,
              visible: false, // Ẩn filter pane mặc định
            },
            pageNavigation: {
              visible: false, // Ẩn thanh chuyển trang mặc định để LMS điều hướng
            },
          },
          background: models.BackgroundType.Default,
        },
      };

      if (!isFitToPage) {
        embedConfig.pageView = "fitToWidth";
      }

      if (!isStudioReport && powerBiEnv.coursePageName) {
        embedConfig.pageName = powerBiEnv.coursePageName;
      } else if (targetPageRef.current) {
        const rawTarget = String(targetPageRef.current).trim();
        if (POWER_BI_PAGES_CONFIG[rawTarget]?.id) {
          embedConfig.pageName = POWER_BI_PAGES_CONFIG[rawTarget].id;
        } else if (/^[a-f0-9]{20}$/i.test(rawTarget) || /^ReportSection/i.test(rawTarget)) {
          embedConfig.pageName = rawTarget;
        }
      }

      try {
        const report = powerbi.embed(containerRef.current, embedConfig);
        reportRef.current = report;

        // Xóa listener cũ trước khi gắn mới
        report.off("loaded");
        report.off("rendered");
        report.off("error");
        report.off("pageChanged");

        // Khi báo cáo nạp xong metadata (loaded)
        report.on("loaded", async () => {
          if (!isMountedRef.current) return;
          setSdkPhase('loaded');

          // 1. Lấy danh sách 7 trang nội bộ và chuyển sang trang đích (nếu có) trước khi lọc
          try {
            const pages = await report.getPages();
            console.log(
              "[PowerBI] Danh sách trang thực tế từ report.getPages():",
              pages.map((p) => ({ name: p.name, displayName: p.displayName, isActive: p.isActive }))
            );
            if (isMountedRef.current && Array.isArray(pages) && pages.length > 0) {
              setReportPages(pages);

              // Tự động chuyển đến trang chỉ định (targetPage hoặc targetPageDisplayName)
              const requestedTarget = targetPageRef.current;
              let targetMatchedPage = null;

              if (requestedTarget) {
                targetMatchedPage = resolveTargetPage(pages, requestedTarget);
              }

              if (targetMatchedPage) {
                try {
                  await report.setPage(targetMatchedPage.name);
                  setActivePageName(targetMatchedPage.name);
                  try {
                    await report.updateSettings({
                      layoutType: models.LayoutType.Custom,
                      customLayout: {
                        displayOption: isFitToPage
                          ? models.DisplayOption.FitToPage
                          : models.DisplayOption.FitToWidth,
                      },
                    });
                  } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ 
                    // ignore
                  }
                } catch (setErr) {
                  console.warn("[PowerBI] Không thể chuyển sang trang:", targetMatchedPage.displayName, setErr.message);
                }
              } else if (requestedTarget) {
                // Đã yêu cầu trang nhưng không tìm thấy trong báo cáo!
                console.warn(`[PowerBI] Không tìm thấy trang đích: '${requestedTarget}' trong danh sách trang:`, pages.map((p) => p.displayName));
                if (isMountedRef.current) {
                  setStatus("page_not_found");
                  setErrorMessage(`Không tìm thấy trang '${requestedTarget}' trong báo cáo Power BI.`);
                  if (onPageNotFound) {
                    onPageNotFound(requestedTarget, pages);
                  }
                }
              }

              const activePage = targetMatchedPage || pages.find((p) => p.isActive) || pages[0];
              if (activePage) {
                if (!targetMatchedPage) {
                  setActivePageName(activePage.name);
                }
                // Tự động nhận diện tỷ lệ canvas thực tế của trang từ metadata
                if (activePage?.defaultSize?.width && activePage?.defaultSize?.height) {
                  const w = Number(activePage.defaultSize.width);
                  const h = Number(activePage.defaultSize.height);
                  if (w > 0 && h > 0) {
                    setPageAspectRatio(`${w} / ${h}`);
                    console.log(
                      `[PowerBI Embed] Tỷ lệ canvas thực tế của trang '${activePage.displayName}': ${w}x${h} (${(
                        w / h
                      ).toFixed(2)})`
                    );
                  }
                }
              }

              if (onPagesLoaded) {
                onPagesLoaded(pages);
              }
            }
          } catch (pagesErr) {
            console.warn("[PowerBI] Không thể lấy danh sách trang bằng getPages():", pagesErr.message);
          }

          // 2. Áp dụng tất cả bộ lọc sau khi trang đích đã được kích hoạt
          await applyAllFiltersToReport(report, filterParamsRef.current);

          // 3. Đảm bảo chế độ hiển thị chuẩn xác (Fit to page / Fit to width) sau khi loaded
          try {
            await applyDisplayOptionToReport(report, displayModeRef.current);
          } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ 
            // ignore
          }

          if (onLoaded) onLoaded(report);
        });

        // Khi báo cáo vẽ xong toàn bộ visual
        report.on("rendered", async () => {
          if (!isMountedRef.current) return;
          setSdkPhase('rendered');
        });

        // Theo dõi sự kiện trang thay đổi
        report.on("pageChanged", async (event) => {
          if (!isMountedRef.current) return;
          const newPage = event?.detail?.newPage;
          if (newPage?.name) {
            setActivePageName(newPage.name);
          }
          try {
            await applyDisplayOptionToReport(report, displayModeRef.current);
          } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ 
            // ignore
          }
        });

        // Bắt sự kiện chọn dữ liệu trực tiếp trên Visual Power BI (dataSelected)
        report.on("dataSelected", (event) => {
          if (!isMountedRef.current) return;
          try {
            const dataPoints = event?.detail?.dataPoints;
            console.log("[PowerBI dataSelected Event]:", event?.detail);

            if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
              return;
            }

            // Quét identity để tìm định danh sinh viên (User_Key, Username)
            let detectedUserKey = null;
            let detectedUsername = null;

            for (const point of dataPoints) {
              const identities = point?.identity || [];
              for (const id of identities) {
                const col = String(id?.target?.column || "").toLowerCase();
                if (col.includes("user_key") || col === "user key") {
                  detectedUserKey = id.equals;
                } else if (col.includes("username") || col.includes("mssv")) {
                  detectedUsername = id.equals;
                }
              }

              // Kiểm tra trong values nếu identity không chứa trực tiếp
              const values = point?.values || [];
              for (const val of values) {
                const col = String(val?.target?.column || "").toLowerCase();
                if (col.includes("user_key")) {
                  detectedUserKey = val.value;
                } else if (col.includes("username") || col.includes("mssv")) {
                  detectedUsername = val.value;
                }
              }
            }

            if (detectedUserKey || detectedUsername) {
              console.log("[PowerBI dataSelected] Đã phát hiện danh tính sinh viên từ click visual:", {
                userKey: detectedUserKey,
                username: detectedUsername,
              });
              if (typeof onStudentSelect === "function") {
                onStudentSelect({
                  userKey: detectedUserKey,
                  username: detectedUsername,
                  source: "powerbi_dataSelected",
                });
              }
            } else {
              console.log(
                "[PowerBI dataSelected] Visual phát sinh event nhưng không chứa cột User_Key hoặc Username trong identity payload."
              );
            }
          } catch (e) {
            console.warn("[PowerBI dataSelected] Lỗi xử lý sự kiện click visual:", e);
          }
        });

        // Khi có lỗi từ Power BI SDK
        report.on("error", (event) => {
          if (!isMountedRef.current) return;

          const detail = event?.detail || {};
          const msg = detail.message || detail.detailedMessage || "Lỗi tải báo cáo từ Power BI.";
          setSdkPhase('error');
          console.error("[PowerBI SDK Error]:", detail.errorCode || 'REPORT_ERROR');

          if (
            msg.includes("PowerBIEntityNotFound") ||
            msg.includes("Unauthorized") ||
            msg.includes("Forbidden") ||
            detail.errorCode === "ExplorationContainer_FailedToLoadModel"
          ) {
            setStatus("no_permission");
            setErrorMessage(
              "Tài khoản Microsoft hiện tại không có quyền truy cập Workspace hoặc Báo cáo này. Vui lòng kiểm tra quyền trên Power BI Service."
            );
          } else {
            setStatus("error");
            setErrorMessage(msg);
          }

          if (onError) onError(event);
        });
      } catch (err) {
        console.error("[PowerBI Embed] Exception khi gọi embed():", err);
        if (isMountedRef.current) {
          setStatus("error");
          setErrorMessage(err.message || "Không thể khởi tạo báo cáo Power BI.");
        }
      }
    },
    [
      createCourseFilter,
      createCohortFilter,
      createStudentFilter,
      applyAllFiltersToReport,
      onLoaded,
      onError,
      onPagesLoaded,
      onPageNotFound,
    ]
  );

  /**
   * Luồng khởi chạy kiểm tra quyền và nhúng
   * Chạy duy nhất 1 lần khi mount hoặc khi cần re-authenticate
   */
  const initPowerBiFlow = useCallback(async () => {
    // 1. Kiểm tra cấu hình môi trường
    const configCheck = checkPowerBiConfig();
    const effectiveReportId = propReportId || powerBiEnv.reportId;
    if (!configCheck.isConfigured && !configCheck.hasReportId && !effectiveReportId) {
      if (isMountedRef.current) {
        setStatus("unconfigured");
        setMissingConfigKeys(configCheck.missingFields);
      }
      return;
    }

    // 2. Kiểm tra tài khoản Microsoft đã đăng nhập
    try {
      const account = await getActiveAccount();
      if (!isMountedRef.current) return;
      setUserAccount(account);

      if (!account) {
        setStatus("need_login");
        return;
      }

      // 3. Lấy token im lặng
      const token = await getPowerBiTokenSilent();
      if (!isMountedRef.current) return;

      if (!token) {
        setStatus("need_login");
        return;
      }

      // 4. Kiểm tra courseKey có hợp lệ không
      const numericKey = Number(courseKeyRef.current || filterParamsRef.current.courseKey || courseKey);
      if (!isStudioReport && (!Number.isFinite(numericKey) || numericKey <= 0)) {
        setStatus("invalid_course");
        return;
      }

      // 5. Tiến hành nhúng báo cáo
      await embedReport(token);
    } catch (err) {
      console.error("[PowerBI Flow] Lỗi xác thực hoặc nạp token:", err);
      if (isMountedRef.current) {
        setStatus("error");
        setErrorMessage(err.message || "Lỗi kiểm tra phiên đăng nhập Microsoft.");
      }
    }
  }, [embedReport, isStudioReport]);

  // VÒNG ĐỜI 1: CHỈ KHỞI TẠO BÁO CÁO KHI MOUNT
  useEffect(() => {
    isMountedRef.current = true;
    initPowerBiFlow();

    return () => {
      isMountedRef.current = false;
      if (reportRef.current) {
        try {
          reportRef.current.off("loaded");
          reportRef.current.off("rendered");
          reportRef.current.off("error");
          reportRef.current.off("pageChanged");
        } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ 
          // ignore
        }
      }
      if (containerRef.current) {
        const powerbi = getPowerBiService();
        powerbi.reset(containerRef.current);
      }
      reportRef.current = null;
      currentFilteredKeyRef.current = null;
      currentFilteredStateRef.current = "";
    };
  }, [initPowerBiFlow]);

  // VÒNG ĐỜI 2: KHI BỘ LỌC THAY ĐỔI (COURSE, COHORT, USERKEY, USERNAME) -> CHỈ CẬP NHẬT FILTER (KHÔNG RE-EMBED, KHÔNG ĐỔI TRANG)
  useEffect(() => {
    const numericKey = Number(courseKey);
    if (!isStudioReport && (!Number.isFinite(numericKey) || numericKey <= 0)) {
      setStatus("invalid_course");
      return;
    }

    if (reportRef.current) {
      applyAllFiltersToReport(reportRef.current, { courseKey, cohort, userKey, username });
    }
  }, [courseKey, cohort, userKey, username, applyAllFiltersToReport, isStudioReport]);

  // VÒNG ĐỜI 3: KHI TARGETPAGE THAY ĐỔI -> ĐIỀU HƯỚNG SANG ĐÚNG TRANG ĐÍCH MÀ KHÔNG LÀM MẤT FILTER
  useEffect(() => {
    const requestedTarget = targetPage || targetPageDisplayName;
    if (!requestedTarget || !reportRef.current || reportPages.length === 0) return;

    const matched = resolveTargetPage(reportPages, requestedTarget);
    if (matched && matched.name !== activePageName) {
      handleSwitchPage(matched.name);
    } else if (!matched) {
      console.warn(`[PowerBI] Không tìm thấy trang: '${requestedTarget}'`);
      setStatus("page_not_found");
      setErrorMessage(`Không tìm thấy trang '${requestedTarget}' trong báo cáo Power BI.`);
    }
  }, [targetPage, targetPageDisplayName, reportPages]);

  /**
   * Điều hướng trang trong Power BI bằng SDK report.setPage()
   */
  const handleSwitchPage = async (pageName) => {
    if (!reportRef.current || pageName === activePageName || isPageSwitching) {
      return;
    }

    try {
      setIsPageSwitching(true);
      await reportRef.current.setPage(pageName);
      if (isMountedRef.current) {
        setActivePageName(pageName);
      }

      // Duy trì đúng chế độ hiển thị (Fit to page hoặc Fit to width) sau khi đổi trang
      try {
        await applyDisplayOptionToReport(reportRef.current, displayModeRef.current);
      } catch (settingsErr) {
        console.warn("[PowerBI] updateSettings displayOption on switch warning:", settingsErr?.message);
      }

      // Giữ nguyên tất cả bộ lọc sau khi chuyển trang
      await applyAllFiltersToReport(reportRef.current, filterParamsRef.current);
    } catch (err) {
      console.error("[PowerBI] Lỗi khi chuyển trang báo cáo:", err);
    } finally {
      if (isMountedRef.current) {
        setIsPageSwitching(false);
      }
    }
  };

  // VÒNG ĐỜI 4: KHI DISPLAYOPTION HOẶC DISPLAYMODE THAY ĐỔI -> CẬP NHẬT ĐỘNG KHÔNG RE-EMBED
  useEffect(() => {
    const currentOpt = displayOption || displayMode || "fitToWidth";
    displayModeRef.current = currentOpt;
    if (reportRef.current && (status === "ready" || status === "filtering")) {
      applyDisplayOptionToReport(reportRef.current, currentOpt);
    }
  }, [displayOption, displayMode, status, applyDisplayOptionToReport]);

  /**
   * Điều khiển Bookmark trong Power BI bằng report.bookmarksManager.apply()
   */
  const _handleApplyBookmark = async (bookmarkName) => {
    if (!reportRef.current?.bookmarksManager) {
      console.warn("[PowerBI] bookmarksManager không khả dụng trên report.");
      return;
    }

    try {
      setStatus("filtering");
      await reportRef.current.bookmarksManager.apply(bookmarkName);

      // Áp dụng lại tất cả bộ lọc LMS để bookmark không ghi đè môn/khóa khác
      const currentKey = Number(courseKeyRef.current || filterParamsRef.current.courseKey || courseKey);
      if (Number.isFinite(currentKey) && currentKey > 0) {
        await applyAllFiltersToReport(reportRef.current, filterParamsRef.current);
      } else {
        setStatus("ready");
      }
    } catch (err) {
      console.warn("[PowerBI] Không thể áp dụng Bookmark:", bookmarkName, err.message);
      setStatus("ready");
    }
  };

  // Xử lý nút bấm Đăng nhập Microsoft
  const handleMicrosoftLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMessage("");
      const result = await loginMicrosoftPopup();
      if (!isMountedRef.current) return;

      if (result && result.accessToken) {
        setUserAccount(result.account);
        setDiagTrace(getMsalDiagnosticTrace());
        await embedReport(result.accessToken);
      } else {
        setStatus("need_login");
        setDiagTrace(getMsalDiagnosticTrace());
      }
    } catch (err) {
      console.error("[PowerBI] Đăng nhập thất bại:", err);
      if (isMountedRef.current) {
        setErrorMessage(err.message || "Đăng nhập Microsoft không thành công.");
        setStatus("need_login");
        setDiagTrace(getMsalDiagnosticTrace());
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoggingIn(false);
      }
    }
  };

  // ============================================================================
  // GIAO DIỆN (RENDER)
  // Container luôn hiện diện trong DOM (width 100%, height 100%), overlay hiển thị theo status
  // ============================================================================

  return (
    <div
      className="secure-pbi-wrapper"
      data-report-id={propReportId || powerBiEnv.reportId}
      data-sdk-state={sdkPhase}
      style={{
        position: "relative",
        width: "100%",
        minHeight: height === "auto" ? "480px" : height,
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #e1e9e2",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isStudioReport && <div role="status" aria-label="Trạng thái nhúng Power BI" style={{ padding: '8px 18px', fontSize: '12px' }}>
        {sdkPhase === 'idle' && 'Đang kiểm tra phiên Microsoft'}
        {sdkPhase === 'loading' && 'Power BI đang tải báo cáo'}
        {sdkPhase === 'loaded' && 'Power BI đã nạp cấu trúc, đang vẽ nội dung'}
        {sdkPhase === 'rendered' && 'Power BI đã phát sự kiện rendered. Hãy kiểm tra số liệu và tương tác bên dưới.'}
        {sdkPhase === 'need_login' && 'Phiên Microsoft cần đăng nhập lại'}
        {sdkPhase === 'error' && 'Power BI báo lỗi tải nội dung'}
      </div>}
      {/* 1. THANH ĐIỀU KHIỂN & BỘ LỌC PHÍA TRÊN */}
      <div
        className="secure-pbi-toolbar"
        style={{
          padding: "10px 18px",
          backgroundColor: "#f9faf9",
          borderBottom: "1px solid #eef2ef",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#4d5b51",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontWeight: 600,
              color: "#23592c",
            }}
          >
            <ShieldCheck size={15} style={{ color: "#37883e" }} />
            Power BI Secure Embed
          </span>

          <span style={{ color: "#c1ccc3" }}>|</span>

          {!isStudioReport && <span>
            Bảng lọc: <code>{COURSE_FILTER_CONFIG.table}</code>
          </span>}

          <span style={{ color: "#c1ccc3" }}>•</span>

          <span>
            Course_Key:{" "}
            <strong
              style={{
                color: "#203026",
                background: "#eef6ee",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {courseKey || "Chưa chọn"}
            </strong>
          </span>

          {cohort && (
            <span
              style={{
                fontSize: "11px",
                color: "#24522a",
                background: "#e8f2e9",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
              title="Khóa đang lọc theo dữ liệu thực tế"
            >
              Khóa: {cohort}
            </span>
          )}

          {(userKey || username) && (
            <span
              style={{
                fontSize: "11px",
                color: "#1e3a8a",
                background: "#eff6ff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
              title="Bộ lọc sinh viên cụ thể (Student 360)"
            >
              Sinh viên: {username || `Key: ${userKey}`}
            </span>
          )}

          {(displayOption || displayMode) && (
            <span
              style={{
                fontSize: "11px",
                color: (displayOption || displayMode) === "fitToPage" ? "#065f46" : "#475569",
                background: (displayOption || displayMode) === "fitToPage" ? "#ecfdf5" : "#f1f5f9",
                border: (displayOption || displayMode) === "fitToPage" ? "1px solid #a7f3d0" : "1px solid #cbd5e1",
                padding: "2px 7px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
              title="Chế độ hiển thị canvas báo cáo"
            >
              {(displayOption || displayMode) === "fitToPage"
                ? "Khung: Vừa toàn trang (Fit to page)"
                : "Khung: Vừa chiều rộng (Fit to width)"}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {userAccount && (
            <span style={{ fontSize: "11px", color: "#617367" }}>
              Tài khoản: <strong>{userAccount.username || userAccount.name}</strong>
            </span>
          )}

          {status === "filtering" && (
            <span
              style={{
                color: "#2b7333",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <RefreshCw size={13} className="spin-animation" />
              Đang cập nhật môn học...
            </span>
          )}
        </div>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG CÁC TRANG CỦA BÁO CÁO (LẤY ĐỘNG TỪ REPORT.GETPAGES()) */}
      {reportPages.length > 1 && (status === "ready" || status === "filtering") && !hidePageNavigation && (
        <div
          className="secure-pbi-page-navigation"
          style={{
            padding: "8px 18px",
            backgroundColor: "#f4f7f4",
            borderBottom: "1px solid #e5ede6",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#526356",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
            }}
          >
            <LayoutGrid size={13} /> Trang báo cáo:
          </span>

          <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
            {reportPages.map((page) => {
              const isActive = page.name === activePageName;
              return (
                <button
                  key={page.name}
                  type="button"
                  onClick={() => handleSwitchPage(page.name)}
                  disabled={isPageSwitching}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: isActive ? 600 : 500,
                    backgroundColor: isActive ? "#37883e" : "#ffffff",
                    color: isActive ? "#ffffff" : "#465449",
                    border: isActive ? "1px solid #37883e" : "1px solid #d5ded6",
                    cursor: isPageSwitching ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                  title={page.displayName}
                >
                  {page.displayName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. KHUNG CHỨA BÁO CÁO POWER BI (LUÔN CÓ MẶT TRONG DOM ĐỂ SDK TÍNH KÍCH THƯỚC CHUẨN) */}
      <div
        className="secure-pbi-embed-body"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: height === "auto" ? (pageAspectRatio || aspectRatio || "16 / 9") : undefined,
          height: height === "auto" ? "auto" : height,
          minHeight: "480px",
          maxHeight: height === "auto" ? (isExpanded ? "95vh" : "920px") : undefined,
          flex: height === "auto" ? "none" : 1,
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          className="secure-pbi-embed-container"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "480px",
          }}
        />

        {/* OVERLAY: ĐANG LỌC BỘ LỌC (CHUYỂN MÔN KHÔNG ĐỂ LỘ DỮ LIỆU CŨ) */}
        {status === "filtering" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(2px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "3px solid #dbe8dd",
                borderTopColor: "#37883e",
                borderRadius: "50%",
                animation: "pbi-spin 0.8s linear infinite",
                marginBottom: "8px",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#2d4a32" }}>
              Đang chuyển dữ liệu môn học...
            </span>
          </div>
        )}

        {/* OVERLAY: ĐANG TẢI BÁO CÁO (LOADING / CHECKING) */}
        {(status === "loading" || status === "checking") && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid #e2ece3",
                borderTopColor: "#37883e",
                borderRadius: "50%",
                animation: "pbi-spin 0.8s linear infinite",
                marginBottom: "16px",
              }}
            />
            <strong style={{ color: "#233327", fontSize: "15px", marginBottom: "6px" }}>
              Đang tải báo cáo Power BI...
            </strong>
            <span style={{ color: "#748577", fontSize: "12px" }}>
              Đang đồng bộ quyền truy cập và áp dụng bộ lọc môn học (Course_Key: {courseKey})
            </span>
          </div>
        )}

        {/* OVERLAY: CHƯA CẤU HÌNH BIẾN MÔI TRƯỜNG (UNCONFIGURED) */}
        {status === "unconfigured" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#fdfefe",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <SlidersHorizontal size={24} />
            </div>

            <h3 style={{ margin: "0 0 8px 0", color: "#1f2937", fontSize: "17px" }}>
              Cấu hình nhúng bảo mật chưa hoàn tất
            </h3>

            <p style={{ maxWidth: "560px", color: "#4b5563", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px 0" }}>
              Hệ thống đang chuẩn bị kết nối Power BI Service qua mô hình Secure Embed (User-Owns-Data). Cần bổ sung các
              biến môi trường trong file <code>.env</code> của Frontend.
            </p>

            {missingConfigKeys.length > 0 && (
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  textAlign: "left",
                  fontSize: "12px",
                  marginBottom: "18px",
                }}
              >
                <strong style={{ color: "#374151" }}>Các biến môi trường cần cung cấp:</strong>
                <ul style={{ margin: "6px 0 0 18px", padding: 0, color: "#b45309" }}>
                  {missingConfigKeys.map((k) => (
                    <li key={k} style={{ fontFamily: "monospace", margin: "2px 0" }}>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              Vui lòng tham khảo file mẫu <code>.env.example</code> và cập nhật giá trị để kiểm thử.
            </span>
          </div>
        )}

        {/* OVERLAY: YÊU CẦU ĐĂNG NHẬP MICROSOFT (NEED LOGIN) */}
        {status === "need_login" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#fbfcfa",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "50px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: "#eaf3eb",
                color: "#37883e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <Lock size={26} />
            </div>

            <h3 style={{ margin: "0 0 8px 0", color: "#1f2d22", fontSize: "18px", fontWeight: 600 }}>
              Yêu cầu xác thực tài khoản Microsoft
            </h3>

            <p style={{ maxWidth: "480px", color: "#546457", fontSize: "13px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
              Báo cáo phân tích học tập được bảo mật theo chính sách tổ chức. Vui lòng đăng nhập bằng tài khoản Microsoft
              Entra ID có quyền xem báo cáo để tiếp tục.
            </p>

            {typeof window !== "undefined" && window.location.port === "5174" && (
              <div
                style={{
                  maxWidth: "520px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  fontSize: "12px",
                  marginBottom: "16px",
                  textAlign: "left",
                  lineHeight: "1.5",
                }}
              >
                <strong>⚠️ Đang mở trên cổng 5174:</strong> Microsoft Entra ID hiện đã đăng ký SPA Redirect URI cho cổng <code>5173</code>. Khuyến nghị mở trang qua cổng chuẩn:{" "}
                <a
                  href={`http://localhost:5173${window.location.pathname}${window.location.search}`}
                  style={{ color: "#b45309", fontWeight: 600, textDecoration: "underline" }}
                >
                  http://localhost:5173{window.location.pathname}
                </a>{" "}
                (hoặc thêm <code>http://localhost:5174/auth.html</code> vào Entra ID App Registration).
              </div>
            )}

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={isLoggingIn}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "10px 22px",
                backgroundColor: "#37883e",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(55, 136, 62, 0.25)",
                transition: "all 0.2s ease",
              }}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={15} className="spin-animation" />
                  Đang kết nối Microsoft...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Đăng nhập bằng Microsoft
                </>
              )}
            </button>

            {errorMessage && (
              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <p style={{ color: "#dc2626", fontSize: "12px", margin: 0, maxWidth: "520px" }}>
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDiagTrace(getMsalDiagnosticTrace());
                    setShowDiagModal(true);
                  }}
                  style={{
                    fontSize: "12px",
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontWeight: 500,
                  }}
                >
                  <Info size={13} />
                  Xem nhật ký chẩn đoán kỹ thuật (Diagnostic Trace)
                </button>
              </div>
            )}
          </div>
        )}

        {/* OVERLAY: KHÔNG CÓ QUYỀN TRUY CẬP (NO PERMISSION / 403) */}
        {status === "no_permission" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#fffbfb",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ margin: "0 0 8px 0", color: "#991b1b", fontSize: "17px" }}>
              Không có quyền truy cập báo cáo
            </h3>

            <p style={{ maxWidth: "520px", color: "#6b7280", fontSize: "13px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
              Tài khoản hiện tại <strong>{userAccount?.username}</strong> chưa được phân quyền trong Workspace của Power
              BI Service.
            </p>

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                backgroundColor: "#ffffff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Đổi tài khoản Microsoft khác
            </button>
          </div>
        )}

        {/* OVERLAY: LỖI TẢI BÁO CÁO (ERROR) */}
        {status === "error" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#fffdfd",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ margin: "0 0 6px 0", color: "#b91c1c", fontSize: "16px" }}>
              Lỗi nạp báo cáo Power BI
            </h3>

            <p style={{ maxWidth: "540px", color: "#4b5563", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              {errorMessage || "Không thể hiển thị báo cáo. Vui lòng kiểm tra kết nối mạng hoặc phiên bản Power BI SDK."}
            </p>

            <button
              type="button"
              onClick={initPowerBiFlow}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={13} />
              Thử lại
            </button>
          </div>
        )}

        {/* OVERLAY: KHÔNG XÁC ĐỊNH ĐƯỢC COURSE_KEY (INVALID COURSE) */}
        {status === "invalid_course" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <Info size={22} />
            </div>

            <strong style={{ color: "#374151", fontSize: "15px", marginBottom: "6px" }}>
              Không xác định được môn học
            </strong>

            <span style={{ color: "#6b7280", fontSize: "12px" }}>
              Course_Key nhận được: <code>{String(courseKey)}</code>. Vui lòng quay lại danh sách môn học.
            </span>
          </div>
        )}

        {/* OVERLAY: KHÔNG TÌM THẤY TRANG CHỈ ĐỊNH (PAGE NOT FOUND) */}
        {status === "page_not_found" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#fffdfd",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ margin: "0 0 6px 0", color: "#b91c1c", fontSize: "16px" }}>
              Trang báo cáo không tồn tại
            </h3>

            <p style={{ maxWidth: "540px", color: "#4b5563", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              {errorMessage || "Trang được yêu cầu không tồn tại trong mô hình báo cáo Power BI."}
            </p>

            {reportPages.length > 0 && (
              <div
                style={{
                  margin: "10px 0 16px 0",
                  textAlign: "left",
                  fontSize: "12px",
                  background: "#f8fafc",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  maxWidth: "500px",
                  width: "100%",
                }}
              >
                <strong style={{ color: "#1e293b", display: "block", marginBottom: "6px" }}>
                  Danh sách 7 trang thực tế trong Power BI:
                </strong>
                <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155" }}>
                  {reportPages.map((p) => (
                    <li key={p.name} style={{ margin: "3px 0" }}>
                      <code>{p.displayName}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS KEYFRAME SPINNER & IFRAME RESET */}
      <style>{`
        @keyframes pbi-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: pbi-spin 1s linear infinite;
        }
        .secure-pbi-embed-container {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: auto;
        }
        .secure-pbi-embed-container iframe {
          width: 100% !important;
          height: 100% !important;
          min-height: 480px !important;
          max-width: 100% !important;
          border: 0 !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          zoom: 1 !important;
        }
      `}</style>

      {/* MODAL CHẨN ĐOÁN KỸ THUẬT (DIAGNOSTIC TRACE MODAL - REDACTED) */}
      {showDiagModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowDiagModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9fafb",
              }}
            >
              <div>
                <h4 style={{ margin: 0, color: "#111827", fontSize: "15px", fontWeight: 600 }}>
                  Nhật ký chẩn đoán xác thực Microsoft (Redacted Trace)
                </h4>
                <p style={{ margin: "2px 0 0 0", color: "#6b7280", fontSize: "11px" }}>
                  An toàn tuyệt đối — Không ghi nhận Access Token, Auth Code hay thông tin nhạy cảm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, fontSize: "12px" }}>
              {/* PHÂN LOẠI 4 TÌNH HUỐNG THỰC TẾ */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  marginBottom: "14px",
                }}
              >
                <strong style={{ color: "#166534", display: "block", marginBottom: "4px" }}>
                  Kết quả phân loại tình huống:
                </strong>
                {(() => {
                  const arrival = diagTrace?.popupArrival;
                  const trace = diagTrace?.popupTrace || [];
                  const mainEvents = diagTrace?.mainEvents || [];
                  const lastMain = mainEvents[mainEvents.length - 1];

                  if (!arrival) {
                    return (
                      <span style={{ color: "#991b1b" }}>
                        <strong>• Tình huống 1:</strong> Popup chưa chuyển hướng về localhost (Vẫn dừng ở login.microsoftonline.com do chờ người dùng chọn tài khoản, xác thực 2 bước MFA, màn hình Consent/Need admin approval, hoặc popup bị đóng trước khi hoàn tất).
                      </span>
                    );
                  }
                  if (arrival.pathname !== "/auth.html") {
                    return (
                      <span style={{ color: "#854d0e" }}>
                        <strong>• Tình huống 2:</strong> Popup đã chuyển về localhost nhưng vào nhầm trang chủ ({arrival.pathname}) thay vì /auth.html.
                      </span>
                    );
                  }
                  const bridgeError = trace.find((t) => t.type === "BRIDGE_ERROR");
                  if (bridgeError) {
                    return (
                      <span style={{ color: "#991b1b" }}>
                        <strong>• Tình huống 3:</strong> Popup đã tải /auth.html nhưng Redirect Bridge ném lỗi ({bridgeError?.detail?.errorCode || bridgeError?.detail?.message || "lỗi bridge"}).
                      </span>
                    );
                  }
                  if (lastMain?.errorCode === "timed_out") {
                    return (
                      <span style={{ color: "#c2410c" }}>
                        <strong>• Tình huống 3B:</strong> Popup đã phát tin nhưng Main Frame bị timeout trước khi nhận được hoặc channel ID không khớp.
                      </span>
                    );
                  }
                  return (
                    <span style={{ color: "#166534" }}>
                      <strong>• Xác thực hoàn tất:</strong> Token đã được chuyển giao an toàn cho Power BI Embed.
                    </span>
                  );
                })()}
              </div>

              {/* TÓM TẮT TRẠNG THÁI */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb" }}>
                  <strong>Cửa sổ Callback Microsoft:</strong>
                  <div style={{ marginTop: "4px", color: "#374151" }}>
                    • Đã về localhost: {diagTrace?.popupArrival ? "Có (Đã nhận)" : "Chưa (Chưa nhận callback)"}
                    <br />
                    • Origin: {diagTrace?.popupArrival?.origin || "N/A"}
                    <br />
                    • Pathname: {diagTrace?.popupArrival?.pathname || "N/A"}
                    <br />
                    • hasCode: {String(Boolean(diagTrace?.popupArrival?.hasCode))}
                    <br />
                    • hasError: {String(Boolean(diagTrace?.popupArrival?.hasError))}
                    {diagTrace?.popupArrival?.errorName && (
                      <>
                        <br />
                        • Mã lỗi Microsoft: <code style={{ color: "#dc2626" }}>{diagTrace?.popupArrival?.errorName}</code>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb" }}>
                  <strong>Redirect Bridge & Main Frame:</strong>
                  <div style={{ marginTop: "4px", color: "#374151" }}>
                    • Bridge khởi chạy: {diagTrace?.popupTrace?.some((t) => t.type === "BRIDGE_START") ? "Có" : "Chưa"}
                    <br />
                    • Bridge thành công: {diagTrace?.popupTrace?.some((t) => t.type === "BRIDGE_SUCCESS") ? "Có" : "Chưa"}
                    <br />
                    • Bridge lỗi: {diagTrace?.popupTrace?.some((t) => t.type === "BRIDGE_ERROR") ? "Có" : "Không"}
                    <br />
                    • Số sự kiện Main Frame: {diagTrace?.mainEvents?.length || 0}
                  </div>
                </div>
              </div>

              {/* RAW JSON LOG (REDACTED) */}
              <div style={{ marginBottom: "10px" }}>
                <strong>Chi tiết nhật ký tuần tự:</strong>
                <pre
                  style={{
                    backgroundColor: "#1f2937",
                    color: "#f3f4f6",
                    padding: "10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    maxHeight: "200px",
                    overflow: "auto",
                    marginTop: "6px",
                  }}
                >
                  {JSON.stringify(diagTrace, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9fafb",
              }}
            >
              <div>
                {copyStatus && (
                  <span style={{ color: "#166534", fontSize: "11px", fontWeight: 500 }}>
                    {copyStatus}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(diagTrace, null, 2));
                    setCopyStatus("Đã sao chép nhật ký vào bộ nhớ tạm!");
                    setTimeout(() => setCopyStatus(""), 3000);
                  }}
                  style={{
                    padding: "7px 14px",
                    backgroundColor: "#37883e",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Sao chép nhật ký (Copy)
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagModal(false)}
                  style={{
                    padding: "7px 14px",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurePowerBIReport;
