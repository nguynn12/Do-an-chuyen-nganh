import React, { createContext, useContext, useState, useEffect } from "react";

const AIKeyContext = createContext(null);

const STORAGE_KEY = "user_gemini_key";

export function AIKeyProvider({ children }) {
  const [apiKey, setApiKey] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Khởi tạo key từ sessionStorage khi nạp trang (F5 không mất)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        setApiKey(saved.trim());
      }
    } catch (e) {
      console.warn("Không thể truy cập sessionStorage:", e);
    }
  }, []);

  const saveKey = (key) => {
    const trimmed = (key || "").trim();
    setApiKey(trimmed);
    try {
      if (trimmed) {
        sessionStorage.setItem(STORAGE_KEY, trimmed);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Không thể lưu vào sessionStorage:", e);
    }
  };

  const clearKey = () => {
    setApiKey("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Không thể xóa khỏi sessionStorage:", e);
    }
  };

  const isConfigured = Boolean(apiKey && apiKey.trim().length >= 10);

  return (
    <AIKeyContext.Provider
      value={{
        apiKey,
        isConfigured,
        isModalOpen,
        setIsModalOpen,
        saveKey,
        clearKey,
      }}
    >
      {children}
    </AIKeyContext.Provider>
  );
}

export function useAIKey() {
  const context = useContext(AIKeyContext);
  if (!context) {
    throw new Error("useAIKey phải được sử dụng bên trong <AIKeyProvider>");
  }
  return context;
}

