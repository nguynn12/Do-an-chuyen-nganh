import axios from "axios";
import { getStudentUserId } from "./studentAuth";

const apiClient = axios.create({
  baseURL: "/api/v1/student",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const userId = getStudentUserId();

  if (userId) {
    config.params = {
      ...config.params,
      userId,
    };
  }

  return config;
});

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
