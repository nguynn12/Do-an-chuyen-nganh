import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

const recordDiag = (type, detail = {}) => {
  try {
    const item = { timestamp: new Date().toISOString(), type, detail };
    const cur = JSON.parse(localStorage.getItem("__msal_diag_trace") || "[]");
    cur.push(item);
    localStorage.setItem("__msal_diag_trace", JSON.stringify(cur.slice(-30)));
    const bc = new BroadcastChannel("msal_popup_diagnostics");
    bc.postMessage(item);
    bc.close();
  } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
};

recordDiag("BRIDGE_START", {
  origin: window.location.origin,
  pathname: window.location.pathname,
});

broadcastResponseToMainFrame()
  .then(() => {
    recordDiag("BRIDGE_SUCCESS");
  })
  .catch((error) => {
    recordDiag("BRIDGE_ERROR", {
      name: error?.name,
      errorCode: error?.errorCode,
      message: error?.message,
    });
    console.error("[MSAL Redirect Bridge Error]:", error?.errorCode || error?.message || error);
  });
