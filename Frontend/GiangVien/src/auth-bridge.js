import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

// Trang callback riêng chuyên trách xử lý phản hồi từ Microsoft Entra ID.
// broadcastResponseToMainFrame() đọc payload từ URL, phát tin qua BroadcastChannel
// về cửa sổ cha (Power BI Embed) và đóng popup ngay lập tức mà không cần nạp React App.
broadcastResponseToMainFrame().catch((error) => {
  console.error("[MSAL Redirect Bridge Error]:", error);
});
