import React, { useState, useEffect } from "react";
import {
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAIKey } from "../context/AIKeyContext";
import { verifyAiKey } from "../services/aiApiClient";

export default function AIKeyModal() {
  const { apiKey, isConfigured, isModalOpen, setIsModalOpen, saveKey, clearKey } =
    useAIKey();

  const [inputVal, setInputVal] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    if (isModalOpen) {
      setInputVal(apiKey || "");
      setStatusMessage(null);
    }
  }, [isModalOpen, apiKey]);

  if (!isModalOpen) return null;

  const handleTestConnection = async () => {
    const keyToTest = inputVal.trim();
    if (!keyToTest) {
      setStatusMessage({
        type: "error",
        text: "Vui lòng nhập API Key trước khi kiểm tra.",
      });
      return;
    }

    if (keyToTest.length < 10) {
      setStatusMessage({
        type: "error",
        text: "Gemini API Key phải có độ dài tối thiểu 10 ký tự.",
      });
      return;
    }

    try {
      setTesting(true);
      setStatusMessage(null);
      await verifyAiKey(keyToTest);
      setStatusMessage({
        type: "success",
        text: "Kết nối thành công! Key hợp lệ và sẵn sàng sử dụng.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Không thể kết nối với Gemini. Vui lòng kiểm tra lại key.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const keyToSave = inputVal.trim();
    if (!keyToSave) {
      setStatusMessage({
        type: "error",
        text: "Vui lòng nhập API Key hợp lệ.",
      });
      return;
    }
    if (keyToSave.length < 10) {
      setStatusMessage({
        type: "error",
        text: "Gemini API Key phải có độ dài tối thiểu 10 ký tự.",
      });
      return;
    }
    saveKey(keyToSave);
    setIsModalOpen(false);
  };

  const handleClear = () => {
    clearKey();
    setInputVal("");
    setStatusMessage({
      type: "success",
      text: "Đã xóa API Key khỏi phiên làm việc.",
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={() => setIsModalOpen(false)}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e4d2b 0%, #2e7d32 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>
                Cấu hình Gemini AI Key (BYOK)
              </h3>
              <span style={{ fontSize: "12px", opacity: 0.9 }}>
                Bring Your Own Key - Dành cho Cổng Sinh viên DLU
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "18px",
              fontSize: "12.5px",
              color: "#475569",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <ShieldCheck size={18} color="#2e7d32" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Bảo mật phiên làm việc:</strong> Khóa chỉ lưu trong{" "}
              <code>sessionStorage</code> của trình duyệt (tự động xóa khi bạn đóng tab). Không lưu
              vào cơ sở dữ liệu và không chia sẻ ra ngoài.
            </div>
          </div>

          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "8px",
            }}
          >
            Google Gemini API Key:
          </label>

          {/* Input field */}
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <div
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                display: "flex",
              }}
            >
              <Key size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Dán Gemini API Key của bạn..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 42px 10px 38px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13.5px",
                fontFamily: "monospace",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#ffffff",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                padding: "4px",
              }}
              title={showPassword ? "Ẩn key" : "Hiện key"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Helper link */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              marginBottom: "18px",
            }}
          >
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#2e7d32",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                textDecoration: "none",
              }}
            >
              Lấy Gemini API Key miễn phí (Google AI Studio) <ExternalLink size={13} />
            </a>
            {isConfigured && (
              <span style={{ color: "#16a34a", fontWeight: "600" }}>
                ✓ Đang lưu trong phiên
              </span>
            )}
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor:
                  statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: statusMessage.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${
                  statusMessage.type === "success" ? "#a7f3d0" : "#fecaca"
                }`,
              }}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <div>
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    backgroundColor: "#fff5f5",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={14} /> Xóa Key
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: testing ? "not-allowed" : "pointer",
                }}
              >
                {testing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Đang kiểm tra...
                  </>
                ) : (
                  "Kiểm tra kết nối"
                )}
              </button>

              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2e7d32",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(46, 125, 50, 0.3)",
                }}
              >
                Lưu & Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

