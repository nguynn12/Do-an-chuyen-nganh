import crypto from 'node:crypto';
import { toCanonicalId, maskPiiValue } from './excelParserService.js';
import { parseNumericValue } from './chartAggregationService.js';

const stableId = value => toCanonicalId(value).replace(/^([0-9])/, 'f_$1');
const fail = message => { throw new Error(`SUPPORTED_DATA_CONTRACT: ${message}`); };
export const SUPPORTED_STUDIO_VISUALS = new Set(['cardVisual','barChart','clusteredBarChart','columnChart','clusteredColumnChart','stackedColumnChart','lineChart','areaChart','donutChart','pieChart','scatterChart','tableEx','pivotTable','matrix','slicer','histogram','textbox']);
export function createStudioDataset(cached) {
  const profile=cached.profile;
  if(profile.contractVersion===1) return profile;
  const sourceTables=cached.tables?.length ? cached.tables : [{tableName:profile.tableName || profile.name || 'Data',columns:profile.columns,rows:cached.rows}];
  const usedTables=new Set();
  const tableMap=new Map();
  const tables=sourceTables.map((table,index)=>{
    const originalName=table.tableName || `Table_${index+1}`;
    const base=stableId(originalName); let name=base;let suffix=2;
    while(usedTables.has(name)) name=`${base}_${suffix++}`;
    usedTables.add(name);tableMap.set(originalName,name);
    const usedColumns=new Set();
    const columns=(table.columns || []).map(col=>{
      const baseId=stableId(col.name);let id=baseId;let suffix=2;
      while(usedColumns.has(id)) id=`${baseId}_${suffix++}`;
      usedColumns.add(id);
      const monthLabels=(table.rows || []).map(r=>r[col.name]).filter(v=>v!==null && v!==undefined && v!=='');
      const dataType=col.isNumeric?'number':col.inferredType==='date' && !monthLabels.every(v=>/^\d{4}-\d{2}$/.test(String(v)))?'date':col.inferredType==='boolean'?'boolean':'string';
      return {...col,sourceName:col.name,originalName:col.originalName || col.name,name:id,canonicalId:id,dataType,inferredType:dataType,
        role:col.isIdentifier?'identifier':dataType==='number'?'measure':dataType==='date'?'date':'dimension'};
    });
    const rows=(table.rows || []).map(row=>Object.fromEntries(columns.map(col=>{
      let value=row[col.sourceName] ?? null;
      if(col.dataType==='number' && value!==null && value!=='') {
        const parsed=parseNumericValue(value);
        if(parsed===null || !Number.isFinite(parsed)) fail(`Cột ${col.originalName} trộn số và giá trị không hợp lệ; hãy chuẩn hóa nguồn.`);
        value=parsed;
      } else if(col.dataType==='date' && value!==null && value!=='') {
        // Locale-ambiguous dates are rejected instead of guessing day/month order.
        if(!(value instanceof Date) && !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(String(value))) fail(`Ngày ${col.originalName} cần ISO YYYY-MM-DD hoặc ô ngày Excel.`);
        const date=new Date(value);if(!Number.isFinite(date.getTime())) fail(`Ngày không hợp lệ: ${col.originalName}`);
        value=date.toISOString();
      } else if(col.dataType==='boolean' && value!==null && value!=='') {
        if(![true,false,'true','false'].includes(value)) fail(`Boolean không hợp lệ: ${col.originalName}`);
        value=value===true || value==='true';
      } else if(value==='') value=null;
      return [col.name,value];
    })));
    if(!rows.length || !columns.length) fail(`Bảng ${originalName} rỗng.`);
    return {...table,tableName:name,canonicalId:name,originalName,columns,rows,totalRows:rows.length,totalColumns:columns.length};
  });
  const relationships=(cached.relationships || profile.relationships || []).map(rel=>{
    const from=tables.find(t=>t.tableName===tableMap.get(rel.fromTable));
    const to=tables.find(t=>t.tableName===tableMap.get(rel.toTable));
    if(!from || !to) fail('Relationship tham chiếu bảng không tồn tại.');
    const fromColumn=from.columns.find(c=>c.sourceName===rel.fromColumn)?.name;
    const toColumn=to.columns.find(c=>c.sourceName===rel.toColumn)?.name;
    if(!fromColumn || !toColumn) fail('Relationship tham chiếu cột không tồn tại.');
    return {...rel,fromTable:from.tableName,toTable:to.tableName,fromColumn,toColumn};
  });
  const primary=tables.slice().sort((a,b)=>b.columns.filter(c=>c.isNumeric).length-a.columns.filter(c=>c.isNumeric).length || b.rows.length-a.rows.length)[0];
  const result={...profile,contractVersion:1,datasetId:crypto.randomUUID(),tables,relationships,isMultiTable:tables.length>1,
    tableName:primary.tableName,columns:primary.columns,totalRows:tables.reduce((sum,t)=>sum+t.rows.length,0),
    totalColumns:tables.reduce((sum,t)=>sum+t.columns.length,0),
    sourceMetadata:{sourceId:cached.descriptor.sourceId,fileName:profile.name,sourceType:profile.sourceType},
    previewRows:primary.rows.slice(0,10).map(row=>Object.fromEntries(primary.columns.map(c=>[c.name,c.isPii?maskPiiValue(row[c.name],c.sourceName):row[c.name]])))};
  cached.profile=result;cached.tables=tables;cached.relationships=relationships;cached.isMultiTable=result.isMultiTable;cached.rows=primary.rows;
  return result;
}

