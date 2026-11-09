import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Send, X, ArrowUpRight, RotateCcw, MessageCircle, Loader2, ChevronDown, ShieldCheck } from 'lucide-react';
import { getTeacherCourses, chatWithClassroomAssistant } from '../../services/teacherApi';
import { getTeacherSession } from '../../services/authService';
import '../../styles/FloatingClassroomChat.css';

const PROMPTS = ['Tóm tắt lớp học', 'Tình hình bài tập', 'Kết quả Quiz', 'Chủ đề nào cần ôn?', 'Giải thích React Hooks dễ hiểu', 'Soạn câu hỏi ôn tập'];
const PERIODS = [['week','Tuần này'],['last_week','Tuần trước'],['month','30 ngày gần đây'],['all','Toàn bộ dữ liệu']];
function MiniChart({ chart }) {
  const maximum = Math.max(1, ...chart.bars.flatMap(bar => [Number(bar.value), Number(bar.secondary || 0)]));
  return <figure className="classroom-chat-chart"><figcaption>{chart.title}</figcaption><div className="classroom-chart-key"><span><i/>{chart.legend[0]}</span>{chart.legend[1] && <span><i/>{chart.legend[1]}</span>}</div>{chart.bars.map((bar, index) => <div className="classroom-chart-row" key={index}><span title={bar.label}>{bar.label}</span><div><div className="classroom-chart-track"><i style={{width:`${bar.value / maximum * 100}%`}}/><b>{bar.value}</b></div>{bar.secondary !== undefined && <div className="classroom-chart-track secondary"><i style={{width:`${bar.secondary / maximum * 100}%`}}/><b>{bar.secondary}</b></div>}</div></div>)}<small>Đơn vị: {chart.unit}</small></figure>;
}
function ConversationText({ text }) {
  const inline = line => line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((piece, i) => piece.startsWith('**') ? <strong key={i}>{piece.slice(2, -2)}</strong> : piece.startsWith('`') ? <code key={i}>{piece.slice(1, -1)}</code> : piece);
  return <div className="classroom-conversation-text">{text.split(/(```[\s\S]*?```)/g).map((part, index) => part.startsWith('```') ? <pre key={index}><code>{part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}</code></pre> : <div key={index}>{part.split('\n').map((line, i) => /^#{1,6}\s/.test(line) ? <h4 key={i}>{inline(line.replace(/^#{1,6}\s/, ''))}</h4> : <div key={i}>{line ? inline(line) : <br/>}</div>)}</div>)}</div>;
}
function Answer({ answer }) {
  return <div className="classroom-chat-answer"><div className="classroom-answer-meta"><Sparkles size={13}/>{answer.provider === 'groq' ? 'Groq · AI hội thoại' : 'Số liệu trực tiếp từ hệ thống'}{answer.cached && <span>Đã lưu tạm</span>}</div>{answer.title && <h3>{answer.title}</h3>}{(!answer.message || answer.links?.length > 0) && <p className="classroom-answer-period">{answer.period.label}{answer.period.start ? ` · ${answer.period.start} đến trước ${answer.period.end}` : ''}</p>}
    {answer.message && <ConversationText text={answer.message}/>}{answer.facts.map((fact, index) => <p key={index}>{fact}</p>)}
    {answer.charts?.map((chart, index) => <MiniChart chart={chart} key={index}/>)}
    {answer.tables?.map((table, index) => <div className="classroom-chat-table" key={index}><strong>{table.title}</strong>{table.rows.length ? <div><table><thead><tr>{table.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div> : <p>Chưa có bản ghi điểm danh trong kỳ đã chọn.</p>}</div>)}
    {answer.insights?.length > 0 && <div className="classroom-ai-insights"><strong>Nhận xét từ AI</strong>{answer.insights.map((text, index) => <p key={index}>{text}</p>)}</div>}
    {answer.suggestions?.length > 0 && <div className="classroom-chat-suggestions"><strong>Gợi ý để thầy cô xem xét</strong><ul>{answer.suggestions.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
    {answer.links?.length > 0 && <div className="classroom-chat-links">{answer.links.map(link => <Link key={link.href} to={link.href}><span>{link.label}<small>{link.note}</small></span><ArrowUpRight size={16}/></Link>)}</div>}
    {answer.warnings?.length > 0 && <div className="classroom-chat-warnings">{answer.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
    {answer.generatedAt && <small className="classroom-chat-source">Đọc lúc {new Date(answer.generatedAt).toLocaleTimeString('vi-VN')} · {answer.source || 'LMS'}</small>}
  </div>;
}

export default function FloatingClassroomChat() {
  const location = useLocation();
  const teacherId = getTeacherSession()?.teacherId;
  const [open, setOpen] = useState(false), [courses, setCourses] = useState([]), [courseId, setCourseId] = useState('');
  const [period, setPeriod] = useState('week'), [text, setText] = useState(''), [messages, setMessages] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const conversationRef = useRef(null);
  const requestRef = useRef(null), sequence = useRef(0), bottomRef = useRef(null), inputRef = useRef(null), panelRef = useRef(null), launcherRef = useRef(null);

  useEffect(() => {
    if (!open || !teacherId || courses.length) return;
    let cancelled = false; setLoadingCourses(true); setError('');
    getTeacherCourses(teacherId).then(list => {
      if (cancelled) return;
      setCourses(list || []);
      const fromUrl = new URLSearchParams(location.search).get('courseId') || location.pathname.match(/\/(?:quan-ly-lop|quan-ly-bai-tap|cham-diem)\/(\d+)/)?.[1];
      const selected = (list || []).find(course => String(course.Moodle_Course_ID) === fromUrl || String(course.Course_Key) === fromUrl) || list?.[0];
      setCourseId(selected ? String(selected.Moodle_Course_ID) : '');
    }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoadingCourses(false); });
    return () => { cancelled = true; };
  }, [open, teacherId, retry]);
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('courseId') || location.pathname.match(/\/(?:quan-ly-lop|quan-ly-bai-tap|cham-diem)\/(\d+)/)?.[1];
    const found = courses.find(course => String(course.Moodle_Course_ID) === fromUrl || String(course.Course_Key) === fromUrl);
    if (found) setCourseId(String(found.Moodle_Course_ID));
  }, [location.pathname, location.search, courses]);
  useEffect(() => {
    conversationRef.current = null; sequence.current++; requestRef.current?.abort(); setBusy(false); setMessages([]); setError('');
  }, [courseId, period, teacherId]);
  useEffect(() => () => { requestRef.current?.abort(); }, []);
  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open, loadingCourses]);
  const close = () => { setOpen(false); launcherRef.current?.focus(); };
  const clear = () => { conversationRef.current = null; sequence.current++; requestRef.current?.abort(); setBusy(false); setMessages([]); setError(''); setText(''); inputRef.current?.focus(); };
  const ask = async prompt => {
    const question = String(prompt || text).trim();
    if (!question || !courseId || busy || question.length > 4000) return;
    const id = ++sequence.current;
    const controller = new AbortController(); requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 60000);
    setMessages(current => [...current.slice(-15), { role: 'user', text: question }]); setText(''); setError(''); setBusy(true);
    try {
      const answer = await chatWithClassroomAssistant(courseId, question, period, conversationRef.current, controller.signal);
      if (id === sequence.current) { conversationRef.current = answer.conversationId; setMessages(current => [...current, { role: 'assistant', answer }]); }
    } catch (e) {
      if (id === sequence.current) setError(e.name === 'AbortError' ? 'Yêu cầu quá thời gian chờ. Bạn thử lại sau nhé.' : e.message || 'Không thể kết nối trợ lý.');
    } finally { clearTimeout(timer); if (id === sequence.current) setBusy(false); }
  };
  const handleKeyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab') return;
    const elements = [...panelRef.current.querySelectorAll('button:not(:disabled), a[href], select:not(:disabled), textarea:not(:disabled)')];
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  if (!teacherId) return null;
  return <div className="classroom-chat-widget">
    {open && <section ref={panelRef} className="classroom-chat-panel" role="dialog" aria-label="Trợ lý phân tích lớp học" onKeyDown={handleKeyDown}>
      <header className="classroom-chat-header"><span className="classroom-chat-avatar"><Sparkles size={21}/></span><div><h2>Trợ lý lớp học</h2><p>Cùng thầy cô hiểu lớp học hơn</p></div><button type="button" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" onClick={clear}><RotateCcw size={16}/></button><button type="button" aria-label="Đóng trợ lý" onClick={close}><X size={19}/></button></header>
      <div className="classroom-chat-context"><label><span>Môn học</span><select aria-label="Môn học của trợ lý" disabled={loadingCourses || !courses.length} value={courseId} onChange={e => setCourseId(e.target.value)}>{!courses.length && <option>{loadingCourses ? 'Đang tải môn học…' : 'Chưa có môn được phân công'}</option>}{courses.map(course => <option key={course.Moodle_Course_ID} value={course.Moodle_Course_ID}>{course.Course_Code} · {course.Course_Name}</option>)}</select></label><label><span>Thời gian</span><select aria-label="Thời gian phân tích" value={period} onChange={e => setPeriod(e.target.value)}>{PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="classroom-chat-body" role="log" aria-label="Cuộc trò chuyện" aria-live="polite">
        {!messages.length && <div className="classroom-chat-welcome"><div><Sparkles size={27}/></div><h3>Thầy cô muốn xem điều gì?</h3><p>Hỏi tự nhiên về kiến thức, bài giảng hoặc dữ liệu lớp. Mình nhớ ngữ cảnh để cùng thầy cô trao đổi tiếp.</p><div className="classroom-chat-prompts">{PROMPTS.map(prompt => <button key={prompt} disabled={!courseId || busy} onClick={() => ask(prompt)}>{prompt}<ArrowUpRight size={14}/></button>)}</div><small><ShieldCheck size={13}/>Câu hỏi, ngữ cảnh chat và số liệu tổng hợp được gửi tới Groq. Không nhập dữ liệu cá nhân nhạy cảm.</small></div>}
        {messages.map((message, index) => message.role === 'user' ? <div className="classroom-chat-user" key={index}>{message.text}</div> : <Answer key={index} answer={message.answer}/>)}
        {busy && <div className="classroom-chat-thinking" role="status"><Loader2 size={16} className="classroom-chat-spin"/>AI đang suy nghĩ…</div>}
        {error && <div className="classroom-chat-error" role="alert"><p>{error}</p>{!courses.length && <button onClick={() => setRetry(n => n + 1)}>Tải lại môn học</button>}</div>}
        <div ref={bottomRef}/>
      </div>
      <footer className="classroom-chat-footer"><form onSubmit={event => { event.preventDefault(); ask(); }}><textarea ref={inputRef} rows={1} maxLength={4000} disabled={!courseId || busy} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(); } }} aria-label="Câu hỏi cho trợ lý" placeholder="Hỏi mình điều gì cũng được…"/><button type="submit" disabled={!text.trim() || !courseId || busy} aria-label="Gửi câu hỏi">{busy ? <Loader2 size={18} className="classroom-chat-spin"/> : <Send size={18}/>}</button></form><p>Kiểm tra số liệu trước khi quyết định · Đổi môn/kỳ bắt đầu cuộc trò chuyện mới</p></footer>
    </section>}
    <button ref={launcherRef} type="button" className={`classroom-chat-launcher ${open ? 'is-open' : ''}`} onClick={() => open ? close() : setOpen(true)} aria-label={open ? 'Thu gọn trợ lý lớp học' : 'Mở trợ lý lớp học'} aria-expanded={open}>{open ? <ChevronDown size={23}/> : <><MessageCircle size={22}/><span>Trợ lý AI</span><i/></>}</button>
  </div>;
}
