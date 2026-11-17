import { createHash } from 'node:crypto';
import pool from '../../config/database.js';
import { readStudentAssignmentStats } from './studentAssignmentStatsService.js';
import { explainClassroomWithGroq, getGroqConfig } from './groqStudioService.js';

const cache = new Map(), pending = new Map();
const TTL = 5 * 60 * 1000;
const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const round = value => Math.round(Number(value) * 10) / 10;
const keyOf = date => date.toISOString().slice(0, 10);
export function classroomPeriod(requested = 'week', prompt = '', now = new Date()) {
  const local = new Date(now.getTime() + 7 * 3600000);
  const today = new Date(`${keyOf(local)}T00:00:00Z`);
  let type = requested;
  const text = fold(prompt);
  if (/tuan truoc/.test(text)) type = 'last_week';
  else if (/tuan nay/.test(text)) type = 'week';
  else if (/toan bo|tat ca thoi gian|ca hoc ky/.test(text)) type = 'all';
  if (!['week', 'last_week', 'month', 'all'].includes(type)) throw Object.assign(new Error('Khoảng thời gian không hợp lệ.'), { status: 400 });
  if (type === 'all') return { type, label: 'Toàn bộ dữ liệu hiện có', start: null, end: null, startEpoch: null, endEpoch: null };
  const start = new Date(today), end = new Date(today);
  if (type === 'month') { start.setUTCDate(start.getUTCDate() - 29); end.setUTCDate(end.getUTCDate() + 1); }
  else { start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7 - (type === 'last_week' ? 7 : 0)); end.setTime(start.getTime() + 7 * 86400000); }
  return { type, label: type === 'week' ? 'Tuần này' : type === 'last_week' ? 'Tuần trước' : '30 ngày gần đây', start: keyOf(start), end: keyOf(end), startEpoch: (start.getTime() - 7 * 3600000) / 1000, endEpoch: (end.getTime() - 7 * 3600000) / 1000 };
}
export function classroomTopic(prompt, previousTopic) {
  const text = fold(prompt);
  if (/chuyen can|diem danh|vang hoc/.test(text)) return 'attendance';
  if (/so sanh|so voi/.test(text)) return 'comparison';
  if (/lo hong|chu de|kien thuc|on tap|cau hoi.*sai/.test(text)) return 'knowledge';
  if (/quiz|trac nghiem/.test(text)) return 'quiz';
  if (/chua nop|thieu bai|ai.*nop/.test(text)) return 'missing';
  if (/bai tap|nop bai|bai nop|tre han/.test(text)) return 'assignments';
  if (/diem|pho diem/.test(text)) return 'grades';
  if (/tom tat|tong ket|tinh hinh|tong quan|can chu y/.test(text)) return 'summary';
  if (/chi tiet|xem them|mo bao cao|thong ke|goi y/.test(text) && ['summary', 'assignments', 'missing', 'grades', 'quiz', 'knowledge'].includes(previousTopic)) return previousTopic;
  return 'unsupported';
}
const within = (epoch, period) => !period.start || (Number(epoch) >= period.startEpoch && Number(epoch) < period.endEpoch);
export function assignmentSnapshot(data, period, nowEpoch = Date.now() / 1000) {
  const assignments = data.assignments.filter(a => !period.start || Number(a.dueTime) > 0 && within(a.dueTime, period));
  const currentIds = new Set(data.students.map(student => String(student.studentId)));
  const submissions = data.submissions.filter(s => currentIds.has(String(s.studentId)) && s.submissionStatus === 'submitted');
  const stats = assignments.map(a => {
    const records = submissions.filter(s => String(s.assignmentId) === String(a.assignmentId));
    const submitted = new Set(records.map(s => String(s.studentId))).size;
    const missing = Math.max(0, data.students.length - submitted);
    return { label: String(a.activityName).slice(0, 100), submitted, missing, overdueMissing: Number(a.dueTime) > 0 && Number(a.dueTime) < nowEpoch ? missing : 0,
      late: records.filter(s => Number(a.dueTime) > 0 && Number(s.submitModified || s.submitTime) > Number(a.dueTime)).length };
  });
  return { rosterSource: data.rosterSource, totalAssignments: data.assignments.length, firstDue: data.assignments.filter(a => Number(a.dueTime)>0).map(a => Number(a.dueTime)).sort((a,b)=>a-b)[0] || null, lastDue: Math.max(0,...data.assignments.map(a => Number(a.dueTime)||0)), enrolled: data.students.length, assignments: stats.length, submitted: stats.reduce((n, a) => n + a.submitted, 0), missing: stats.reduce((n, a) => n + a.missing, 0), overdueMissing: stats.reduce((n, a) => n + a.overdueMissing, 0), late: stats.reduce((n, a) => n + a.late, 0), activityInPeriod: submissions.filter(s => within(s.submitModified || s.submitTime, period)).length, chart: stats.slice(0, 8) };
}
export function classroomLinks(course, topic) {
  const courseId = encodeURIComponent(course.Moodle_Course_ID);
  const analytics = subtab => `/phan-tich?courseId=${courseId}&tab=assessment&subtab=${subtab}&cohort=ALL`;
  const choices = {
    assignment: { label: 'Power BI · Bài tập & Nộp bài', href: analytics('assignment'), note: 'Mở đúng môn; chọn thời gian trong báo cáo.' },
    submissions: { label: 'Xem danh sách bài nộp', href: `/quan-ly-bai-tap/${courseId}?tab=submissions`, note: 'Chọn bài để xem sinh viên chưa nộp.' },
    quiz: { label: 'Power BI · Quiz & Câu hỏi', href: analytics('quiz'), note: 'Mở đúng môn; chọn thời gian trong báo cáo.' },
    knowledge: { label: 'Power BI · Lỗ hổng kiến thức', href: analytics('knowledge_gap'), note: 'Mở đúng môn; chọn thời gian trong báo cáo.' },
    grades: { label: 'Xem tổng quan lớp & điểm', href: `/quan-ly-lop/${courseId}`, note: 'Dữ liệu điểm tích lũy của môn.' },
  };
  const keys = ({ assignments: ['assignment', 'submissions'], missing: ['submissions', 'assignment'], grades: ['grades'], quiz: ['quiz', 'knowledge'], knowledge: ['knowledge', 'quiz'] })[topic] || ['assignment', 'quiz', 'knowledge'];
  return keys.map(key => choices[key]);
}

