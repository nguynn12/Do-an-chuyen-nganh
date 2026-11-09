import axios from "axios";
import { getStudentUserId, getStudentToken, clearAuthStorage } from "./studentAuth";

const apiClient = axios.create({
  baseURL: "/api/v1/student",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const userId = getStudentUserId();
  const token = getStudentToken();

  if (userId) {
    config.params = {
      ...config.params,
      userId,
    };
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("[Auth] Phiên đăng nhập sinh viên đã hết hạn hoặc không hợp lệ.");
      clearAuthStorage();
      if (typeof window !== "undefined" && window.location.pathname !== "/dang-nhap") {
        window.location.href = "/dang-nhap";
      }
    }
    return Promise.reject(error);
  }
);


export async function studentGet(path, config = {}) {
  const response = await apiClient.get(path, config);
  return response.data;
}

export async function loginRequest(username, password) {
  const response = await axios.post("/api/auth/login", {
    username,
    password,
  });

  return response.data;
}

export default apiClient;
