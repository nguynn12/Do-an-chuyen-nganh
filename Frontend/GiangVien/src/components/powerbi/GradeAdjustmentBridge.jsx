import {useEffect,useRef,useState} from 'react';
import {saveGradeAdjustment} from '../../services/teacherApi';
import {findGradeSlicers,GRADE_SLICERS,readGradeSliders,setGradeSlicer,queueGradeSwitch,verifyGradeContext} from '../../services/gradeSlicerBridge';
import {POWER_BI_PAGES_CONFIG} from '../../config/powerBiConfig';

export default function GradeAdjustmentBridge({report,courseId,courseKey,userKey,groups,scores,groupKey,onGroupChange,onSaved,disabled}) {
  const [itemId,setItemId]=useState('');
  const [status,setStatus]=useState('Mở báo cáo và đăng nhập Microsoft để kết nối thanh kéo.');
  const [error,setError]=useState('');
  const [live,setLive]=useState(null);
  const [retry,setRetry]=useState(0);
  const latest=useRef();
  latest.current={groups,scores,onSaved,onGroupChange};
  const group=groups.find(g=>g.key===groupKey);
  const item=group?.items.find(i=>i.id===itemId);
  const itemKey=item?.itemKey;
  useEffect(()=>{
    setItemId(group?.items.find(i=>i.sourceType==='EXTERNAL')?.id || group?.items[0]?.id || '');
  },[courseId,userKey,groupKey]); // Intentionally reset selection on context changes only.
  useEffect(()=>{
    if(!group?.items.some(i=>i.id===itemId)) setItemId(group?.items.find(i=>i.sourceType==='EXTERNAL')?.id || group?.items[0]?.id || '');
  },[group,itemId]);

  useEffect(()=>{
    setLive(null);setError('');
    if(!report || !itemKey || !courseId || !userKey || disabled) {
      setStatus(!itemKey ? 'Đầu điểm cần được lưu vào Database và có trong báo cáo trước khi mô phỏng.' : 'Đang chờ kết nối báo cáo.');
      return;
    }
    let cancelled=false,slicers,reading=false,saving=false,timer,interval,baseline='',pending=null;
    let groupVersion=latest.current.groups.find(g=>g.key===groupKey)?.version;
    const context={courseId,userKey,itemKey,groupKey};
    const key=v=>JSON.stringify([v.item,v.score,v.weight]);
    async function save(value) {
      if(cancelled || saving) return;
      saving=true;setStatus('Đang tự lưu vào Database…');
      try {
        await verifyGradeContext(report,courseKey,context.userKey);
        const current=await readGradeSliders(slicers);
        if(cancelled || key(current)!==key(value)) return;
        const result=await saveGradeAdjustment(context.courseId,context.userKey,context.itemKey,{score:value.score,weight:value.weight,groupVersion});
        groupVersion=result.groupVersion;
        // Notify with captured identity, even if navigation occurred while the request was in flight.
        latest.current.onSaved({...result,courseId:context.courseId,userKey:context.userKey});
        if(!cancelled) {setError('');setStatus('Đã tự lưu điểm và trọng số vào Database.');baseline=key(value);}
      } catch(e) {if(!cancelled){setError(e.message);setStatus('Chưa lưu được thay đổi.');}}
      finally {saving=false;}
    }
    async function read() {
      if(cancelled || !slicers || reading || saving) return;
      reading=true;
      try {
        await verifyGradeContext(report,courseKey,context.userKey);
        const value=await readGradeSliders(slicers);
        if(cancelled) return;
        if(value.item!==context.itemKey) {
          clearTimeout(timer);pending=null;
          const selectedGroup=latest.current.groups.find(g=>g.items.some(i=>i.itemKey===value.item));
          const selected=selectedGroup?.items.find(i=>i.itemKey===value.item);
          if(!selected) throw new Error('Đầu điểm trong Power BI không thuộc dữ liệu lớp hiện tại. Hãy chọn bằng tên trên Web.');
          // Switching Item_Key must initialize its saved values before enabling autosave.
          cancelled=true;
          latest.current.onGroupChange(selectedGroup.key);setItemId(selected.id);
          return;
        }
        setLive(value);
        const hash=key(value);
        if(hash===baseline) {clearTimeout(timer);pending=null;return;}
        if(pending!==hash) {
          pending=hash;clearTimeout(timer);setStatus('Có thay đổi; chuẩn bị tự lưu…');
          timer=setTimeout(()=>{pending=null;void save(value);},700);
        }
      } catch(e) {if(!cancelled){clearTimeout(timer);setError(e.message);setStatus('Tự lưu đang tạm dừng.');}}
      finally {reading=false;}
    }
    async function init() {
      setStatus('Đang chuyển đúng sinh viên và đầu điểm sang Power BI…');
      try {
        if(cancelled) return;
        await verifyGradeContext(report,courseKey,context.userKey);
        slicers=await findGradeSlicers(report,POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR.id);
        if(cancelled) return;
        await setGradeSlicer(slicers.item,GRADE_SLICERS.item,context.itemKey);
        if(cancelled) return;
        const current=latest.current.groups.find(g=>g.key===context.groupKey)?.items.find(i=>i.itemKey===context.itemKey);
        const score=latest.current.scores[current.id] ?? 0;
        await setGradeSlicer(slicers.score,GRADE_SLICERS.score,score);
        if(cancelled) return;
        await setGradeSlicer(slicers.weight,GRADE_SLICERS.weight,Number(current.weight));
        if(cancelled) return;
        const value=await readGradeSliders(slicers);
        if(cancelled) return;
        baseline=key(value);setLive(value);setError('');
        setStatus('Đã kết nối. Kéo Điểm điều chỉnh / TL điều chỉnh trong Power BI để tự lưu.');
        interval=setInterval(()=>void read(),1200);
        report.on('rendered',read);
      } catch(e) {if(!cancelled){setError(e.message);setStatus('Chưa kết nối được thanh kéo.');}}
    }
    void queueGradeSwitch(report,init);
    return ()=>{cancelled=true;clearTimeout(timer);clearInterval(interval);report.off('rendered',read);};
  },[report,courseId,courseKey,userKey,groupKey,itemKey,retry,disabled]);

  return <section className="grade-adjustment-bridge" aria-label="Điều chỉnh đầu điểm trên Power BI">
    <strong>Điều chỉnh đầu điểm trên Power BI · Tự lưu</strong>
    <div className="grade-adjustment-controls">
      <label>Nhóm điểm<select value={groupKey} disabled={disabled} onChange={e=>onGroupChange(e.target.value)}>{groups.map(g=><option key={g.key} value={g.key}>{g.name}</option>)}</select></label>
      <label>Đầu điểm<select value={itemId} disabled={disabled} onChange={e=>setItemId(e.target.value)}>{group?.items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      <button type="button" disabled={disabled || !report} onClick={()=>setRetry(n=>n+1)}>Kết nối lại</button>
    </div>
    <div role="status">{status}</div>
    {live && <div className="grade-adjustment-values">Điểm: <b>{live.score.toFixed(2)} / 10</b> · Trọng số trong nhóm: <b>{live.weight}%</b></div>}
    {error && <div role="alert" className="grade-adjustment-error">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>}
    <details className="grade-bridge-help"><summary>Cách sử dụng</summary><small>Giá trị thanh kéo tự lưu sau khi ngừng thay đổi. Xác nhận nhóm chỉ được mở khi đủ điểm và tổng trọng số nội bộ bằng 100%. Các thẻ điểm Power BI vẫn tính theo mô hình báo cáo đã xuất bản.</small></details>
  </section>;
}