export function parseSupportedMeasure(dax, profile) {
  let match=/^COUNTROWS\(\s*'([^']+)'\s*\)$/i.exec(String(dax).trim());
  if(match) {if(!profile.tables.some(t=>t.tableName===match[1])) fail('Bảng COUNTROWS không tồn tại.');return {operation:'COUNTROWS',tableName:match[1]};}
  match=/^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|DISTINCTCOUNT)\(\s*'([^']+)'\[([^\]]+)\]\s*\)$/i.exec(String(dax).trim());
  if(!match) fail('DAX ngoài phạm vi kiểm chứng: chỉ hỗ trợ aggregate một cột hoặc COUNTROWS; không đoán công thức nghiệp vụ.');
  const [,operationRaw,tableName,field]=match;const operation=operationRaw.toUpperCase();
  const column=profile.tables.find(t=>t.tableName===tableName)?.columns.find(c=>c.name===field);
  if(!column) fail(`DAX field không tồn tại: ${tableName}[${field}].`);
  if(['SUM','AVERAGE','MIN','MAX'].includes(operation) && (!column.isNumeric || column.role==='identifier')) fail(`Không được ${operation} cột ${field}.`);
  return {operation,tableName,field};
}
export function evaluateSupportedMeasure(measure, profile, rowsOverride) {
  const expr=parseSupportedMeasure(measure.dax,profile);
  const rows=rowsOverride || profile.tables.find(t=>t.tableName===expr.tableName).rows;
  if(expr.operation==='COUNTROWS') return rows.length || null;
  const values=rows.map(row=>row[expr.field]);
  const present=values.filter(v=>v!==null && v!==undefined && v!=='');
  const numbers=present.filter(v=>typeof v==='number' && Number.isFinite(v));
  if(expr.operation==='DISTINCTCOUNT') return rows.length ? new Set(values.map(v=>v===undefined || v===''?null:v)).size : null;
  if(expr.operation==='COUNT') return present.filter(v=>typeof v!=='boolean').length || null;
  if(expr.operation==='COUNTA') return present.length || null;
  if(!numbers.length) return null;
  if(expr.operation==='SUM') return numbers.reduce((a,b)=>a+b,0);
  if(expr.operation==='AVERAGE') return numbers.reduce((a,b)=>a+b,0)/numbers.length;
  if(expr.operation==='MIN') return Math.min(...numbers);
  if(expr.operation==='MAX') return Math.max(...numbers);
}

// Normalize explicit AI schema variants; never guess a chart type or data field.
export function normalizeAiVisualStructure(input) {
  const aliases={card:'cardVisual',kpi:'cardVisual',bar:'barChart',column:'columnChart',line:'lineChart',area:'areaChart',donut:'donutChart',pie:'pieChart',scatter:'scatterChart',table:'tableEx',matrix:'pivotTable'};
  const masters=Array.isArray(input.visuals)?input.visuals:[];
  const normalize=reference=>{
    const id=typeof reference==='string'?reference:reference?.id || reference?.visualId;
    const master=id?masters.find(v=>v?.id===id):undefined;
    const value=typeof reference==='string'?{...master}:Object.fromEntries(Object.entries({...reference,...Object.fromEntries(Object.entries(master || {}).filter(([,v])=>v!==undefined))}).filter(([,v])=>v!==undefined));
    if(!value.id && id) value.id=id;
    const explicit=value.visualType || value.chartType || value.type;
    value.visualType=aliases[explicit] || explicit;
    if(!value.visualType) throw new Error(`AI_PLAN_STRUCTURE: Biểu đồ ${id || '(chưa có tên)'} thiếu loại hoặc tham chiếu chưa được định nghĩa.`);
    return value;
  };
  const pages=input.pages?.map(p=>({...p,visuals:(p.visuals || p.visualIds || []).map(normalize)}));
  const visuals=pages?.length?pages.flatMap(p=>p.visuals):masters.map(normalize);
  return {...input,...(pages?{pages}:{}),visuals};
}

