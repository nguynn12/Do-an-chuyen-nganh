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
  COURSE_FILTER_CONFIG,
  COHORT_FILTER_CONFIG,
  STUDENT_FILTER_CONFIG,
  POWER_BI_PAGES_CONFIG,
} from "../../config/powerBiConfig";
import {
  getPowerBiTokenSilent,
  loginMicrosoftPopup,
  getActiveAccount,
} from "../../services/powerBiAuthService";

const { models } = pbi;

/**
 * Tìm trang Power BI phù hợp nhất theo id, displayName hoặc key cấu hình
 */
function resolveTargetPage(pages, target) {
  if (!Array.isArray(pages) || !target) return null;
  const raw = String(target).trim();
  const lower = raw.toLowerCase();

  // 1. Khớp theo key trong POWER_BI_PAGES_CONFIG (vd 'QUIZ', 'KNOWLEDGE_GAP', 'COURSE_OVERVIEW'...)
  if (POWER_BI_PAGES_CONFIG[target]) {
    const cfg = POWER_BI_PAGES_CONFIG[target];
    const matchById = pages.find((p) => p.name === cfg.id);
    if (matchById) return matchById;
    const matchByDisplayName = pages.find((p) => p.displayName === cfg.displayName);
    if (matchByDisplayName) return matchByDisplayName;
  }

  // 2. Khớp tuyệt đối theo GUID (name)
  const byName = pages.find((p) => p.name === raw);
  if (byName) return byName;

  // 3. Khớp tuyệt đối theo displayName
  const byDisplayNameExact = pages.find((p) => p.displayName === raw);
  if (byDisplayNameExact) return byDisplayNameExact;

  // 4. Khớp chứa chuỗi (contains) theo displayName
  const byDisplayNamePartial = pages.find((p) =>
    String(p.displayName || "").toLowerCase().includes(lower)
  );
  if (byDisplayNamePartial) return byDisplayNamePartial;

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
  courseKey,
  cohort,
  userKey,
  username,
  targetPage = null,
  targetPageDisplayName = null,
  height = "auto",
  onLoaded,
  onError,
  onPagesLoaded,
  onPageNotFound,
  hidePageNavigation = true,
}) {
  const containerRef = useRef(null);
  const reportRef = useRef(null);
  const isMountedRef = useRef(true);

  // Lưu trữ các tham số mới nhất bằng Ref
  const filterParamsRef = useRef({ courseKey, cohort, userKey, username });
  filterParamsRef.current = { courseKey, cohort, userKey, username };

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
  const [errorMessage, setErrorMessage] = useState("");
  const [userAccount, setUserAccount] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [missingConfigKeys, setMissingConfigKeys] = useState([]);

  // Danh sách trang nội bộ của báo cáo lấy động từ report.getPages()
  const [reportPages, setReportPages] = useState([]);
  const [activePageName, setActivePageName] = useState("");
  const [isPageSwitching, setIsPageSwitching] = useState(false);

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

  // Tạo bộ lọc Cohort
  const createCohortFilter = useCallback((targetCohort) => {
    const norm = String(targetCohort || "").trim().toUpperCase();
    if (!norm) return null;
    return {
      $schema: "http://powerbi.com/product/schema#basic",
      target: {
        table: COHORT_FILTER_CONFIG.primaryTable,
        column: COHORT_FILTER_CONFIG.primaryColumn,
      },
      operator: "In",
      values: [norm],
      filterType: models.FilterType.Basic,
    };
  }, []);

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
   * Áp dụng đồng thời các bộ lọc Course_Key, Cohort và Student
   * Giữ lại các bộ lọc khác ngoài phạm vi LMS quản lý
   */
  const applyAllFiltersToReport = useCallback(
    async (reportInstance, params) => {
      if (!reportInstance) return;

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

        // 2. Cohort Filter
        if (coh) {
          const cohortFilter = createCohortFilter(coh);
          if (cohortFilter) newFilters.push(cohortFilter);
        }

        // 3. Student Filter
        const studentFilter = createStudentFilter(uKey, uName);
        if (studentFilter) {
          newFilters.push(studentFilter);
        }

        await reportInstance.setFilters([...otherFilters, ...newFilters]);

        // Cập nhật trạng thái nếu vẫn là yêu cầu mới nhất
        if (isMountedRef.current && filterSequenceRef.current === seqId) {
          currentFilteredStateRef.current = JSON.stringify({ cKey, coh, uKey, uName });
          setStatus("ready");
        }
      } catch (err) {
        console.error("[PowerBI Embed] Lỗi khi áp dụng bộ lọc:", err);
        if (isMountedRef.current && filterSequenceRef.current === seqId) {
          // Thử fallback: chỉ lọc Course_Key nếu lỗi do bảng Cohort hoặc Student chưa khớp
          try {
            const numCourseKey = Number(cKey);
            if (Number.isFinite(numCourseKey) && numCourseKey > 0) {
              await reportInstance.setFilters([createCourseFilter(numCourseKey)]);
              setStatus("ready");
              return;
            }
          } catch {
            // ignore
          }
          setErrorMessage(`Không thể áp dụng bộ lọc báo cáo Power BI.`);
          setStatus("error");
        }
      }
    },
    [createCourseFilter, createCohortFilter, createStudentFilter]
  );

  /**
   * Khởi tạo và nhúng báo cáo Power BI
   * Lưu ý: Hàm này KHÔNG phụ thuộc vào courseKey để không bao giờ bị re-create hay re-embed khi đổi môn!
   */
  const embedReport = useCallback(
    async (accessToken) => {
      if (!containerRef.current) return;

      const embedUrl = buildSecureEmbedUrl();
      const reportId = powerBiEnv.reportId;

      if (!embedUrl || !reportId) {
        if (isMountedRef.current) {
          setStatus("unconfigured");
          setErrorMessage("Thiếu thông tin Report ID hoặc Embed URL.");
        }
        return;
      }

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
        const cFilter = createCohortFilter(currentParams.cohort);
        if (cFilter) initialFilters.push(cFilter);
      }
      if (currentParams.userKey || currentParams.username) {
        const uFilter = createStudentFilter(currentParams.userKey, currentParams.username);
        if (uFilter) initialFilters.push(uFilter);
      }

      const embedConfig = {
        type: "report",
        tokenType: models.TokenType.Aad,
        accessToken,
        embedUrl,
        id: reportId,
        permissions: models.Permissions.Read,
        filters: initialFilters,
        pageView: "fitToWidth",
        settings: {
          pageView: "fitToWidth",
          panes: {
            filters: {
              expanded: false,
              visible: false, // Ẩn filter pane mặc định
            },
            pageNavigation: {
              visible: false, // Ẩn thanh chuyển trang mặc định để LMS điều hướng
            },
          },
          background: models.BackgroundType.Transparent,
        },
      };

      if (powerBiEnv.coursePageName) {
        embedConfig.pageName = powerBiEnv.coursePageName;
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

          // 1. Áp dụng tất cả bộ lọc
          await applyAllFiltersToReport(report, filterParamsRef.current);

          // 2. Lấy danh sách 7 trang nội bộ từ Power BI Service
          try {
            const pages = await report.getPages();
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
                    await report.updateSettings({ pageView: "fitToWidth" });
                  } catch {
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
              } else {
                const activePage = pages.find((p) => p.isActive) || pages[0];
                if (activePage) {
                  setActivePageName(activePage.name);
                }
              }

              if (onPagesLoaded) {
                onPagesLoaded(pages);
              }
            }
          } catch (pagesErr) {
            console.warn("[PowerBI] Không thể lấy danh sách trang bằng getPages():", pagesErr.message);
          }

          // Cập nhật chế độ fitToWidth sau khi loaded
          try {
            await report.updateSettings({ pageView: "fitToWidth" });
          } catch {
            // ignore
          }

          if (onLoaded) onLoaded(report);
        });

        // Khi báo cáo vẽ xong toàn bộ visual
        report.on("rendered", async () => {
          if (!isMountedRef.current) return;
          try {
            await report.updateSettings({ pageView: "fitToWidth" });
          } catch {
            // ignore
          }
        });

        // Theo dõi sự kiện trang thay đổi
        report.on("pageChanged", async (event) => {
          if (!isMountedRef.current) return;
          const newPage = event?.detail?.newPage;
          if (newPage?.name) {
            setActivePageName(newPage.name);
          }
          try {
            await report.updateSettings({ pageView: "fitToWidth" });
          } catch {
            // ignore
          }
        });

        // Khi có lỗi từ Power BI SDK
        report.on("error", (event) => {
          if (!isMountedRef.current) return;

          console.error("[PowerBI SDK Error Event]:", event.detail);
          const detail = event?.detail || {};
          const msg = detail.message || detail.detailedMessage || "Lỗi tải báo cáo từ Power BI.";

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
    if (!configCheck.isConfigured && !configCheck.hasReportId) {
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
      if (!Number.isFinite(numericKey) || numericKey <= 0) {
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
  }, [embedReport]);

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
        } catch {
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
    if (!Number.isFinite(numericKey) || numericKey <= 0) {
      setStatus("invalid_course");
      return;
    }

    if (reportRef.current) {
      applyAllFiltersToReport(reportRef.current, { courseKey, cohort, userKey, username });
    }
  }, [courseKey, cohort, userKey, username, applyAllFiltersToReport]);

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

      // Đảm bảo chế độ hiển thị fitToWidth vẫn được duy trì sau khi đổi trang
      try {
        await reportRef.current.updateSettings({
          pageView: "fitToWidth",
        });
      } catch (settingsErr) {
        console.warn("[PowerBI] updateSettings pageView on switch warning:", settingsErr?.message);
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

  /**
   * Điều khiển Bookmark trong Power BI bằng report.bookmarksManager.apply()
   */
  const handleApplyBookmark = async (bookmarkName) => {
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
        await embedReport(result.accessToken);
      } else {
        setStatus("need_login");
      }
    } catch (err) {
      console.error("[PowerBI] Đăng nhập thất bại:", err);
      if (isMountedRef.current) {
        setErrorMessage(err.message || "Đăng nhập Microsoft không thành công.");
        setStatus("need_login");
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

          <span>
            Bảng lọc: <code>{COURSE_FILTER_CONFIG.table}</code>
          </span>

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
          aspectRatio: height === "auto" ? "16 / 9" : undefined,
          height: height === "auto" ? "auto" : height,
          minHeight: "480px",
          maxHeight: "820px",
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
              <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "14px" }}>
                {errorMessage}
              </p>
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
          overflow: hidden;
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
    </div>
  );
}

export default SecurePowerBIReport;
