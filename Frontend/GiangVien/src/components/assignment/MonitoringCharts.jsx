import React from 'react';

const submittedColor='#179b8e',missingColor='#e7edf3';
export default function MonitoringCharts({model}) {
 const total=model.submitted+model.missing;
 const fraction=total?model.submitted/total:0;
 const circumference=2*Math.PI*70;
 const max=Math.max(1,...model.assignments.map(a=>a.total));
 const width=Math.max(560,model.assignments.length*52+70);
 const y=n=>195-n/max*155;
 const ticks=[...new Set([0,Math.ceil(max/4),Math.ceil(max/2),Math.ceil(max*3/4),max])];
 return <div className="monitor-stat-charts">
  <section className="monitor-stat-card monitor-donut-card"><div className="monitor-chart-heading"><span>01 / TỔNG QUAN</span><h2>Tình trạng nộp bài</h2><p>Tỷ trọng lượt nộp trong học phần</p></div>
   <div className="monitor-donut-display"><svg viewBox="0 0 200 200" role="img" aria-label={`${model.submitted} đã nộp, ${model.missing} chưa ghi nhận`}>
    <circle cx="100" cy="100" r="70" stroke={missingColor} strokeWidth="19" fill="none"/>
    {total>0 && <circle cx="100" cy="100" r="70" stroke={submittedColor} strokeWidth="19" fill="none" strokeDasharray={`${fraction*circumference} ${circumference}`} transform="rotate(-90 100 100)"><title>{model.submitted} lượt đã nộp ({(fraction*100).toFixed(1)}%)</title></circle>}
    <text x="100" y="99" textAnchor="middle" className="monitor-donut-number">{total>0?`${(fraction*100).toFixed(1)}%`:'—'}</text><text x="100" y="119" textAnchor="middle" className="monitor-donut-caption">đã ghi nhận nộp</text>
   </svg></div>
   <div className="monitor-donut-rows"><div><span><i style={{background:submittedColor}}/>Đã nộp</span><strong>{model.submitted}<small>{total?`${(fraction*100).toFixed(1)}%`:'—'}</small></strong></div><div><span><i style={{background:missingColor}}/>Chưa ghi nhận</span><strong>{model.missing}<small>{total?`${((1-fraction)*100).toFixed(1)}%`:'—'}</small></strong></div></div>
   <p className="monitor-chart-foot">{total} lượt đối chiếu theo sinh viên × bài tập.</p>
  </section>
  <section className="monitor-stat-card monitor-columns-card"><div className="monitor-chart-heading"><span>02 / SO SÁNH</span><h2>Tiến độ từng bài tập</h2><p>Số sinh viên đã nộp và chưa ghi nhận nộp theo bài</p></div>
   <div className="monitor-chart-legend"><span><i style={{background:submittedColor}}/>Đã nộp</span><span><i style={{background:missingColor}}/>Chưa ghi nhận</span></div>
   {!model.assignments.length?<div className="assign-empty-box">Chưa có bài tập để thống kê.</div>:<div className="monitor-column-scroll"><svg width="100%" style={{minWidth:width}} height="255" viewBox={`0 0 ${width} 255`} role="img" aria-label="Biểu đồ cột chồng tiến độ từng bài tập">
    {ticks.map(t=><g key={t}><line x1="38" x2={width-15} y1={y(t)} y2={y(t)} stroke="#edf1f5" strokeDasharray={t?'3 5':undefined}/><text x="27" y={y(t)+4} textAnchor="end" fontSize="10" fill="#8a99aa">{t}</text></g>)}
    {model.assignments.map((a,i)=>{const step=(width-65)/model.assignments.length,x=45+i*step,bw=Math.min(25,step*.55);return <g key={a.assignmentId} tabIndex="0" aria-label={`${a.activityName}: ${a.submitted} đã nộp, ${a.missing} chưa ghi nhận`}><title>{`Bài ${i+1}: ${a.activityName}\nĐã nộp: ${a.submitted}/${a.total}\nChưa ghi nhận: ${a.missing}`}</title>
     <rect x={x} y={y(a.total)} width={bw} height={Math.max(0,y(0)-y(a.total))} fill={missingColor} rx="4"/>
     <rect x={x} y={y(a.submitted)} width={bw} height={Math.max(0,y(0)-y(a.submitted))} fill={submittedColor} rx="3"/>
     {a.submitted>0 && <text x={x+bw/2} y={y(a.submitted)-7} textAnchor="middle" fontSize="10" fill="#147c73" fontWeight="600">{a.submitted}</text>}
     <text x={x+bw/2} y="218" textAnchor="middle" fontSize="10" fill="#6e7f93">Bài {i+1}</text>
    </g>;})}
   </svg></div>}
   <p className="monitor-chart-foot">Rê chuột lên cột để xem tên bài. Cuộn ngang để xem đủ các bài tập; số thứ tự khớp danh sách bên dưới.</p>
  </section>
 </div>;
}