export async function loadSnapshot(teacher, course, period) {
  const range = period.start ? 'AND f.Attempt_Finish >= ? AND f.Attempt_Finish < ?' : '';
  const args = [course.Course_Key, ...(period.start ? [`${period.start} 00:00:00`, `${period.end} 00:00:00`] : [])];
  const results = await Promise.allSettled([
    readStudentAssignmentStats(teacher, course, period),
    pool.query(`SELECT COUNT(*) AS attempts, COUNT(DISTINCT t.User_Key) AS students, AVG(t.score) AS average FROM (SELECT f.Source_Quiz_Attempt_ID, f.User_Key, MAX(CASE WHEN q.Max_Grade > 0 AND f.Quiz_Score IS NOT NULL THEN f.Quiz_Score / q.Max_Grade * 10 ELSE NULL END) AS score FROM fact_question_attempt f JOIN dim_quiz q ON q.Quiz_Key=f.Quiz_Key WHERE f.Course_Key=? ${range} GROUP BY f.Source_Quiz_Attempt_ID, f.User_Key) t`, args),
    pool.query(`SELECT COALESCE(NULLIF(q.Knowledge_Topic,''),'Chưa phân loại') AS label, COUNT(*) AS answers, SUM(f.Is_Correct=1) AS correct FROM fact_question_attempt f JOIN dim_question q ON q.Question_Key=f.Question_Key WHERE f.Course_Key=? ${range} GROUP BY q.Knowledge_Topic ORDER BY SUM(f.Is_Correct=1)/COUNT(*) ASC LIMIT 5`, args),
    pool.query('SELECT AVG(g.score) AS average, COUNT(*) AS students, SUM(g.score >= 5) AS passed FROM (SELECT User_Key, AVG(Grade/Max_Grade*10) AS score FROM Fact_Course_Grade WHERE Course_Key=? AND Grade IS NOT NULL AND Grade>=0 AND Max_Grade>0 GROUP BY User_Key) g', [course.Course_Key]),
  ]);
  const warnings = [], snapshot = {};
  if (results[0].status === 'fulfilled') snapshot.assignmentStatus = results[0].value.snapshot;
  else warnings.push('Chưa đọc được dữ liệu bài tập/ghi danh. Không thể kết luận sinh viên chưa nộp.');
  if (results[1].status === 'fulfilled') {
    const row = results[1].value[0][0]; snapshot.quiz = { attempts: Number(row.attempts), students: Number(row.students), average: row.average === null ? null : round(row.average) };
  } else warnings.push('Chưa đọc được dữ liệu Quiz trong kho dữ liệu.');
  if (results[2].status === 'fulfilled') snapshot.topics = results[2].value[0].map(row => ({ label: row.label, answers: Number(row.answers), correctRate: round(Number(row.correct) / Number(row.answers) * 100) }));
  else warnings.push('Chưa đọc được dữ liệu chủ đề kiến thức.');
  if (results[3].status === 'fulfilled') {
    const row = results[3].value[0][0]; snapshot.grades = { students: Number(row.students), average: row.average === null ? null : round(row.average), passed: Number(row.passed || 0) };
  } else warnings.push('Chưa đọc được điểm tích lũy.');
  if (!Object.keys(snapshot).length) throw Object.assign(new Error('Chưa thể đọc dữ liệu lớp. Vui lòng thử lại sau.'), { status: 503 });
  return { snapshot, warnings };
}

