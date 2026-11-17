import { getTeacherLearningAlertsApi, updateLearningAlertApi, markAllLearningAlertsApi } from './teacherApi';

export async function getNotifications(teacherId, status = '') {
  const alerts = await getTeacherLearningAlertsApi(teacherId);
  const data = alerts.map(item => ({ ...item, isRead: !item.unread, message: item.desc }));
  return { success: true, data: data.filter(item => !status || (status === 'read' ? item.isRead : !item.isRead)) };
}
export async function getUnreadNotificationCount(teacherId) {
  const {data} = await getNotifications(teacherId);
  return {success:true, unreadCount:data.filter(item => !item.isRead).length};
}
export const markNotificationAsRead = (teacherId, id) => updateLearningAlertApi(teacherId, id, true);
export const markAllNotificationsAsRead = markAllLearningAlertsApi;
