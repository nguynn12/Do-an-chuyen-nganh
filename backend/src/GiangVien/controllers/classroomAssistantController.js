import { converseWithClassroom } from '../services/classroomConversationService.js';

const requests = new Map();
export async function handleClassroomChat(req, res) {
  const key = req.teacher.userKey;
  const now = Date.now();
  if (requests.size > 1000) for (const [id, entry] of requests) if (now - entry.start >= 60000) requests.delete(id);
  const entry = requests.get(key);
  const bucket = !entry || now - entry.start >= 60000 ? { start: now, count: 0 } : entry;
  if (bucket.count >= 12) return res.status(429).json({ success: false, message: 'Bạn đang hỏi khá nhanh. Vui lòng chờ một phút để tiết kiệm hạn mức AI.' });
  bucket.count++; requests.set(key, bucket);
  try {
    const result = await converseWithClassroom(req.teacher, req.course, req.body || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể phân tích lớp lúc này. Vui lòng thử lại.' });
  }
}