export function validateGeneralReportSpec(input, profile) {
  input=normalizeAiVisualStructure(input);
  if(input.datasetId && input.datasetId!==profile.datasetId) fail('Plan thuộc dataset khác; hãy tạo lại sau khi đổi file.');
  if(input.visuals?.some(v=>v.histogram)) profile=materializeStudioDataset(profile,input);
  const primary=profile.tables.find(t=>t.tableName===input.tableName) || profile.tables.find(t=>t.tableName===profile.tableName) || profile.tables[0];
  const supplied=Array.isArray(input.measures) && input.measures.length;
  const measures=(supplied?input.measures:[
    {name:'RowCount',dax:`COUNTROWS('${primary.tableName}')`,formatString:'#,0'},
    ...primary.columns.filter(c=>c.isNumeric && c.role!=='identifier').slice(0,3).map(c=>({name:`Average_${c.name}`,dax:`AVERAGE('${primary.tableName}'[${c.name}])`,formatString:'0.00'})),
  ]).map(m=>{const expression=parseSupportedMeasure(m.dax,profile);return {...m,name:String(m.name || '').trim(),tableName:expression.tableName,expression};});
  if(measures.some(m=>!m.name || /[\r\n\[\]']/.test(m.name))) fail('Tên measure không hợp lệ.');
  if(new Set(measures.map(m=>m.name.toLowerCase())).size!==measures.length) fail('Measure trùng tên.');
  const bindMetric=(field,tableName,aggregation)=>{
    const existing=measures.find(m=>m.name===field && m.tableName===tableName);
    if(existing) return existing.name;
    const operation=String(aggregation || 'SUM').toUpperCase().replace('AVG','AVERAGE');
    const dax=`${operation}('${tableName}'[${field}])`;
    const expression=parseSupportedMeasure(dax,profile);
    const matching=measures.find(m=>m.dax===dax);if(matching) return matching.name;
    const base=`${operation}_${tableName}_${field}`;let name=base;let index=2;
    while(measures.some(m=>m.name.toLowerCase()===name.toLowerCase())) name=`${base}_${index++}`;
    measures.push({name,dax,tableName,expression,formatString:operation==='AVERAGE'?'0.00':'#,0.##'});
    return name;
  };
  const suppliedVisuals=input.pages?.length ? input.pages.flatMap(p=>p.visuals || []).map(v=>({...v,...input.visuals?.find(master=>master.id===v.id)})) : input.visuals;
  const firstCategory=primary.columns.find(c=>c.role==='dimension' || c.role==='date') || primary.columns[0];
  const defaultVisuals=[...measures.slice(0,4).map((m,i)=>({id:`kpi_${i}`,title:m.name,visualType:'cardVisual',measureField:m.name,tableName:m.tableName})),
    {id:'source_table',title:'Dữ liệu nguồn',visualType:'tableEx',tableName:primary.tableName,columns:primary.columns.map(c=>c.name)},
    {id:'slicer',title:firstCategory.originalName,visualType:'slicer',tableName:primary.tableName,categoryField:firstCategory.name}];
  const visuals=(suppliedVisuals?.length?suppliedVisuals:defaultVisuals).map((v,i)=>{
    if(!SUPPORTED_STUDIO_VISUALS.has(v.visualType)) fail(`Visual không hỗ trợ: ${v.visualType}`);
    const measure=measures.find(m=>m.name===(v.measureField || v.yAxis));
    const tableName=v.tableName || measure?.tableName || primary.tableName;
    const table=profile.tables.find(t=>t.tableName===tableName);if(!table) fail(`Visual tham chiếu bảng không tồn tại: ${tableName}`);
    const col=name=>table.columns.find(c=>c.name===name);
    if(measure && measure.tableName!==tableName) fail('Visual cross-table cần ngữ nghĩa join chưa được hỗ trợ.');
    const result={...v,id:v.id || `visual_${i}`,tableName,title:v.title || v.visualType,categoryField:v.categoryField || null};
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(result.id)) fail('Visual ID không hợp lệ.');
    if(result.visualType==='matrix') result.visualType='pivotTable';
    if(v.filters) buildStudioPbirFilters(v.filters,tableName,profile);
    if(v.visualType==='textbox') return result;
    if(v.visualType==='tableEx') {
      result.columns=v.columns?.length?v.columns:table.columns.map(c=>c.name);
      if(result.columns.some(name=>!col(name))) fail('Table/Matrix chứa cột không tồn tại.');
      return result;
    }
    if(v.visualType==='slicer') {if(!col(result.categoryField)) fail('Slicer thiếu cột hợp lệ.');return result;}
    if(v.visualType==='histogram') {
      const field=v.field || v.xAxis;const column=col(field);
      if(!column?.isNumeric || column.role==='identifier') fail('Histogram cần cột số.');
      const values=table.rows.map(r=>r[field]).filter(n=>typeof n==='number');
      if(!values.length) fail('Histogram không có giá trị số.');
      const start=Math.min(...values);const width=Number(v.binSize) || (Math.max(...values)-start)/10 || 1;
      if(!Number.isFinite(width) || width<=0) fail('Histogram binSize không hợp lệ.');
      result.histogram={field,start,width};result.categoryField=`bin_${stableId(result.id)}`;
      result.visualType='columnChart';
      const countName=`Count_${result.id}`;
      if(!measures.some(m=>m.name===countName)) measures.push({name:countName,tableName,dax:`COUNTROWS('${tableName}')`,formatString:'#,0',expression:{operation:'COUNTROWS',tableName}});
      result.measureField=countName;return result;
    }
    if(v.visualType==='scatterChart') {
      result.xAxis=v.xAxis || v.measureField;result.yAxis=v.yAxis || v.secondaryMeasureField;
      for(const key of ['xAxis','yAxis']) {const name=result[key];if(!col(name)?.isNumeric && !measures.some(m=>m.name===name && m.tableName===tableName)) fail(`Scatter ${key} cần field số hoặc measure hợp lệ.`);}
      result.categoryField=result.categoryField || table.columns[0].name;
      if(!col(result.categoryField)) fail('Scatter category không tồn tại.');
      result.xAxis=bindMetric(result.xAxis,tableName,v.xAggregation || 'SUM');
      result.yAxis=bindMetric(result.yAxis,tableName,v.yAggregation || 'SUM');
      return result;
    }
    const metric=v.measureField || v.yAxis;
    if(v.columnField && !col(v.columnField)) fail('Matrix columnField không tồn tại.');
    if(v.seriesField && (!col(v.seriesField) || !['stackedColumnChart'].includes(v.visualType))) fail('Series cần category cùng bảng trong biểu đồ cột/thanh.');
    if(!measure && !col(metric)) fail(`Metric không tồn tại: ${metric}`);
    const operation=String(v.aggregation || (col(metric)?.isNumeric?'SUM':'COUNT')).toUpperCase().replace('AVG','AVERAGE');
    if(!measure) parseSupportedMeasure(`${operation}('${tableName}'[${metric}])`,profile);
    if(v.visualType!=='cardVisual' && !col(result.categoryField)) fail('Biểu đồ thiếu category hợp lệ.');
    result.measureField=bindMetric(metric,tableName,operation);result.aggregation=operation==='AVERAGE'?'AVG':operation;
    return result;
  });
  if(new Set(visuals.map(v=>v.id)).size!==visuals.length) fail('Visual ID trùng.');
  let offset=0;
  const pages=input.pages?.length?input.pages.map((p,i)=>{const count=(p.visuals || []).length;const page={...p,id:p.id || `page_${i+1}`,visuals:visuals.slice(offset,offset+count)};offset+=count;return page;}):[{id:'page_1',displayName:'Báo cáo',visuals}];
  if(pages.some(p=>new Set(p.visuals.filter(v=>v.visualType!=='textbox').map(v=>v.tableName)).size>1)) fail('Mỗi trang hiện hỗ trợ một bảng; hãy tách trang để tránh suy diễn cross-table filtering.');
  if(pages.some(p=>!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id) || !p.visuals.length) || new Set(pages.map(p=>p.id)).size!==pages.length) fail('Trang trống hoặc Page ID không hợp lệ/trùng.');
  const filters={...(input.filters || {}),...(input.activeFilters || {})};
  if(profile.tables.length>1 && Object.keys(filters).length) fail('Report-level filters nhiều bảng chưa hỗ trợ; dùng visual filter cùng bảng.');
  buildStudioPbirFilters(filters,primary.tableName,profile);
  return {...input,contractVersion:1,datasetId:profile.datasetId,tableName:primary.tableName,reportTitle:input.reportTitle || `Báo cáo ${profile.name}`,tables:profile.tables.map(({rows,...t})=>t),relationships:profile.relationships,
    measures,visuals,pages,filters,workflowStatus:'DESIGN_DRAFT',supportedCalculationScope:'single-table aggregates; no inferred business thresholds or cross-table joins'};
}

export function buildStudioPbirFilters(filters, tableName, profile) {
  const table=profile.tables.find(t=>t.tableName===tableName);
  return {filters:Object.entries(filters || {}).filter(([,value])=>value!==null && value!=='' && value!=='All' && value!=='ALL').map(([field,value],i)=>{
    const column=table?.columns.find(c=>c.name===field);if(!column) fail(`Bộ lọc không tồn tại: ${tableName}[${field}].`);
    const values=Array.isArray(value)?value:[value];
    if(!values.length || values.some(v=>!['string','number','boolean'].includes(typeof v))) fail('Filter cần giá trị scalar hoặc danh sách scalar.');
    if(column.isNumeric && values.some(v=>!Number.isFinite(Number(v)))) fail('Filter số không hợp lệ.');
    const literal=v=>({Literal:{Value:column.isNumeric?`${Number(v)}D`:column.dataType==='boolean'?(v===true || v==='true'?'true':'false'):`'${String(v).replace(/'/g,"''")}'`}});
    return {name:`filter_${i}_${field}`,field:{Column:{Expression:{SourceRef:{Entity:tableName}},Property:field}},type:'Categorical',
      filter:{Version:2,From:[{Name:'f',Entity:tableName,Type:0}],Where:[{Condition:{In:{Expressions:[{Column:{Expression:{SourceRef:{Source:'f'}},Property:field}}],Values:values.map(v=>[literal(v)])}}}]}};
  })};
}

export function hashStudioPlan(plan) {
  const clean=v=>{const {previewData,realData,...spec}=v;return spec;};
  const core={datasetId:plan.datasetId,tableName:plan.tableName,measures:plan.measures,visuals:plan.visuals.map(clean),
    pages:plan.pages.map(p=>({...p,visuals:p.visuals.map(v=>v.id)})),filters:plan.filters || {}};
  const stable=value=>Array.isArray(value)?value.map(stable):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
  return crypto.createHash('sha256').update(JSON.stringify(stable(core))).digest('hex');
}

export function materializeStudioDataset(profile, plan) {
  const tables=profile.tables.map(table=>({...table,columns:table.columns.map(c=>({...c})),rows:table.rows.map(r=>({...r}))}));
  for(const v of plan.visuals || []) if(v.histogram) {
    const table=tables.find(t=>t.tableName===v.tableName);
    if(!table.columns.some(c=>c.name===v.categoryField)) table.columns.push({name:v.categoryField,originalName:`Khoảng ${v.histogram.field}`,canonicalId:v.categoryField,inferredType:'string',dataType:'string',role:'dimension',isNumeric:false});
    for(const row of table.rows) {
      const n=row[v.histogram.field];const lower=v.histogram.start+Math.floor((n-v.histogram.start)/v.histogram.width)*v.histogram.width;
      row[v.categoryField]=n===null?null:`${Number(lower.toPrecision(10))} – ${Number((lower+v.histogram.width).toPrecision(10))}`;
    }
  }
  const primary=tables.find(t=>t.tableName===plan.tableName) || tables[0];
  return {...profile,tables,tableName:primary.tableName,columns:primary.columns};
}
export function computeGeneralPreview(plan, profile, activeFilters={}) {
  const data=materializeStudioDataset(profile,plan);
  const visibleRows=(tableName,visualFilters={})=>data.tables.find(t=>t.tableName===tableName).rows.filter(row=>Object.entries({...plan.filters,...activeFilters,...visualFilters}).every(([key,value])=>{
    if(value===null || value==='' || value==='All' || value==='ALL') return true;
    if(!Object.hasOwn(row,key)) fail(`Bộ lọc ${key} không thuộc bảng ${tableName}; cross-table filter chưa hỗ trợ.`);
    return Array.isArray(value)?value.map(String).includes(String(row[key])):String(row[key])===String(value);
  }));
  const metric=(visual,rows,field=visual.measureField)=>{
    const measure=plan.measures.find(m=>m.name===field) || {dax:`${String(visual.aggregation || 'SUM').replace('AVG','AVERAGE')}('${visual.tableName}'[${field}])`};
    return evaluateSupportedMeasure(measure,data,rows);
  };
  const visuals=plan.visuals.map(v=>{
    const rows=visibleRows(v.tableName,v.filters);let real={sampleSize:rows.length,isEmpty:!rows.length,isError:false};
    if(v.visualType==='textbox') real.text=v.text || v.title;
    else if(v.visualType==='slicer') real={...real,visualType:'slicer',field:v.categoryField,options:[...new Set(data.tables.find(t=>t.tableName===v.tableName).rows.map(r=>r[v.categoryField]).filter(x=>x!==null))].map(String).sort(),activeValue:activeFilters[v.categoryField] || 'All'};
    else if(v.visualType==='tableEx') real={...real,chartType:'tableEx',columns:v.columns,rows:rows.slice(0,50),totalRows:rows.length};
    else if(v.visualType==='cardVisual') {const value=metric(v,rows);real={...real,chartType:'kpi_card',metricValue:value,formattedValue:value===null?'—':String(Number(value.toFixed(6))),kpiValue:value,unit:'',metricLabel:v.title};}
    else if(v.visualType==='scatterChart') {
      const groups=new Map();for(const row of rows){const key=String(row[v.categoryField] ?? '(Blank)');if(!groups.has(key)) groups.set(key,[]);groups.get(key).push(row);}
      const points=[...groups].map(([label,group])=>({label,x:metric({...v,aggregation:v.xAggregation || 'SUM'},group,v.xAxis),y:metric({...v,aggregation:v.yAggregation || 'SUM'},group,v.yAxis)})).filter(p=>p.x!==null && p.y!==null);
      real={...real,chartType:'scatter',points,xRange:points.length?[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x))]:[0,1],yRange:points.length?[Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y))]:[0,1]};
    }
    else if(v.visualType==='pivotTable') {
      const rowKeys=[...new Set(rows.map(r=>String(r[v.categoryField] ?? '(Blank)')))];
      const columnKeys=v.columnField?[...new Set(rows.map(r=>String(r[v.columnField] ?? '(Blank)')))]:[v.measureField];
      real={...real,chartType:'tableEx',columns:[v.categoryField,...columnKeys],rows:rowKeys.map(key=>Object.fromEntries([[v.categoryField,key],...columnKeys.map(c=>[c,metric(v,rows.filter(r=>String(r[v.categoryField] ?? '(Blank)')===key && (!v.columnField || String(r[v.columnField] ?? '(Blank)')===c)))] )])),totalRows:rowKeys.length};
    } else {
      const groups=new Map();for(const row of rows){const key=String(row[v.categoryField] ?? '(Blank)');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
      const categories=[...groups.keys()];const values=[...groups.values()].map(group=>metric(v,group));
      real={...real,chartType:/donut|pie/i.test(v.visualType)?'donut':/line|area/i.test(v.visualType)?'line':'bar',categories,values,series:[{name:v.measureField,data:values}],labels:categories};
      if(/donut|pie/i.test(v.visualType)) {
        if(values.some(n=>n<0)) fail('Donut/Pie không hỗ trợ metric âm; chọn Bar.');
        const total=values.reduce((sum,n)=>sum+(n || 0),0);
        real.percentages=categories.map((label,i)=>({label,count:values[i],percentage:total?100*values[i]/total:0}));
      }
      if(v.seriesField) {
        real.seriesNames=[...new Set(rows.map(row=>String(row[v.seriesField] ?? '(Blank)')))];
        real.stackedData=categories.map(category=>{const result={category};let total=0;for(const series of real.seriesNames){result[series]=metric(v,groups.get(category).filter(r=>String(r[v.seriesField] ?? '(Blank)')===series));total+=result[series] || 0;}return {...result,total};});
        real.series=real.seriesNames.map(name=>({name,data:real.stackedData.map(row=>row[name])}));
      }
    }
    return {...v,previewData:real,realData:real};
  });
  return {...plan,visuals,pages:plan.pages.map(p=>({...p,visuals:p.visuals.map(v=>visuals.find(x=>x.id===v.id))})),activeFilters,sampleSize:visibleRows(plan.tableName).length,
    measuresSummary:Object.fromEntries(plan.measures.map(m=>[m.name,evaluateSupportedMeasure(m,data,visibleRows(m.tableName))]))};
}
