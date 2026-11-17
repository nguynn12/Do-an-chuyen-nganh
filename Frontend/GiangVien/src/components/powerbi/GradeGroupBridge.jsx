import {useEffect,useRef,useState} from 'react';
import {findGradeSlicers,GROUP_SLICERS,readGroupSliders,verifyGradeContext,queueGradeSwitch} from '../../services/gradeSlicerBridge';
import {POWER_BI_PAGES_CONFIG} from '../../config/powerBiConfig';

export default function GradeGroupBridge({report,courseId,courseKey,userKey,onChange,onReader,disabled}) {
  const latest=useRef();latest.current={onChange,onReader};
  const [value,setValue]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false,busy=false,slicers,interval,last='',currentRead;
    setValue(null);setError('');latest.current.onReader(null);
    if(!report || disabled || !userKey) return;
    function read() {
      if(cancelled || !slicers) return Promise.resolve(null);
      if(busy) return currentRead;
      busy=true;
      currentRead=(async()=>{
      try {
        await verifyGradeContext(report,courseKey,userKey);
        const next=await readGroupSliders(slicers);
        if(cancelled) return null;
        const snapshot={...next,courseId,userKey};
        setValue(next);setError('');latest.current.onReader(read);
        if(JSON.stringify(next)!==last) {last=JSON.stringify(next);latest.current.onChange(snapshot);}
        return snapshot;
      } catch(e) {if(!cancelled){setError(e.message);latest.current.onReader(null);}throw e;}
      finally {busy=false;}
      })();
      return currentRead;
    }
    async function init() {
      try {
        slicers=await findGradeSlicers(report,POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR.id,GROUP_SLICERS);
        if(cancelled) return;
        interval=setInterval(()=>void read().catch(()=>{}),1000);
        await read();
        if(cancelled) return;
        latest.current.onReader(read);
      } catch(e) {if(!cancelled)setError(e.message);}
    }
    void queueGradeSwitch(report,init);
    return ()=>{cancelled=true;clearInterval(interval);latest.current.onReader(null);};
  },[report,courseId,courseKey,userKey,disabled]);
  return <section className="grade-adjustment-bridge" aria-label="Điểm nhóm từ Power BI">
    <strong>Điểm Giữa kỳ / Cuối kỳ từ Power BI</strong>
    {value ? <div role="status">Giữa kỳ: <b>{value.midterm.toFixed(2)}</b> · Cuối kỳ: <b>{value.final.toFixed(2)}</b> · Trọng số: <b>{value.chuyen_can}% – {value.giua_ky}% – {value.cuoi_ky}%</b></div> : <p>Đang chờ đọc thanh kéo của báo cáo.</p>}
    <details className="grade-bridge-help"><summary>Cách sử dụng</summary><small>Điểm của nhóm có một đầu điểm sẽ cập nhật xuống bảng nhập. Bấm “Lưu và xác nhận điểm nhóm” để lưu Database. Nhóm có nhiều đầu điểm cần chỉnh từng đầu điểm bằng bộ chọn phía trên.</small></details>
    {error && <div role="alert" className="grade-adjustment-error">{error}</div>}
  </section>;
}
