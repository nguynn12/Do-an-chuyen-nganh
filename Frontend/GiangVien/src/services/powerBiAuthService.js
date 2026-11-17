// ==============================================================================
// DỊCH VỤ XÁC THỰC MICROSOFT ENTRA ID CHO POWER BI (USER-OWNS-DATA)
// ==============================================================================
// Sử dụng @azure/msal-browser để lấy Access Token truy cập Power BI Service
// TUÂN THỦ NGUYÊN TẮC: Tuyệt đối không ghi Access Token ra console hay log.
// ==============================================================================

import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, powerBIRequest } from "../config/msalConfig";
import { getMsalRedirectUri, POWERBI_PUBLISH_SCOPES, FABRIC_SCOPES } from "../config/powerBiConfig";

let msalInstance = null;
let msalInitPromise = null;
let isLoginInProgress = false;

// Bộ lưu trữ nhật ký chẩn đoán an toàn (không chứa token/secret)
const diagEvents = [];

function addDiagEvent(step, data = {}) {
  const item = {
    timestamp: new Date().toISOString(),
    step,
    ...data,
  };
  diagEvents.push(item);
  if (diagEvents.length > 50) diagEvents.shift();
  try {
    sessionStorage.setItem("__msal_main_diag_events", JSON.stringify(diagEvents));
  } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
  return item;
}

if (typeof window !== "undefined") {
  try {
    const bc = new BroadcastChannel("msal_popup_diagnostics");
    bc.onmessage = (event) => {
      if (event?.data) {
        addDiagEvent(event.data.type || "POPUP_DIAG_EVENT", event.data.info || event.data.detail || {});
      }
    };
  } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
}

/**
 * Trả về danh sách sự kiện chẩn đoán an toàn để hiển thị trên UI
 */
export function getMsalDiagnosticTrace() {
  const popupArrival = typeof window !== "undefined" ? localStorage.getItem("__msal_popup_arrival") : null;
  const popupTrace = typeof window !== "undefined" ? localStorage.getItem("__msal_diag_trace") : null;

  return {
    mainEvents: [...diagEvents],
    popupArrival: popupArrival ? JSON.parse(popupArrival) : null,
    popupTrace: popupTrace ? JSON.parse(popupTrace) : [],
  };
}

/**
 * Xóa nhật ký chẩn đoán trước mỗi lần thử mới
 */
export function clearMsalDiagnosticTrace() {
  diagEvents.length = 0;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("__msal_popup_arrival");
      localStorage.removeItem("__msal_diag_trace");
      sessionStorage.removeItem("__msal_main_diag_events");
    } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
  }
}

/**
 * Khởi tạo và trả về singleton instance của MSAL PublicClientApplication
 */
export async function getMsalInstance() {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }

  if (!msalInitPromise) {
    msalInitPromise = msalInstance.initialize().catch((err) => {
      console.error("[PowerBI Auth] Lỗi khởi tạo MSAL:", err.message);
      addDiagEvent("MSAL_INIT_ERROR", { message: err.message });
      msalInitPromise = null;
      throw err;
    });
  }

  await msalInitPromise;
  return msalInstance;
}

/**
 * Lấy tài khoản Microsoft hiện đang hoạt động
 */
export async function getActiveAccount() {
  try {
    const pca = await getMsalInstance();
    let account = pca.getActiveAccount();
    if (!account) {
      const allAccounts = pca.getAllAccounts();
      if (allAccounts && allAccounts.length > 0) {
        account = allAccounts[0];
        pca.setActiveAccount(account);
      }
    }
    return account;
  } catch (error) {
    console.error("[PowerBI Auth] Không thể lấy tài khoản active:", error.message);
    return null;
  }
}

/**
 * Lấy Access Token Power BI một cách im lặng (Silent) nếu người dùng đã đăng nhập
 * Trả về accessToken (string) hoặc null nếu cần đăng nhập
 */
