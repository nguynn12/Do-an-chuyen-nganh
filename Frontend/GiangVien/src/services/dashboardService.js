import { apiGet } from "./apiClient";
import {
  mockGetCurrentUser,
  mockGetDashboard,
  mockGetCourses,
  mockGetTasks,
  mockGetNotifications,
  mockGetSchedule,
  mockGetAnalytics,
  mockGetCourse,
  mockGetGrading,
  mockGetCourseStudents,
} from "../mocks/mockApi";

const DATA_MODE = import.meta.env.VITE_DATA_MODE || "mock";

const useMock = DATA_MODE === "mock";

export function getCurrentUser() {
  return useMock ? mockGetCurrentUser() : apiGet("/auth/me");
}

export function getTeacherDashboard(teacherId) {
  return useMock
    ? mockGetDashboard(teacherId)
    : apiGet(`/teachers/${teacherId}/dashboard`);
}

export function getTeacherCourses(teacherId) {
  return useMock
    ? mockGetCourses(teacherId)
    : apiGet(`/teachers/${teacherId}/courses`);
}

export function getTeacherTasks(teacherId) {
  return useMock
    ? mockGetTasks(teacherId)
    : apiGet(`/teachers/${teacherId}/tasks`);
}

export function getTeacherNotifications(teacherId) {
  return useMock
    ? mockGetNotifications(teacherId)
    : apiGet(`/teachers/${teacherId}/notifications`);
}

export function getTeacherSchedule(teacherId, month) {
  return useMock
    ? mockGetSchedule(teacherId, month)
    : apiGet(`/teachers/${teacherId}/schedule?month=${month}`);
}

export function getTeacherAnalytics(teacherId) {
  return useMock
    ? mockGetAnalytics(teacherId)
    : apiGet(`/teachers/${teacherId}/analytics`);
}

export function getCourse(courseId) {
  return useMock ? mockGetCourse(courseId) : apiGet(`/courses/${courseId}`);
}

export function getGrading(courseId, teacherId) {
  if (useMock) {
    return mockGetGrading(courseId, teacherId);
  }

  const suffix = courseId ? `?courseId=${courseId}` : "";
  return apiGet(`/teachers/${teacherId}/grading${suffix}`);
  
}
export function getCourseStudents(courseId) {
  return useMock
    ? mockGetCourseStudents(courseId)
    : apiGet(`/courses/${courseId}/students`);
}