export function formatClassroomAnswer(course, period, topic, snapshot, warnings = []) {
  const a = snapshot.assignmentStatus, q = snapshot.quiz, g = snapshot.grades;
  const facts = [], charts = [], suggestions = [];
  if (a && ['summary', 'assignments', 'missing'].includes(topic)) {
    if (!a.enrolled) {
      facts.push('Chưa đủ dữ liệu ghi danh để thống kê tiến độ nộp bài của lớp. Không thể kết luận lớp không có sinh viên.');
      warnings.push('Cần kiểm tra đồng bộ danh sách sinh viên trước khi đánh giá lượt thiếu bài.');
    } else {
      facts.push(`Lớp có ${a.enrolled} sinh viên trong danh sách ghi danh đã đối chiếu.`);
      if (!a.assignments) {
        facts.push('Không có bài tập đến hạn trong khoảng thời gian đã chọn. Điều này không có nghĩa là môn học chưa có bài tập.');
        if (a.totalAssignments) {
          const fmt = value => new Date(value*1000).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'});
          facts.push(`Môn hiện có ${a.totalAssignments} bài tập${a.firstDue ? `, hạn nộp từ ${fmt(a.firstDue)} đến ${fmt(a.lastDue)}` : ', chưa có hạn nộp xác định'}. Chọn “Toàn bộ dữ liệu” để xem các bài này.`);
        }
      } else {
        facts.push(`${a.assignments} bài tập ${period.type === 'all' ? 'trong dữ liệu hiện có' : 'có hạn nộp trong kỳ được chọn'}: ${a.submitted} lượt đã nộp, ${a.missing} lượt chưa ghi nhận; ${a.overdueMissing} lượt chưa nộp thuộc bài đã quá hạn.`);
        warnings.push('Lượt nộp = sinh viên × bài tập. Trạng thái hiện tại không phải ảnh chụp lịch sử của tuần đã chọn.');
      }
      if (a.activityInPeriod) facts.push(`${a.activityInPeriod} lượt bài nộp được cập nhật trong kỳ đã chọn.`);
    }
    if (a.rosterSource === 'source_enrolment_with_warehouse_student_role') warnings.push('Bảng phân vai trò lớp chưa đầy đủ; danh sách sinh viên được đối chiếu giữa ghi danh Moodle và vai trò sinh viên trong kho dữ liệu.');
    if (a.enrolled && a.chart.length) charts.push({ title: 'Bài tập theo hạn nộp · Trạng thái hiện tại', unit: 'lượt nộp', bars: a.chart.map(row => ({ label: row.label, value: row.submitted, secondary: row.missing })), legend: ['Đã nộp', 'Chưa ghi nhận'] });
    if (a.overdueMissing) suggestions.push('Mở danh sách bài nộp, kiểm tra từng bài và danh sách ghi danh trước khi soạn lời nhắc.');
  }
  if (q && ['summary', 'quiz', 'knowledge'].includes(topic)) {
    facts.push(q.attempts ? `Quiz trong kỳ có ${q.attempts} lượt làm từ ${q.students} sinh viên; điểm trung bình theo lượt làm: ${q.average === null ? 'chưa đủ dữ liệu chuẩn hóa' : `${q.average}/10`}.` : 'Chưa có lượt Quiz được ghi nhận trong kỳ đã chọn.');
  }
  if (['knowledge', 'quiz'].includes(topic) && snapshot.topics?.length) {
    charts.push({ title: 'Chủ đề có tỷ lệ đúng thấp · Theo lượt trả lời', unit: '% đúng', bars: snapshot.topics.map(row => ({ label: row.label, value: row.correctRate })), legend: ['Tỷ lệ đúng'] });
    facts.push(...snapshot.topics.slice(0, 3).map(row => `${row.label}: ${row.correctRate}% đúng trên ${row.answers} lượt trả lời.`));
    suggestions.push('Xem câu hỏi và số lượt trả lời của từng chủ đề trước khi chọn nội dung ôn tập.');
  }
  if (g && topic === 'grades') {
    facts.push(g.students ? `Điểm tích lũy: ${g.students} sinh viên có điểm hợp lệ, trung bình ${g.average}/10; ${g.passed} sinh viên có trung bình từ 5/10.` : 'Chưa có điểm tích lũy hợp lệ trong kho dữ liệu.');
    warnings.push('Điểm là trung bình các bản ghi đã chuẩn hóa theo sinh viên trong kho, không phải điểm tổng kết chính thức và không lọc theo tuần.');
    if (g.students) charts.push({ title: 'Điểm tích lũy · Ngưỡng tham khảo 5/10', unit: 'sinh viên', bars: [{ label: 'Từ 5/10', value: g.passed }, { label: 'Dưới 5/10', value: g.students - g.passed }], legend: ['Sinh viên có điểm'] });
  }
  if (topic === 'missing') suggestions.push('Danh sách tên sinh viên được mở trong hệ thống bằng nút bên dưới; không gửi tên hoặc bảng điểm cá nhân lên AI.');
  if (!facts.length) facts.push('Chưa đủ dữ liệu cho nội dung này trong kỳ đã chọn.');
  return { title: `${topic === 'summary' ? 'Tóm tắt lớp học' : 'Phân tích lớp học'} · ${course.Course_Code}`, facts, charts, suggestions, warnings: [...new Set(warnings)] };
}