export async function getPowerBiTokenSilent() {
  const pca = await getMsalInstance();
  const account = await getActiveAccount();

  if (!account) {
    addDiagEvent("ACQUIRE_TOKEN_SILENT_SKIP", { reason: "no_active_account" });
    return null;
  }

  addDiagEvent("ACQUIRE_TOKEN_SILENT_START", {
    hasAccount: true,
    accountUsername: account.username ? account.username.replace(/^(.)(.*)(@.*)$/, "$1***$3") : "masked",
  });

  try {
    const response = await pca.acquireTokenSilent({
      scopes: powerBIRequest.scopes,
      account,
      redirectUri: getMsalRedirectUri(),
    });
    const hasToken = Boolean(response?.accessToken);
    addDiagEvent("ACQUIRE_TOKEN_SILENT_SUCCESS", { hasToken });
    return response.accessToken || null;
  } catch (error) {
    addDiagEvent("ACQUIRE_TOKEN_SILENT_FAILURE", {
      errorCode: error.errorCode || "unknown",
      subError: error.subError || null,
      message: error.message,
    });
    console.warn(
      "[PowerBI Auth] acquireTokenSilent yêu cầu tương tác hoặc token hết hạn:",
      error.errorCode || error.message
    );
    return null;
  }
}

/**
 * Đăng nhập tương tác bằng cửa sổ Popup Microsoft
 * Tích hợp bảo vệ chống gọi đồng thời và xử lý lỗi chi tiết
 */
export async function loginMicrosoftPopup() {
  if (isLoginInProgress) {
    addDiagEvent("LOGIN_BLOCKED", { reason: "interaction_in_progress" });
    throw new Error("Đang có một tiến trình đăng nhập Microsoft đang xử lý. Vui lòng hoàn tất trong cửa sổ Popup.");
  }

  // Lock before the first await: two views can request login in the same turn.
  isLoginInProgress = true;
  const correlationId = crypto.randomUUID();
  clearMsalDiagnosticTrace();
  const startTime = Date.now();

  try {
    const pca = await getMsalInstance();
    addDiagEvent("LOGIN_START", {
      correlationId,
      accountCount: pca.getAllAccounts().length,
      hasActiveAccount: Boolean(pca.getActiveAccount()),
      redirectUri: getMsalRedirectUri(),
      isTopLevel: window.self === window.top,
    });
    const loginResponse = await pca.loginPopup({
      scopes: powerBIRequest.scopes,
      prompt: "select_account",
      redirectUri: getMsalRedirectUri(),
      correlationId,
    });

    const elapsedMs = Date.now() - startTime;

    if (loginResponse && loginResponse.account) {
      pca.setActiveAccount(loginResponse.account);
    }

    let token = loginResponse?.accessToken;
    if (!token) {
      addDiagEvent("FALLBACK_TOKEN_SILENT", { correlationId, elapsedMs });
      token = await getPowerBiTokenSilent();
    }

    addDiagEvent("LOGIN_SUCCESS", {
      correlationId,
      elapsedMs,
      hasAccount: Boolean(loginResponse?.account),
      hasToken: Boolean(token),
    });

    return {
      account: loginResponse?.account || null,
      accessToken: token,
      correlationId,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    addDiagEvent("LOGIN_FAILURE", {
      correlationId,
      elapsedMs,
      errorCode: error.errorCode || "unknown",
      subError: error.subError || null,
      message: error.message,
    });

    console.error("[PowerBI Auth] Lỗi đăng nhập Microsoft Popup:", error.errorCode || error.message);

    if (error.errorCode === "timed_out") {
      throw new Error(
        `Xác thực Microsoft hết thời gian chờ (timed_out). Hãy mở LMS trực tiếp trong Chrome/Edge tại ${window.location.origin}, cho phép popup của LMS và thử lại. Callback cần đăng ký dạng SPA: ${getMsalRedirectUri()}.`
      , { cause: error });
    }
    if (error.errorCode === "interaction_in_progress") {
      throw new Error("Một cửa sổ đăng nhập Microsoft đang mở hoặc vừa bị gián đoạn. Vui lòng kiểm tra lại thanh tác vụ hoặc bấm thử lại.", { cause: error });
    }
    if (error.errorCode === "popup_window_error") {
      throw new Error("Trình duyệt đã chặn cửa sổ Popup đăng nhập. Vui lòng bật cho phép popup trên trình duyệt của bạn.", { cause: error });
    }
    if (error.errorCode === "user_cancelled") {
      throw new Error("Đăng nhập Microsoft đã bị hủy bởi người dùng.", { cause: error });
    }

    throw new Error(error.message || "Đăng nhập Microsoft không thành công.", { cause: error });
  } finally {
    isLoginInProgress = false;
  }
}

/**
 * Đăng xuất tài khoản Microsoft
 */
export async function logoutMicrosoft() {
  const pca = await getMsalInstance();
  const account = await getActiveAccount();
  if (account) {
    await pca.logoutPopup({ account });
  }
}

/**
 * ==============================================================================
 * TASK 05.9: TIỆN ÍCH QUẢN LÝ SCOPES GHI & CHẨN ĐOÁN ACCESS TOKEN AN TOÀN
 * ==============================================================================
 * TUÂN THỦ NGUYÊN TẮC: Tuyệt đối không log hoặc để lộ raw token / signature.
 */

/**
 * Trích xuất an toàn các claims (Audience, Scopes, Expiration, Tenant) từ JWT payload
 * mà không bao giờ log hoặc trả về phần signature nhạy cảm.
 */
export function inspectTokenClaims(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "NO_TOKEN_PROVIDED" };
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return { valid: false, reason: "INVALID_JWT_FORMAT" };
  }

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    const nowSec = Math.floor(Date.now() / 1000);
    const isExpired = typeof payload.exp === "number" && payload.exp < nowSec;
    const scopes = typeof payload.scp === "string" ? payload.scp.split(" ") : [];
    const roles = Array.isArray(payload.roles) ? payload.roles : [];

    const hasReportWrite = scopes.includes("Report.ReadWrite.All") || roles.includes("Report.ReadWrite.All");
    const hasDatasetWrite =
      scopes.includes("Dataset.ReadWrite.All") ||
      scopes.includes("SemanticModel.ReadWrite.All") ||
      roles.includes("Dataset.ReadWrite.All");

    const isFabricAudience =
      payload.aud === "https://api.fabric.microsoft.com" ||
      payload.aud === "https://api.fabric.microsoft.com/";
    const hasFabricItemWrite =
      scopes.includes("Item.ReadWrite.All") ||
      scopes.includes("Item.Execute.All") ||
      roles.includes("Item.ReadWrite.All");

    const upn = payload.upn || payload.unique_name || payload.preferred_username || "";
    const maskedUpn = upn ? upn.replace(/^(.)(.*)(@.*)$/, "$1***$3") : "masked_user";

    return {
      valid: true,
      audience: payload.aud,
      issuer: payload.iss,
      tenantId: payload.tid,
      maskedUpn,
      scopes,
      roles,
      isExpired,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      hasReportWrite,
      hasDatasetWrite,
      isFabricAudience,
      hasFabricItemWrite,
      canAutoPublishFabric: isFabricAudience && hasFabricItemWrite && !isExpired,
      canAutoPublish: (hasReportWrite && hasDatasetWrite && !isExpired) || (isFabricAudience && hasFabricItemWrite && !isExpired),
    };
  } catch (err) {
    return { valid: false, reason: "PARSE_ERROR", message: err.message };
  }
}

