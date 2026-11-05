/**
 * Quản lý công tắc tính năng (Feature Flags) cho Cổng Giảng viên.
 * Mặc định TẮT (false) khi biến môi trường không được khai báo hoặc khác "true".
 */
export const IS_ASSIGNMENT_MANAGEMENT_ENABLED =
  import.meta.env.VITE_ENABLE_ASSIGNMENT_MANAGEMENT === "true";
