import AppErrorBoundary from '../../shared/components/AppErrorBoundary';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "../../shared/dlu-theme.css";
import App from "./App.jsx";

// Kiểm tra xem cửa sổ hiện tại có phải là callback nhận phản hồi xác thực từ Microsoft không.
// Nếu Azure AD chuyển hướng về trang chủ / thay vì /auth.html, kích hoạt Redirect Bridge
// để phát tin qua BroadcastChannel về cửa sổ cha và đóng popup ngay lập tức,
// tránh việc tải lại toàn bộ ứng dụng React LMS trong popup gây lỗi timed_out.
const isMsalPopupCallback =
  typeof window !== "undefined" &&
  ((window.location.hash.includes("code=") ||
    window.location.search.includes("code=") ||
    window.location.hash.includes("error=") ||
    window.location.search.includes("error=")) &&
   (window.location.hash.includes("state=") ||
    window.location.search.includes("state=")));

if (isMsalPopupCallback) {
  try {
    const h = window.location.hash || "";
    const s = window.location.search || "";
    const errMatch = (h + "&" + s).match(/[?&#]error=([^&]+)/);
    const errDescMatch = (h + "&" + s).match(/[?&#]error_description=([^&]+)/);
    const info = {
      timestamp: new Date().toISOString(),
      origin: window.location.origin,
      pathname: window.location.pathname,
      hasCode: h.includes("code=") || s.includes("code="),
      hasState: h.includes("state=") || s.includes("state="),
      hasError: h.includes("error=") || s.includes("error="),
      errorName: errMatch ? decodeURIComponent(errMatch[1]) : null,
      errorDesc: errDescMatch ? decodeURIComponent(errDescMatch[1]).slice(0, 150) : null,
      note: "Callback redirected to root / instead of /auth.html",
    };
    localStorage.setItem("__msal_popup_arrival", JSON.stringify(info));
    const bc = new BroadcastChannel("msal_popup_diagnostics");
    bc.postMessage({ type: "ROOT_POPUP_ARRIVED", info });
    bc.close();
  } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }

  import("@azure/msal-browser/redirect-bridge")
    .then(({ broadcastResponseToMainFrame }) => {
      broadcastResponseToMainFrame().catch((err) => {
        console.error("[MSAL Fallback Bridge Error]:", err);
      });
    })
    .catch((importErr) => {
      console.error("[MSAL Fallback Bridge Import Error]:", importErr);
    });
} else {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <AppErrorBoundary><App /></AppErrorBoundary>
      </BrowserRouter>
    </StrictMode>
  );
}