/**
 * Xin Access Token với đầy đủ Scopes ghi (POWERBI_PUBLISH_SCOPES) một cách im lặng (Silent)
 */
export async function getPowerBiPublishTokenSilent() {
  const pca = await getMsalInstance();
  const account = await getActiveAccount();

  if (!account) {
    addDiagEvent("ACQUIRE_PUBLISH_TOKEN_SKIP", { reason: "no_active_account" });
    return null;
  }

  try {
    const response = await pca.acquireTokenSilent({
      scopes: POWERBI_PUBLISH_SCOPES,
      account,
      redirectUri: getMsalRedirectUri(),
    });
    const hasToken = Boolean(response?.accessToken);
    addDiagEvent("ACQUIRE_PUBLISH_TOKEN_SUCCESS", { hasToken });
    return response.accessToken || null;
  } catch (error) {
    addDiagEvent("ACQUIRE_PUBLISH_TOKEN_FAILURE", {
      errorCode: error.errorCode || "unknown",
      message: error.message,
    });
    console.warn(
      "[PowerBI Auth] acquireTokenSilent cho Publish Scopes yêu cầu tương tác người dùng:",
      error.errorCode || error.message
    );
    return null;
  }
}

/**
 * Mở Popup yêu cầu người dùng cấp Consent và đăng nhập cho các quyền Ghi (Publish Scopes)
 */
