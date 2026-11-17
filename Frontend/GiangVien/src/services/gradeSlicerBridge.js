// Targets verified against the published page 08 PBIX (2026-11-04).
export const GRADE_SLICERS = {
  item: {id:'2e443b80c5730e805dc7',table:'Đầu điểm điều chỉnh động',column:'Item_Key'},
  score: {id:'45cae1156661823056bb',table:'Điểm điều chỉnh',column:'Điểm điều chỉnh'},
  weight: {id:'8312f7ba9a96adc80717',table:'TL điều chỉnh',column:'TL điều chỉnh'},
};
export const GROUP_SLICERS = {
  midterm:{id:'ecc002945caad52fe4fa',table:'Điểm Giữa kỳ',column:'Điểm Giữa kỳ'},
  final:{id:'20f56233aee8bf5c8198',table:'Điểm Cuối kỳ',column:'Điểm Cuối kỳ'},
  chuyen_can:{id:'a84e70bdb521b4d9a683',table:'TL Tổng Chuyên cần',column:'TL Tổng Chuyên cần'},
  giua_ky:{id:'862de36b114828571a4c',table:'TL Tổng Giữa kỳ',column:'TL Tổng Giữa kỳ'},
  cuoi_ky:{id:'acf34af25f4241a5786b',table:'TL Tổng Cuối kỳ',column:'TL Tổng Cuối kỳ'},
};
const queues=new WeakMap();
export function queueGradeSwitch(report, action) {
  const job=(queues.get(report) || Promise.resolve()).catch(()=>{}).then(action);
  queues.set(report,job);
  return job;
}

export async function verifyGradeContext(report,courseKey,userKey) {
  const filters=await report.getFilters();
  for(const [table,column,value] of [['lms_datawarehouse dim_course','Course_Key',courseKey],['lms_datawarehouse dim_user','User_Key',userKey]]) {
    if(!filters.some(f=>f.target?.table===table && f.target?.column===column && f.operator==='In' && f.values?.length===1 && Number(f.values[0])===Number(value))) throw new Error('Bộ lọc môn/sinh viên Power BI chưa khớp với Web. Bấm Kết nối lại sau khi báo cáo tải xong.');
  }
}

export function readSingleSlicerValue(state, target) {
  const filters=(state?.filters || []).filter(f=>f.target?.table===target.table && f.target?.column===target.column);
  if(filters.length!==1) throw new Error(`Không đọc được lựa chọn duy nhất của ${target.table}.`);
  const f=filters[0];
  let value;
  if(f.operator==='In' && f.values?.length===1) value=f.values[0];
  else if(f.conditions?.length===1 && f.conditions[0].operator==='Is') value=f.conditions[0].value;
  else throw new Error(`${target.table} phải ở chế độ chọn một giá trị.`);
  if(typeof value!=='number' || !Number.isFinite(value)) throw new Error(`Giá trị ${target.table} không hợp lệ.`);
  return Math.round(value*100)/100;
}

export async function findGradeSlicers(report, pageId, targets=GRADE_SLICERS) {
  const pages=await report.getPages();
  const page=pages.find(p=>p.name===pageId) || pages.find(p=>p.displayName==='08 - Grade Simulator');
  if(!page) throw new Error('Không tìm thấy trang 08 trong báo cáo.');
  const visuals=await page.getVisuals();
  const result={};
  for(const [key,target] of Object.entries(targets)) {
    let visual=visuals.find(v=>v.name===target.id && v.type==='slicer');
    if(!visual) {
      const matches=[];
      for(const v of visuals.filter(v=>v.type==='slicer')) {
        const state=await v.getSlicerState();
        if([...(state.targets||[]),...(state.filters||[]).map(f=>f.target)].some(t=>t?.table===target.table && t?.column===target.column)) matches.push(v);
      }
      if(matches.length===1) visual=matches[0];
    }
    if(!visual) throw new Error(`Báo cáo chưa có slicer ${target.table} tương thích.`);
    result[key]=visual;
  }
  return result;
}

export async function readGroupSliders(slicers) {
  const entries=await Promise.all(Object.entries(GROUP_SLICERS).map(async([key,target])=>[key,readSingleSlicerValue(await slicers[key].getSlicerState(),target)]));
  const value=Object.fromEntries(entries);
  if(value.midterm<0 || value.midterm>10 || value.final<0 || value.final>10 || ['chuyen_can','giua_ky','cuoi_ky'].some(k=>value[k]<0 || value[k]>100)) throw new Error('Điểm hoặc trọng số nhóm không hợp lệ.');
  return value;
}

export function parseGradeCardCsv(csv) {
  const lines=String(csv).trim().split(/\r?\n/);
  if(lines.length!==2) throw new Error('Card điểm chưa trả về một giá trị duy nhất.');
  let text=lines[1].trim();
  if(text.startsWith('"') && text.endsWith('"')) text=text.slice(1,-1).replaceAll('""','"');
  if(!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error('Card điểm đang trống hoặc không phải số.');
  const value=Number(text.replace(',','.'));
  if(!Number.isFinite(value) || value<0 || value>10) throw new Error('Card điểm nằm ngoài thang 10.');
  return value;
}

export async function verifyGroupCard(report,groupKey,expected) {
  const pages=await report.getPages();
  const page=pages.find(p=>p.name==='698597e05a5f41367411') || pages.find(p=>p.displayName==='08 - Grade Simulator');
  const ids=groupKey==='giua_ky'?['4b9f98571b67cbae90f5','c297c619886b66e581e8']:['aaf8a2389c93046613aa'];
  const visuals=await page.getVisuals();
  const card=ids.map(id=>visuals.find(v=>v.name===id)).find(Boolean);
  if(!card) throw new Error('Không tìm thấy Card điểm để đối chiếu trước khi lưu.');
  const actual=parseGradeCardCsv((await card.exportData(0,1)).data);
  if(Math.abs(actual-expected)>0.011) throw new Error(`Thanh kéo/điểm Web là ${expected.toFixed(2)} nhưng Card Power BI là ${actual.toFixed(2)}. Chưa lưu để tránh nhầm điểm. Kéo lại điểm sau khi tải bản mô hình mới rồi thử xác nhận lại.`);
  return actual;
}

export async function setGradeSlicer(visual,target,value) {
  const field={table:target.table,column:target.column};
  const filter=target===GRADE_SLICERS.item
    ? {$schema:'http://powerbi.com/product/schema#basic',target:field,operator:'In',values:[value],filterType:1}
    : {$schema:'http://powerbi.com/product/schema#advanced',target:field,logicalOperator:'And',conditions:[{operator:'Is',value}],filterType:0};
  await visual.setSlicerState({filters:[filter]});
  const actual=readSingleSlicerValue(await visual.getSlicerState(),target);
  if(actual!==value) throw new Error(`Power BI chưa nhận ${target.table} = ${value}. Hãy làm mới dữ liệu báo cáo nếu đầu điểm vừa được thêm.`);
}

export async function readGradeSliders(slicers) {
  const entries=await Promise.all(Object.entries(GRADE_SLICERS).map(async([key,target])=>[key,readSingleSlicerValue(await slicers[key].getSlicerState(),target)]));
  const value=Object.fromEntries(entries);
  if(!Number.isSafeInteger(value.item) || value.item<=0 || value.score<0 || value.score>10 || value.weight<0 || value.weight>100) throw new Error('Giá trị thanh kéo nằm ngoài phạm vi cho phép.');
  return value;
}
