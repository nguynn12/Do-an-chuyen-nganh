// ==============================================================================
// DỊCH VỤ XÁC THỰC MICROSOFT ENTRA ID CHO POWER BI (USER-OWNS-DATA)
// ==============================================================================
// Sử dụng @azure/msal-browser để lấy Access Token truy cập Power BI Service
// TUÂN THỦ NGUYÊN TẮC: Tuyệt đối không ghi Access Token ra console hay log.
// ==============================================================================

import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, powerBIRequest } from "../config/msalConfig";
import { getMsalRedirectUri } from "../config/powerBiConfig";

let msalInstance = null;
let msalInitPromise = null;
let isLoginInProgress = false;

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
    return null;
  }

  try {
    const response = await pca.acquireTokenSilent({
      scopes: powerBIRequest.scopes,
      account,
      redirectUri: getMsalRedirectUri(),
    });
    return response.accessToken || null;
  } catch (error) {
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
    throw new Error("Đang có một tiến trình đăng nhập Microsoft đang xử lý. Vui lòng hoàn tất trong cửa sổ Popup.");
  }

  const pca = await getMsalInstance();
  isLoginInProgress = true;

  try {
    const loginResponse = await pca.loginPopup({
      scopes: powerBIRequest.scopes,
      prompt: "select_account",
      redirectUri: getMsalRedirectUri(),
    });

    if (loginResponse && loginResponse.account) {
      pca.setActiveAccount(loginResponse.account);
    }

    let token = loginResponse?.accessToken;
    if (!token) {
      token = await getPowerBiTokenSilent();
    }

    return {
      account: loginResponse?.account || null,
      accessToken: token,
    };
  } catch (error) {
    console.error("[PowerBI Auth] Lỗi đăng nhập Microsoft Popup:", error.errorCode || error.message);

    if (error.errorCode === "timed_out") {
      throw new Error(
        "Xác thực Microsoft đã hết thời gian chờ (timed_out). Đảm bảo URL callback đã được cấu hình đúng trên Microsoft Entra ID và không bị chặn popup."
      );
    }
    if (error.errorCode === "interaction_in_progress") {
      throw new Error("Một cửa sổ đăng nhập Microsoft đang mở. Vui lòng kiểm tra lại thanh tác vụ.");
    }
    if (error.errorCode === "popup_window_error") {
      throw new Error("Trình duyệt đã chặn cửa sổ Popup đăng nhập. Vui lòng bật cho phép popup trên trình duyệt của bạn.");
    }
    if (error.errorCode === "user_cancelled") {
      throw new Error("Đăng nhập Microsoft đã bị hủy bởi người dùng.");
    }

    throw new Error(error.message || "Đăng nhập Microsoft không thành công.");
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
