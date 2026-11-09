import React,{useEffect,useState} from 'react';
import {useParams,useSearchParams,useNavigate,useLocation} from 'react-router-dom';
import {BookOpen,ClipboardCheck,BarChart3,GraduationCap,ExternalLink,LayoutDashboard,Users} from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AssignmentMonitoring from '../components/assignment/AssignmentMonitoring';
import AssignmentPowerBITab from '../components/assignment/AssignmentPowerBITab';
import {getTeacher,getTeacherCourses} from '../services/teacherApi';
import {getTeacherSession} from '../services/authService';
import '../styles/AssignmentManagement.css';
const TABS=[['overview','Tổng quan',LayoutDashboard],['assignments','Danh sách bài tập',BookOpen],['submissions','Theo dõi bài nộp',Users],['analytics','Thống kê',BarChart3]];
export default function AssignmentManagement(){
 const {courseId:paramCourseId}=useParams();const [searchParams,setSearchParams]=useSearchParams();const navigate=useNavigate();const location=useLocation();
 const requested=searchParams.get('tab') || (location.pathname==='/bai-cho-cham'?'submissions':'overview');
 const activeTab=requested==='grading'?'submissions':TABS.some(([key])=>key===requested)?requested:'overview';
 const teacherId=getTeacherSession()?.teacherId;
 const [teacher,setTeacher]=useState(null),[courses,setCourses]=useState([]),[selectedCourse,setSelectedCourse]=useState(null),[cohort,setCohort]=useState('ALL'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;setLoading(true);setError('');
  (async()=>{try{
   if(!teacherId)throw new Error('Phiên đăng nhập giảng viên không hợp lệ. Vui lòng đăng nhập lại.');
   const [info,list]=await Promise.all([getTeacher(teacherId),getTeacherCourses(teacherId)]);if(cancelled)return;
   const items=Array.isArray(list)?list:[];const chosen=paramCourseId?items.find(c=>String(c.Moodle_Course_ID)===paramCourseId):items[0];
   if(!chosen)throw new Error(paramCourseId?'Môn học trên đường dẫn không có trong danh sách được phân quyền.':'Chưa có môn học được phân công.');
   setTeacher({id:info.Moodle_User_ID,userKey:info.User_Key,username:info.Username,name:info.Full_Name,fullName:info.Full_Name,email:info.Email,role:info.Primary_Role,initials:'GV'});setCourses(items);setSelectedCourse(chosen);
  }catch(e){if(!cancelled)setError(e.message);}finally{if(!cancelled)setLoading(false);}})();
  return()=>{cancelled=true;};
 },[teacherId,paramCourseId]);
 if(loading)return <div className="assign-page-loading"><div className="assign-spinner-large"/><strong>Đang tải theo dõi bài tập…</strong></div>;
 if(error || !selectedCourse)return <div className="assign-page-error"><h2>Không tải được môn học</h2><p>{error}</p><button className="assign-btn assign-btn-primary" onClick={()=>navigate('/khoa-hoc')}>Về danh sách môn học</button></div>;
 return <div className="app assignment-monitor-page"><Header teacher={teacher}/><Sidebar/><main className="assignment-management-layout"><div className="assignment-page-container">
  <section className="assignment-hero-card"><div className="hero-content-group"><div className="hero-badge-icon"><ClipboardCheck size={28}/></div><div className="hero-titles"><div className="hero-breadcrumbs"><BookOpen size={12}/><span>Quản lý giảng dạy</span><span>/</span><strong>Theo dõi bài tập</strong></div><span className="monitor-hero-kicker">DLU LMS ANALYTICS</span><h1>Theo dõi bài tập</h1><p>Nắm tiến độ bài nộp, tình trạng trễ hạn và điểm ghi nhận từ LMS trong một nơi.</p></div></div>
   <div className="hero-selectors-card"><div className="selector-item"><label htmlFor="monitor-course">Môn học</label><div className="selector-select-wrap"><BookOpen size={16}/><select id="monitor-course" value={selectedCourse.Moodle_Course_ID} onChange={e=>navigate(`/quan-ly-bai-tap/${e.target.value}?tab=${activeTab}`)}>{courses.map(c=><option key={c.Moodle_Course_ID} value={c.Moodle_Course_ID}>{c.Course_Code} — {c.Course_Name}</option>)}</select></div></div>
    <div className="selector-item"><label htmlFor="monitor-cohort">Khóa sinh viên</label><div className="selector-select-wrap"><GraduationCap size={16}/><select id="monitor-cohort" value={cohort} onChange={e=>setCohort(e.target.value)}><option value="ALL">Tất cả khóa</option><option value="K47">Khóa K47</option><option value="K46">Khóa K46</option><option value="K45">Khóa K45</option></select></div></div>
    <a className="assign-btn assign-btn-primary monitor-lms-link" href="https://lms.dlu.edu.vn/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Mở LMS DLU</a>
   </div>
  </section>
  <div className="monitor-readonly-note"><ClipboardCheck size={17}/><span>Trang theo dõi chỉ đọc dữ liệu. Giảng viên giao bài, chấm và công bố điểm trên LMS DLU.</span></div>
  <nav className="assign-tabs-nav" aria-label="Theo dõi bài tập">{TABS.map(([key,label,Icon])=><button type="button" key={key} className={`assign-tab-btn ${activeTab===key?'active':''}`} aria-current={activeTab===key?'page':undefined} onClick={()=>setSearchParams({tab:key})}><Icon size={17}/>{label}</button>)}</nav>
  <div className="assign-panel-wrapper">{activeTab==='analytics'?<AssignmentPowerBITab selectedCourse={selectedCourse} cohort={cohort}/>:<AssignmentMonitoring teacherId={teacherId} selectedCourse={selectedCourse} cohort={cohort} view={activeTab}/>}</div>
 </div></main></div>;
}