export async function classroomChat(teacher, course, input, options = {}) {
  const prompt = String(input.prompt || '').trim();
  if (!prompt || prompt.length > 600) throw Object.assign(new Error('Vui lòng nhập câu hỏi từ 1 đến 600 ký tự.'), { status: 400 });
  const period = classroomPeriod(input.period, prompt, options.now);
  const topic = classroomTopic(prompt, input.previousTopic);
  if (['unsupported', 'attendance', 'comparison'].includes(topic)) return { topic, supported: false, title: 'Mình có thể giúp gì?', facts: [topic === 'comparison' ? 'Hiện trợ lý chưa tính so sánh hai kỳ hoặc hai lớp. Bạn có thể chọn từng kỳ để xem số liệu hoặc mở báo cáo chi tiết.' : topic === 'attendance' ? 'Phiên bản này chưa phân tích chuyên cần. Mình có thể tóm tắt bài tập, Quiz, điểm và chủ đề cần ôn.' : 'Bạn thử hỏi “Tóm tắt tuần này”, “Tình hình bài tập”, “Kết quả Quiz” hoặc “Xem điểm tích lũy” nhé.'], links: classroomLinks(course, 'summary'), period, charts: [], warnings: [], suggestions: [], provider: 'data', generatedAt: new Date().toISOString() };
  const cacheKey = createHash('sha256').update(JSON.stringify([teacher.userKey, course.Course_Key, topic, period])).digest('hex');
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return { ...cached.result, cached: true };
  if (pending.has(cacheKey)) return { ...await pending.get(cacheKey), cached: true };
  const task = (async () => {
    const { snapshot, warnings } = await (options.load || loadSnapshot)(teacher, course, period);
    const answer = formatClassroomAnswer(course, period, topic, snapshot, [...warnings]);
    let provider = 'data', insights = [], model = null, totalTokens = 0;
    const a = snapshot.assignmentStatus, q = snapshot.quiz;
    const hasData = topic === 'grades' ? snapshot.grades?.students > 0 : ['quiz', 'knowledge'].includes(topic) ? q?.attempts > 0 : a?.assignments > 0 || a?.activityInPeriod > 0 || q?.attempts > 0;
    if (hasData && (options.explain || getGroqConfig().hasKey)) {
      try {
        // No raw user prompt, names, IDs, links, assignment labels or student rows go to Groq.
        const anonymous = { assignmentStatus: a ? { enrolled: a.enrolled || null, assignments: a.assignments, submitted: a.enrolled ? a.submitted : null, missing: a.enrolled ? a.missing : null, overdueMissing: a.enrolled ? a.overdueMissing : null, activityInPeriod: a.activityInPeriod } : null, quiz: q || null, grades: topic === 'grades' ? snapshot.grades : null, topicRates: snapshot.topics?.map(({ answers, correctRate }) => ({ answers, correctRate })) || [], period: period.type };
        const explanation = await (options.explain || explainClassroomWithGroq)(topic, anonymous);
        insights = explanation.insights; answer.suggestions = [...answer.suggestions, ...explanation.suggestions].slice(0, 3); model = explanation.model; totalTokens = explanation.totalTokens; provider = 'groq';
      } catch {
        answer.warnings.push('Groq tạm chưa phản hồi hoặc đã chạm hạn mức. Số liệu và liên kết bên dưới vẫn lấy trực tiếp từ hệ thống.');
      }
    }
    const result = { ...answer, topic, supported: true, insights, links: classroomLinks(course, topic), period, provider, model, totalTokens, cached: false, generatedAt: new Date().toISOString(), source: 'Moodle source đang đồng bộ và LMS Data Warehouse', privacy: 'Chỉ gửi chỉ số tổng hợp cho AI; không gửi hồ sơ sinh viên.' };
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { result, expires: Date.now() + (hasData && provider !== 'groq' ? 30000 : TTL) });
    return result;
  })();
  pending.set(cacheKey, task);
  try { return await task; } finally { pending.delete(cacheKey); }
}
