import { BarChart3, Folder, Headphones, BookOpen, FileText, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ActivityDashboard({ analytics }) {
  const navigate = useNavigate();
  const daily = Array.from({length:7}, (_, index) => {
    const day = new Date(); day.setDate(day.getDate() - 6 + index);
    const date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    return {date, label:day.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}),
      hours:Number(analytics?.daily?.find(row => row.date === date)?.hours || 0)};
  });
  const max = Math.max(1, ...daily.map(row => row.hours));
  const points = daily.map((row,index) => `${8+index*14},${66-row.hours/max*48}`).join(' ');
  const total = Number(analytics?.totalStudents || 0);
  const active = Math.min(total, Number(analytics?.activeStudents || 0));
  const percent = total ? Math.round(active / total * 100) : 0;
  return <section className="activity-dashboard">
    <div className="activity-card activity-chart-card">
      <div className="activity-heading"><BarChart3 size={19}/><strong>Thời lượng học <em>(7 ngày qua)</em></strong></div>
      {analytics?.unavailable ? <p role="status">Chưa tải được dữ liệu hoạt động.</p> : <div className="line-chart-wrap">
        <svg viewBox="0 0 100 76" preserveAspectRatio="none" aria-label="Biểu đồ thời lượng học 7 ngày">
          {[18,42,66].map(y => <line key={y} x1="8" x2="92" y1={y} y2={y} className="grid-line"/>)}
          <polyline points={points} className="chart-line"/>
          {daily.map((row,index) => <circle key={row.date} cx={8+index*14} cy={66-row.hours/max*48} r="1.4" className="chart-dot"><title>{row.label}: {row.hours} giờ</title></circle>)}
        </svg>
        <div className="chart-dates">{daily.map(row => <span key={row.date}>{row.label}</span>)}</div>
        <small>Tổng: {daily.reduce((sum,row) => sum+row.hours,0).toFixed(2)} giờ · Dữ liệu Data Warehouse</small>
      </div>}
    </div>
    <div className="activity-card student-activity-card">
      <div className="activity-heading"><Users size={19}/><strong>Sinh viên có hoạt động trong 7 ngày</strong></div>
      {analytics?.unavailable ? <p>Chưa có dữ liệu.</p> : <div className="donut-layout">
        <div className="donut" style={{background:`conic-gradient(#2f8b45 0 ${percent}%, #d8ded9 ${percent}% 100%)`}}><div className="donut-hole"><b>{total}</b><span>Sinh viên</span></div></div>
        <div className="donut-legend"><div><i className="good"/><span>Có ghi nhận hoạt động</span><b>{active} ({percent}%)</b></div>
          <div><i className="inactive"/><span>Chưa ghi nhận hoạt động</span><b>{total-active}</b></div></div>
      </div>}
    </div>
    <div className="activity-card resources-card">
      <div className="activity-heading"><Folder size={19}/><strong>Tài nguyên nhanh</strong></div>
      <div className="resource-grid">
        <button onClick={()=>navigate('/quan-ly-bai-tap')}><FileText size={25}/><span>Theo dõi bài tập</span></button>
        <button onClick={()=>navigate('/phan-tich')}><BarChart3 size={25}/><span>Phân tích học tập</span></button>
        <button onClick={()=>navigate('/ho-tro')}><BookOpen size={25}/><span>Hướng dẫn sử dụng</span></button>
        <button onClick={()=>navigate('/ho-tro')}><Headphones size={25}/><span>Liên hệ hỗ trợ</span></button>
      </div>
    </div>
  </section>;
}
