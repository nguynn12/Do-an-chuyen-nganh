// ==============================================================================
// DỊCH VỤ XÁC THỰC MICROSOFT ENTRA ID DÀNH CHO LMS LOGIN (OIDC SSO)
// ==============================================================================
// Tách biệt hoàn toàn với Token Power BI Service (Report.Read.All)
// Sử dụng @azure/msal-browser để lấy danh tính OpenID / User.Read
// Tuyệt đối không log token, mật khẩu, secrets ra console.
// ==============================================================================

import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const env = import.meta.env;

// Client ID ưu tiên VITE_MICROSOFT_CLIENT_ID, sau đó fallback VITE_POWERBI_CLIENT_ID
const clientId = env.VITE_MICROSOFT_CLIENT_ID || env.VITE_POWERBI_CLIENT_ID || "a8b09661-e072-43e9-945e-41512d641ccb";
const tenantId = env.VITE_MICROSOFT_TENANT_ID || env.VITE_POWERBI_TENANT_ID || "8450369b-11fa-4413-8dc7-060ab9f34f41";
const redirectUri = env.VITE_POWERBI_REDIRECT_URI || (typeof window !== "undefined" ? `${window.location.origin}/auth.html` : "http://localhost:5173/auth.html");

export const isMicrosoftConfigured = Boolean(clientId && tenantId);

const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    popupBridgeTimeout: 120000,
    iframeBridgeTimeout: 30000,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) {
          console.error("[MSAL SSO Error]:", message);
        }
      },
    },
  },
};

let msalInstance = null;
let msalInitPromise = null;

async function getMsalInstance() {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  if (!msalInitPromise) {
    msalInitPromise = msalInstance.initialize().catch((err) => {
      console.error("[MSAL SSO] Khởi tạo thất bại:", err.message);
      msalInitPromise = null;
      throw err;
    });
  }
  await msalInitPromise;
  return msalInstance;
}

/**
 * Đăng nhập SSO Microsoft qua Popup để lấy ID Token & User.Read Access Token
 */
export async function loginWithMicrosoftPopup() {
  if (!isMicrosoftConfigured) {
    throw new Error("Hệ thống chưa cấu hình Microsoft Entra ID Client ID.");
  }

  const pca = await getMsalInstance();

  const loginRequest = {
    scopes: ["openid", "profile", "email", "User.Read"],
    prompt: "select_account",
    redirectUri,
  };

  try {
    const response = await pca.loginPopup(loginRequest);

    if (response && response.account) {
      pca.setActiveAccount(response.account);
    }

    return {
      accessToken: response.accessToken,
      idToken: response.idToken,
      account: response.account,
    };
  } catch (error) {
    if (error.errorCode === "user_cancelled") {
      throw new Error("Bạn đã hủy đăng nhập Microsoft.", { cause: error });
    }
    if (error.errorCode === "popup_window_error") {
      throw new Error("Trình duyệt đã chặn cửa sổ Popup Microsoft. Vui lòng cho phép popup để tiếp tục.", { cause: error });
    }
    throw new Error(error.message || "Đăng nhập Microsoft không thành công.", { cause: error });
  }
}
