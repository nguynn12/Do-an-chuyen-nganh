import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

// Kiểm tra xem cửa sổ hiện tại có phải là popup nhận phản hồi xác thực từ Microsoft không
// Nếu có, kích hoạt Redirect Bridge để phát tin về cửa sổ cha và đóng popup ngay lập tức,
// ngăn chặn việc tải lại toàn bộ ứng dụng React LMS gây lỗi timed_out
const isMsalPopupCallback =
  typeof window !== "undefined" &&
  Boolean(window.opener && window.opener !== window) &&
  (window.location.hash.includes("code=") ||
    window.location.search.includes("code=") ||
    window.location.hash.includes("error=") ||
    window.location.search.includes("error="));

if (isMsalPopupCallback) {
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
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}