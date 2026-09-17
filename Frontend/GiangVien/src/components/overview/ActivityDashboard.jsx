import { BarChart3, Folder, Headphones, BookOpen, FileText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const points = [20, 21, 43, 52, 62, 42, 60];
const dates = ["10/09", "11/09", "12/09", "13/09", "14/09", "15/09", "16/09"];

function ActivityDashboard({ stats }) {
  const navigate = useNavigate();
  const total = stats?.totalStudents || 126;
  const good = Math.round(total * .57);
  const watch = Math.round(total * .30);
  const risk = Math.max(0, total - good - watch);
  const polyline = points.map((v,i) => `${8 + i * 14},${88-v}`).join(" ");

  return (
    <section className="activity-dashboard">
      <div className="activity-card activity-chart-card">
        <div className="activity-heading"><span className="activity-icon"><BarChart3 size={19}/></span><strong>Thống kê hoạt động <em>(7 ngày qua)</em></strong><select defaultValue="access"><option value="access">Lượt truy cập</option></select></div>
        <div className="line-chart-wrap">
          <svg viewBox="0 0 100 76" preserveAspectRatio="none" aria-label="Biểu đồ lượt truy cập 7 ngày">
            {[18,38,58].map(y => <line key={y} x1="8" x2="94" y1={y} y2={y} className="grid-line"/>)}
            <polygon points={`8,70 ${polyline} 92,70`} className="chart-area"/>
            <polyline points={polyline} className="chart-line"/>
            {points.map((v,i)=><circle key={i} cx={8+i*14} cy={88-v} r="1.4" className="chart-dot"/>)}
          </svg>
          <div className="chart-dates">{dates.map(d=><span key={d}>{d}</span>)}</div>
        </div>
      </div>

      <div className="activity-card student-activity-card">
        <div className="activity-heading"><span className="activity-icon"><Users size={19}/></span><strong>Tỷ lệ hoạt động sinh viên</strong></div>
        <div className="donut-layout">
          <div className="donut" style={{background:`conic-gradient(#2f8b45 0 57%, #f2b632 57% 87%, #ef4d45 87% 100%)`}}><div className="donut-hole"><b>{total}</b><span>Sinh viên</span></div></div>
          <div className="donut-legend">
            <div><i className="good"></i><span>Hoạt động tốt</span><b>{good} (57%)</b></div>
            <div><i className="watch"></i><span>Cần theo dõi</span><b>{watch} (30%)</b></div>
            <div><i className="risk"></i><span>Nguy cơ rủi ro</span><b>{risk} (13%)</b></div>
          </div>
        </div>
      </div>

      <div className="activity-card resources-card">
        <div className="activity-heading"><span className="activity-icon"><Folder size={19}/></span><strong>Tài nguyên nhanh</strong></div>
        <div className="resource-grid">
          <button type="button" onClick={()=>navigate('/phan-tich')}><FileText size={25}/><span>Ngân hàng đề thi</span></button>
          <button type="button" onClick={()=>navigate('/phan-tich')}><FileText size={25}/><span>Biểu mẫu</span></button>
          <button type="button" onClick={()=>navigate('/ho-tro')}><BookOpen size={25}/><span>Hướng dẫn sử dụng</span></button>
          <button type="button" onClick={()=>navigate('/ho-tro')}><Headphones size={25}/><span>Liên hệ hỗ trợ</span></button>
        </div>
      </div>
    </section>
  );
}
export default ActivityDashboard;
