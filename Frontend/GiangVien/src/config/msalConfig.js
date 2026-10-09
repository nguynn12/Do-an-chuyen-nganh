import { LogLevel } from "@azure/msal-browser";
import { powerBiEnv, POWERBI_SCOPES, getMsalRedirectUri } from "./powerBiConfig";

export const msalConfig = {
  auth: {
    clientId: powerBiEnv.clientId,
    authority: `https://login.microsoftonline.com/${powerBiEnv.tenantId}`,
    // Sử dụng trang callback riêng biệt /auth.html để chạy Redirect Bridge
    // Tránh việc popup nạp lại toàn bộ ứng dụng React LMS gây lỗi timed_out
    redirectUri: getMsalRedirectUri(),
  },

  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },

  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;

        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL Error]:", message);
            break;

          case LogLevel.Warning:
            console.warn("[MSAL Warning]:", message);
            break;

          default:
            break;
        }
      },
    },
  },
};

export const powerBIRequest = {
  scopes: POWERBI_SCOPES,
};