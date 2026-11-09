import React,{useEffect,useMemo,useState} from 'react';
import {BookOpen,Users,ClipboardCheck,Clock3,ExternalLink,RefreshCw,Search,X,Eye,AlertCircle} from 'lucide-react';
import {getAssignmentMonitoringApi} from '../../services/teacherApi';
import {buildMonitoringView,submissionTiming,hasLmsGrade} from './assignmentMonitoringUtils';
import MonitoringCharts from './MonitoringCharts';

const LMS='https://lms.dlu.edu.vn/';
const date=epoch=>Number(epoch)>0?new Date(Number(epoch)*1000).toLocaleString('vi-VN'):'Không đặt hạn';
const timingText={missing:'Chưa ghi nhận nộp',late:'Nộp trễ',ontime:'Đúng hạn',unknown:'Không xác định hạn'};
export default function AssignmentMonitoring({teacherId,selectedCourse,cohort='ALL',view='overview'}) {
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const [search,setSearch]=useState(''),[assignmentId,setAssignmentId]=useState('ALL'),[status,setStatus]=useState('ALL'),[gradeFilter,setGradeFilter]=useState('ALL'),[page,setPage]=useState(1),[detail,setDetail]=useState(null);
 const courseId=selectedCourse?.Moodle_Course_ID;
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setData(null);setDetail(null);
   getAssignmentMonitoringApi(teacherId,courseId,controller.signal).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
 },[teacherId,courseId,reload]);
 useEffect(()=>{setAssignmentId('ALL');setSearch('');setStatus('ALL');setGradeFilter('ALL');},[courseId]);
 useEffect(()=>{setPage(1);setDetail(null);},[search,assignmentId,status,gradeFilter,cohort,view]);
 const model=useMemo(()=>buildMonitoringView(data || {},cohort),[data,cohort]);
 const rows=useMemo(()=>{
   const assignment=model.assignments.find(a=>String(a.assignmentId)===assignmentId);
   const records=assignment?model.students.map(student=>({...student,...model.submissions.find(s=>String(s.studentId)===String(student.studentId) && String(s.assignmentId)===assignmentId),assignmentId:assignment.assignmentId,activityName:assignment.activityName})):model.submissions.filter(s=>s.submissionStatus==='submitted');
   const term=search.trim().toLocaleLowerCase('vi-VN');
   return records.map(row=>({...row,assignment:model.assignments.find(a=>String(a.assignmentId)===String(row.assignmentId))})).filter(row=>{
    const timing=submissionTiming(row,row.assignment || {});
    return (!term || `${row.studentName} ${row.studentUsername} ${row.activityName}`.toLocaleLowerCase('vi-VN').includes(term)) && (status==='ALL' || timing===status) && (gradeFilter==='ALL' || (gradeFilter==='graded'?hasLmsGrade(row):!hasLmsGrade(row)));
   });
 },[model,assignmentId,search,status,gradeFilter]);
 const pages=Math.max(1,Math.ceil(rows.length/25)),currentPage=Math.min(page,pages);
 if(loading)return <div className="assign-loading-box"><div className="assign-spinner"/><span>Đang đọc dữ liệu bài tập từ nguồn LMS…</span></div>;
 if(error)return <div className="assign-error-box" role="alert"><AlertCircle size={18}/><span>{error}</span><button className="assign-btn assign-btn-outline" onClick={()=>setReload(n=>n+1)}>Thử lại</button></div>;
 return <div className={`assignment-monitor-content monitor-view-${view}`}>
   <div className="monitor-source-strip"><span>Dữ liệu nguồn LMS · Đọc lúc {data?.readAt?new Date(data.readAt).toLocaleTimeString('vi-VN'):'—'}</span><button className="assign-btn assign-btn-outline btn-sm" onClick={()=>setReload(n=>n+1)}><RefreshCw size={14}/>Tải lại dữ liệu</button></div>
   <div className="monitor-context-chips"><span><BookOpen size={14}/><strong>{model.assignments.length}</strong> bài tập</span><span><Users size={14}/><strong>{model.students.length}</strong> sinh viên ghi danh</span><span><ClipboardCheck size={14}/><strong>{model.graded}</strong> lượt đã có điểm</span><span><Clock3 size={14}/><strong>{model.late}</strong> lượt nộp trễ</span></div>
   {(view==='overview' || view==='analytics') && <MonitoringCharts model={model}/>}
   {(view==='overview' || view==='analytics') && <section className="monitor-panel monitor-progress-panel"><h2>{view==='analytics'?'Thống kê tiến độ nộp bài':'Tiến độ bài tập trong môn học'}</h2><p>Lượt nộp tính theo từng sinh viên và từng bài tập trong khóa đang chọn.</p>
    <div className="monitor-summary-pills"><span>{model.assignments.length} bài tập đang theo dõi</span><span>Chưa có điểm ở lượt đã nộp: <strong>{model.submitted-model.graded}</strong></span></div>
    {!model.assignments.length?<div className="assign-empty-box">Chưa có bài tập trong dữ liệu nguồn của môn này.</div>:model.assignments.map((a,index)=><div className="monitor-progress-row" key={a.assignmentId}><span className="monitor-row-index">{String(index+1).padStart(2,'0')}</span><div><strong>{a.activityName}</strong><small>Hạn nộp: {date(a.dueTime)}</small></div><div><div className="monitor-progress-track"><span style={{width:`${Math.min(100,a.rate || 0)}%`}}/></div><small>{a.submitted}/{a.total} sinh viên đã nộp{a.rate!==null?` · ${a.rate.toFixed(0)}%`:''}</small></div></div>)}
   </section>}
   {view==='assignments' && <section className="monitor-panel"><h2>Danh sách bài tập từ LMS</h2><div className="monitor-table-scroll"><table className="assign-table"><thead><tr><th>Bài tập</th><th>Hạn nộp</th><th>Đã nộp</th><th>Chưa ghi nhận</th><th>Nộp trễ</th><th>Đã có điểm</th></tr></thead><tbody>{model.assignments.map(a=><tr key={a.assignmentId}><td><strong>{a.activityName}</strong></td><td>{date(a.dueTime)}</td><td>{a.submitted}/{a.total}</td><td>{a.missing}</td><td>{a.late}</td><td>{a.graded}</td></tr>)}</tbody></table></div>{!model.assignments.length && <p>Chưa có bài tập trong dữ liệu nguồn.</p>}</section>}
   {view==='submissions' && <section className="monitor-panel"><h2>Theo dõi bài nộp & điểm từ LMS</h2>
    <div className="monitor-filter-grid"><label className="monitor-search"><span>Tìm kiếm</span><div><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên, mã sinh viên hoặc bài tập…"/></div></label>
     <label>Bài tập<select value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);setStatus("ALL");}}><option value="ALL">Tất cả bài đã nộp</option>{model.assignments.map(a=><option key={a.assignmentId} value={a.assignmentId}>{a.activityName}</option>)}</select></label>
     <label>Tình trạng<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Tất cả</option><option value="ontime">Đúng hạn</option><option value="late">Nộp trễ</option><option value="unknown">Không xác định hạn</option>{assignmentId!=='ALL' && <option value="missing">Chưa ghi nhận nộp</option>}</select></label>
     <label>Điểm LMS<select value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)}><option value="ALL">Tất cả</option><option value="graded">Đã có điểm</option><option value="ungraded">Chưa có điểm</option></select></label>
    </div><p className="monitor-help">Chọn một bài tập cụ thể để xem cả sinh viên chưa ghi nhận bài nộp.</p>
    <div className="monitor-table-scroll"><table className="assign-table"><thead><tr><th>Sinh viên</th><th>Bài tập</th><th>Thời điểm nộp</th><th>Tình trạng</th><th>Điểm LMS</th><th>Chi tiết</th></tr></thead><tbody>{rows.slice((currentPage-1)*25,currentPage*25).map(row=><tr key={`${row.assignmentId}:${row.studentId}`}><td><strong>{row.studentName}</strong><small className="monitor-block">{row.studentUsername}</small></td><td>{row.activityName}</td><td>{row.submissionStatus==='submitted'?date(row.submitModified || row.submitTime):'—'}</td><td><span className={`monitor-status ${submissionTiming(row,row.assignment || {})}`}>{timingText[submissionTiming(row,row.assignment || {})]}</span></td><td>{hasLmsGrade(row)?`${Number(row.grade)} / ${row.maxGrade || row.assignment?.maxGrade || 10}`:'Chưa có điểm'}</td><td><button className="assign-btn assign-btn-outline btn-sm" onClick={()=>setDetail(row)}><Eye size={14}/>Xem</button></td></tr>)}</tbody></table></div>
    {!rows.length && <div className="assign-empty-box">Không có dữ liệu phù hợp bộ lọc.</div>}
    <div className="monitor-pagination"><span>{rows.length} kết quả · Trang {currentPage}/{pages}</span><div><button disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>Trước</button><button disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}>Sau</button></div></div>
   </section>}
   <p className="monitor-footnote">Dữ liệu đọc từ bản nguồn Moodle đang đồng bộ tại hệ thống này; nút tải lại không chạy ETL. “Chưa ghi nhận nộp” đối chiếu danh sách ghi danh, chưa xét miễn nộp hoặc bài nhóm. Giao bài và cập nhật điểm thực hiện trên LMS.</p>
   {detail && <div className="assign-modal-overlay"><section className="monitor-detail" role="dialog" aria-modal="true" aria-label="Chi tiết bài nộp"><button className="monitor-close" aria-label="Đóng" onClick={()=>setDetail(null)}><X size={18}/></button><h2>{detail.activityName}</h2><p>{detail.studentName} · {detail.studentUsername}</p><dl><dt>Thời điểm nộp</dt><dd>{detail.submissionStatus==='submitted'?date(detail.submitModified || detail.submitTime):'Chưa ghi nhận'}</dd><dt>Hạn nộp</dt><dd>{date(detail.assignment?.dueTime)}</dd><dt>Điểm ghi nhận trên LMS</dt><dd>{hasLmsGrade(detail)?Number(detail.grade):'Chưa có điểm'}</dd><dt>Phản hồi từ LMS</dt><dd className="monitor-feedback">{detail.feedback?String(detail.feedback).replace(/<[^>]*>/g,' '):'Chưa có phản hồi'}</dd></dl><a className="assign-btn assign-btn-primary" href={LMS} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Mở LMS DLU</a><p className="monitor-help">Mở trang LMS chính thức; tìm môn và bài tương ứng sau khi đăng nhập.</p></section></div>}
 </div>;
}