export async function loginMicrosoftPublishConsentPopup() {
  if (isLoginInProgress) {
    throw new Error("Đang có một tiến trình đăng nhập Microsoft đang xử lý.");
  }

  const correlationId = `pbi_pub_${Date.now().toString(36)}`;
  const pca = await getMsalInstance();
  isLoginInProgress = true;

  try {
    const loginResponse = await pca.loginPopup({
      scopes: POWERBI_PUBLISH_SCOPES,
      prompt: "consent",
      redirectUri: getMsalRedirectUri(),
      correlationId,
    });

    if (loginResponse && loginResponse.account) {
      pca.setActiveAccount(loginResponse.account);
    }

    let token = loginResponse?.accessToken;
    if (!token) {
      token = await getPowerBiPublishTokenSilent();
    }

    addDiagEvent("LOGIN_PUBLISH_CONSENT_SUCCESS", {
      correlationId,
      hasToken: Boolean(token),
    });

    return {
      account: loginResponse?.account || null,
      accessToken: token,
      claims: inspectTokenClaims(token),
    };
  } finally {
    isLoginInProgress = false;
  }
}

/**
 * ==============================================================================
 * MICROSOFT FABRIC REST API TOKEN MANAGEMENT (AUDIENCE: https://api.fabric.microsoft.com)
 * ==============================================================================
 */

/**
 * Lấy Fabric Access Token một cách im lặng (Silent)
 */
export async function getFabricTokenSilent() {
  const pca = await getMsalInstance();
  const account = await getActiveAccount();

  if (!account) {
    addDiagEvent("ACQUIRE_FABRIC_TOKEN_SKIP", { reason: "no_active_account" });
    return null;
  }

  try {
    const response = await pca.acquireTokenSilent({
      scopes: FABRIC_SCOPES,
      account,
      redirectUri: getMsalRedirectUri(),
    });
    const hasToken = Boolean(response?.accessToken);
    addDiagEvent("ACQUIRE_FABRIC_TOKEN_SUCCESS", { hasToken });
    return response.accessToken || null;
  } catch (error) {
    addDiagEvent("ACQUIRE_FABRIC_TOKEN_FAILURE", {
      errorCode: error.errorCode || "unknown",
      message: error.message,
    });
    console.warn(
      "[Fabric Auth] acquireTokenSilent cho Fabric Scopes yêu cầu tương tác người dùng:",
      error.errorCode || error.message
    );
    return null;
  }
}

/**
 * Mở Popup yêu cầu cấp Consent cho Microsoft Fabric (Item.ReadWrite.All)
 */
export async function loginFabricConsentPopup() {
  if (isLoginInProgress) {
    throw new Error("Đang có một tiến trình đăng nhập Microsoft đang xử lý.");
  }

  const correlationId = `fab_${Date.now().toString(36)}`;
  const pca = await getMsalInstance();
  isLoginInProgress = true;

  try {
    const loginResponse = await pca.loginPopup({
      scopes: FABRIC_SCOPES,
      prompt: "select_account",
      redirectUri: getMsalRedirectUri(),
      correlationId,
    });

    if (loginResponse && loginResponse.account) {
      pca.setActiveAccount(loginResponse.account);
    }

    let token = loginResponse?.accessToken;
    if (!token) {
      token = await getFabricTokenSilent();
    }
    if (!token && loginResponse?.account) {
      try {
        const tokenRes = await pca.acquireTokenPopup({
          scopes: FABRIC_SCOPES,
          account: loginResponse.account,
          redirectUri: getMsalRedirectUri(),
        });
        token = tokenRes?.accessToken;
      } catch (acqErr) {
        console.warn("[Fabric Auth] acquireTokenPopup fallback warning:", acqErr.message);
      }
    }

    addDiagEvent("LOGIN_FABRIC_CONSENT_SUCCESS", {
      correlationId,
      hasToken: Boolean(token),
    });

    return {
      account: loginResponse?.account || null,
      accessToken: token,
      claims: inspectTokenClaims(token),
    };
  } finally {
    isLoginInProgress = false;
  }
}

/**
 * Lấy Fabric Token tự động (Thử silent trước, fallback sang popup consent nếu cần)
 */
export async function getFabricTokenInteractive() {
  const silentToken = await getFabricTokenSilent();
  if (silentToken) {
    return {
      accessToken: silentToken,
      claims: inspectTokenClaims(silentToken),
    };
  }
  return await loginFabricConsentPopup();
}
