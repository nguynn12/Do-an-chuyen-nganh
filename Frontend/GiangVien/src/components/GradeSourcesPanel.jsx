import {useEffect,useRef,useState} from 'react';
import {getLmsGradeItems,syncLmsGrades,linkLmsGradeItem,createIngestGradeItem,downloadGradeTemplate,importGradeFile} from '../services/teacherApi';

export default function GradeSourcesPanel({courseId,group,onRefresh,disabled,hasUnsavedConfig}) {
  const [items,setItems]=useState([]),[target,setTarget]=useState(''),[lmsId,setLmsId]=useState('');
  const [status,setStatus]=useState('Đang kết nối nguồn điểm…'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [file,setFile]=useState(null),[preview,setPreview]=useState(null),[name,setName]=useState('');
  const [fileReset,setFileReset]=useState(0);
  const latest=useRef();latest.current={onRefresh,disabled};
  const syncTick=useRef(null);
  const revision=useRef(null),operation=useRef(0),courseRef=useRef(courseId);courseRef.current=courseId;
  const persisted=group.items.filter(i=>i.itemKey),item=persisted.find(i=>String(i.itemKey)===target);
  useEffect(()=>{operation.current++;setBusy(false);setTarget('');setFile(null);setPreview(null);},[courseId,group.key]);
  useEffect(()=>{if(!persisted.some(i=>String(i.itemKey)===target))setTarget(persisted.length?String((persisted.find(i=>i.sourceType==='EXTERNAL') || persisted.find(i=>i.sourceType==='LMS_GRADE') || persisted[0]).itemKey):'');},[group.items,target]);
  useEffect(()=>{
    let stopped=false,running=false;revision.current=null;operation.current++;
    setItems([]);setLmsId('');setError('');setBusy(false);setFile(null);setPreview(null);
    async function tick() {
      if(stopped || running || !courseId || latest.current.disabled) return;
      running=true;
      try {
        const state=await syncLmsGrades(courseId);
        if(stopped) return;
        setError('');setStatus(`LMS → MySQL đang hoạt động · kiểm tra ${new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}${state.preservedOverrides?' · giữ điểm đã chỉnh tay':''}`);
        if(revision.current===null || revision.current!==state.revision) latest.current.onRefresh({courseId});
        revision.current=state.revision;
      } catch(e) {if(!stopped){setError(e.message);setStatus('Chưa đồng bộ được LMS.');}}
      finally {running=false;}
    }
    if(courseId) getLmsGradeItems(courseId).then(data=>{if(!stopped)setItems(data.items);}).catch(e=>{if(!stopped)setError(e.message);});
    syncTick.current=tick;void tick();const timer=setInterval(()=>void tick(),15000);
    return ()=>{stopped=true;clearInterval(timer);if(syncTick.current===tick)syncTick.current=null;};
  },[courseId]);
  useEffect(()=>{if(!disabled)void syncTick.current?.();},[disabled,courseId]);

  async function run(action) {
    const current=++operation.current,course=courseId;setBusy(true);setError('');
    try {await action(()=>courseRef.current===course && current===operation.current);}
    catch(e) {if(courseRef.current===course && current===operation.current)setError(e.message);}
    finally {if(current===operation.current)setBusy(false);}
  }
  const locked=disabled || busy;
  async function download() {
    const blob=await downloadGradeTemplate(courseId,Number(target));
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='mau_nhap_diem.xlsx';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <details className="grade-sources-panel">
    <summary><strong>Nguồn điểm LMS & nhập Excel</strong><span>{status}</span></summary>
    <div className="grade-sources-body">
      <p>LMS → MySQL → bảng điểm. Backend đồng bộ mỗi 30 giây; trang đang mở kiểm tra mỗi 15 giây. Điểm chỉnh tay/Excel được giữ riêng; điểm mới cần xác nhận lại nhóm.</p>
      <label>Đầu điểm nhận dữ liệu<select value={target} disabled={locked} onChange={e=>{setTarget(e.target.value);setPreview(null);setFile(null);}}>
        {!persisted.length && <option value="">Chưa có đầu điểm đã lưu</option>}
        {persisted.map(i=><option key={i.itemKey} value={i.itemKey}>{i.name}{i.sourceType==='LMS_GRADE'?' · LMS':''}</option>)}
      </select></label>
      <div className="grade-sources-columns">
        <section><h4>Kết nối bài kiểm tra trên LMS</h4>
          <label>Bài kiểm tra / bài tập của môn<select value={lmsId} disabled={locked} onChange={e=>setLmsId(e.target.value)}><option value="">Chọn bài trên LMS</option>{items.map(i=><option key={i.id} value={i.id}>{i.name || `Đầu điểm ${i.id}`} · thang {Number(i.maxScore)} · {i.gradedCount} điểm</option>)}</select></label>
          <p>Liên kết áp dụng cả lớp và chuyển đầu điểm đang chọn sang dùng điểm LMS, bỏ bản điều chỉnh cũ của đầu điểm này. Dữ liệu điểm gốc LMS được giữ nguyên.</p>
          {item?.lmsGradeItemId && <small>Đang liên kết bài LMS #{item.lmsGradeItemId}.</small>}
          <button type="button" disabled={locked || !target || !lmsId || hasUnsavedConfig} onClick={()=>run(async active=>{
            await linkLmsGradeItem(courseId,Number(target),Number(lmsId));if(!active())return;
            setStatus('Đã liên kết và lấy điểm LMS vào MySQL.');latest.current.onRefresh({courseId,force:true,itemKey:Number(target)});
          })}>Liên kết và dùng điểm LMS</button>
          <button type="button" disabled={locked} onClick={()=>run(async active=>{const state=await syncLmsGrades(courseId);if(!active())return;revision.current=state.revision;setStatus(`Đã kiểm tra LMS · ${state.changed} bản ghi điểm mới/cập nhật.`);latest.current.onRefresh({courseId});})}>Đồng bộ ngay</button>
        </section>
        <section><h4>Nhập điểm Excel vào SQL</h4>
          <p>Dùng file .xlsx/.csv, cột <b>MSSV, Diem, DiemToiDa</b> (mặc định thang 10). Tối đa 1.000 dòng / 2MB. Điểm Excel là điểm điều chỉnh của đầu điểm đang chọn, không ghi đè bảng nguồn Moodle.</p>
          <button type="button" disabled={locked || !target} onClick={()=>run(download)}>Tải mẫu Excel của lớp</button>
          <label>File điểm<input key={`${courseId}:${group.key}:${target}:${fileReset}`} type="file" accept=".xlsx,.csv" disabled={locked || !target || hasUnsavedConfig} onChange={e=>{setFile(e.target.files?.[0] || null);setPreview(null);}} /></label>
          {file && <button type="button" disabled={locked} onClick={()=>{setFile(null);setPreview(null);setFileReset(n=>n+1);}}>Bỏ file</button>}
          <button type="button" disabled={locked || !file || !target || hasUnsavedConfig} onClick={()=>run(async active=>{const result=await importGradeFile(courseId,Number(target),file,'preview');if(active())setPreview(result);})}>Kiểm tra & xem trước</button>
          {preview && <div className="grade-import-preview">
            <strong>{preview.rows.length} dòng hợp lệ · {preview.errors.length} lỗi · {preview.skipped} dòng trống bỏ qua</strong>
            {!!preview.errors.length && <ul>{preview.errors.slice(0,15).map((e,index)=><li key={index}>Dòng {e.row}: {e.message}</li>)}</ul>}
            {!!preview.rows.length && <div className="table-responsive-box"><table className="dlu-table"><thead><tr><th>MSSV</th><th>Họ tên</th><th>Điểm / 10</th></tr></thead><tbody>{preview.rows.slice(0,15).map(r=><tr key={r.userKey}><td>{r.username}</td><td>{r.name}</td><td>{r.score10.toFixed(2)}</td></tr>)}</tbody></table></div>}
            <p>Bấm nhập để ghi toàn bộ điểm hợp lệ vào MySQL và hủy xác nhận nhóm/tổng kết liên quan. File có lỗi sẽ không được ghi.</p>
            <button type="button" disabled={locked || !!preview.errors.length || !preview.rows.length || hasUnsavedConfig} onClick={()=>run(async active=>{const result=await importGradeFile(courseId,Number(target),file,'commit',preview.digest);if(!active())return;setPreview(null);setStatus(`Đã ghi ${result.imported} điểm Excel vào MySQL.`);latest.current.onRefresh({courseId,force:true,itemKey:Number(target)});})}>Nhập {preview.rows.length} điểm vào SQL</button>
          </div>}
        </section>
      </div>
      <div className="grade-sources-create"><label>Đầu điểm mới nhận LMS / Excel<input value={name} placeholder="Ví dụ: Kiểm tra giữa kỳ 2" maxLength={255} disabled={locked} onChange={e=>setName(e.target.value)} /></label><button type="button" disabled={locked || !name.trim() || hasUnsavedConfig} onClick={()=>run(async active=>{await createIngestGradeItem(courseId,group.key,name.trim());if(!active())return;setName('');setStatus('Đã tạo đầu điểm trong SQL với trọng số 0%; hãy cấu hình trọng số sau khi nhận dữ liệu.');latest.current.onRefresh({courseId,force:true,itemKey:Number(target)});})}>Tạo đầu điểm trong SQL</button></div>
      {hasUnsavedConfig && <p className="grade-source-error">Cấu hình nhóm đang có thay đổi chưa lưu. Lưu nhóm trước khi liên kết hoặc nhập Excel.</p>}
      {error && <div role="alert" className="grade-source-error">{error}</div>}
    </div>
  </details>;
}
