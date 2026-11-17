// ==============================================================================
// DỊCH VỤ XÁC THỰC GOOGLE IDENTITY SERVICES (GIS) CHO LMS
// ==============================================================================
// Sử dụng Google Identity Services (OIDC ID Token)
// Tuyệt đối không log token hay mật khẩu ra console.
// ==============================================================================

const env = import.meta.env;

export const GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID || "";
export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim() !== "");

let gisLoadedPromise = null;

function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);

  if (!gisLoadedPromise) {
    gisLoadedPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google?.accounts?.id));
        existing.addEventListener("error", (_e) => reject(new Error("Không thể tải Google Identity SDK")));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google?.accounts?.id);
      script.onerror = () => reject(new Error("Không thể tải Google Identity SDK"));
      document.head.appendChild(script);
    });
  }

  return gisLoadedPromise;
}

/**
 * Mở hộp thoại đăng nhập Google (One Tap hoặc Popup Prompt)
 * Trả về ID token (credential)
 */
export async function loginWithGooglePrompt() {
  if (!isGoogleConfigured) {
    throw new Error(
      "Hệ thống chưa cấu hình VITE_GOOGLE_CLIENT_ID. Vui lòng liên hệ quản trị viên để thiết lập Google Cloud OAuth Client."
    );
  }

  const googleId = await loadGoogleScript();

  return new Promise((resolve, reject) => {
    try {
      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            resolve({ credential: response.credential });
          } else {
            reject(new Error("Không nhận được chứng thực từ Google."));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Kích hoạt prompt
      googleId.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn("[Google Auth] Prompt not displayed or skipped:", notification.getNotDisplayedReason?.());
        }
      });
    } catch (err) {
      reject(new Error(err.message || "Lỗi khởi động đăng nhập Google."));
    }
  });
}
