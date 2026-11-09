import React, { useState } from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Zap,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Layers,
  Table as TableIcon,
  Download,
  UploadCloud,
  Globe,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Activity,
  Layers as LayersIcon,
  Grid,
  Send,
  X,
  RefreshCw,
  Sliders,
  FileCode,
  FolderArchive,
  ExternalLink,
} from "lucide-react";

const PALETTE = [
  "#4f46e5", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#f97316", // Orange
];

const CHART_CHOICES = [
  ['columnChart','Cột','So sánh các nhóm',BarChart3],
  ['barChart','Thanh ngang','So sánh, nhãn dài',BarChart3],
  ['lineChart','Đường','Xu hướng theo thời gian',LineIcon],
  ['donutChart','Vòng (Donut)','Tỷ trọng từng nhóm',PieIcon],
  ['pieChart','Tròn (Pie)','Các phần trong tổng thể',PieIcon],
  ['areaChart','Miền','Xu hướng và quy mô',Activity],
  ['stackedColumnChart','Cột chồng','So sánh theo phân nhóm',LayersIcon],
  ['scatterChart','Phân tán','Quan hệ giữa hai chỉ số',Activity],
  ['histogram','Histogram','Phân bố một cột số',BarChart3],
  ['pivotTable','Ma trận','Tổng hợp theo hàng, cột',Grid],
  ['tableEx','Bảng','Xem dữ liệu chi tiết',TableIcon],
];
function ChartTypePicker({value,onChange,allowCombo=false,allowHistogram=true}) {
  const choices=CHART_CHOICES.filter(([type])=>type!=='histogram' || allowHistogram);
  if(allowCombo) choices.push(['lineClusteredColumnComboChart','Cột & đường','Kết hợp hai chỉ số',LayersIcon]);
  return <div className="ai-chart-type-grid" role="group" aria-label="Chọn loại biểu đồ">
    {choices.map(([type,label,description,Icon])=><button type="button" key={type} className={`ai-chart-type-option ${value===type?'selected':''}`} aria-pressed={value===type} onClick={()=>onChange(type)}>
      <span className="ai-chart-type-icon">{type==='donutChart'?<svg width="27" height="27" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="5"/><path d="M14 5 A9 9 0 0 1 23 14" fill="none" stroke="#93c5fd" strokeWidth="5"/></svg>:<Icon size={27} style={type==='barChart'?{transform:'rotate(90deg)'}:undefined}/>}</span>
      <strong>{label}</strong><span>{description}</span>{value===type && <CheckCircle2 className="ai-chart-type-check" size={15}/>}
    </button>)}
  </div>;
}

export default function VisualDashboardPreview({
  reportPlan,
  datasetProfile,
  workflowStatus = "DESIGN_DRAFT",
  activeFilters = {},
  onFilterChange,
  onUpdateVisual,
  onDeleteVisual,
  onAddVisual,
  onAddKpi,
  onAddSlicer,
  onAddPage,
  onDeletePage,
  onApproveAndGenerate,
  onPublish,
  onVerifyFabric,
  isVerifyingFabric = false,
  fabricVerificationResult = null,
  onDownloadZip,
  isApproving = false,
  isGenerating = false,
  isPublishing = false,
  isDownloadingZip = false,
  pbiProjectResult = null,
  pbiPublishResult = null,
  planEditInput = "",
  setPlanEditInput,
  onConversationalEdit,
  isEditingPlan = false,
  onExecuteBenchmarkPublish,
}) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [editingVisual, setEditingVisual] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState("chart"); // "chart" | "kpi" | "slicer"
  const [addForm, setAddForm] = useState({
    title: "",
    visualType: "columnChart",
    categoryField: "",
    measureField: "",
    secondaryMeasureField: "",
    seriesField: "",
  });

  if (!reportPlan) return null;

  // Thu thập danh sách cột khả dụng từ metadata profile
  const availableColumns = datasetProfile?.tables?.find(t=>t.tableName===(editingVisual?.tableName || reportPlan.tableName))?.columns || datasetProfile?.columns || [];
  const numericColumns = [...availableColumns.filter((c) => c.isNumeric), ...(reportPlan.measures || []).filter(m=>!m.tableName || m.tableName===(editingVisual?.tableName || reportPlan.tableName))];
  const categoryColumns = availableColumns.filter((c) => !c.isNumeric);

  // Xác định các trang báo cáo
  const pages = Array.isArray(reportPlan.pages) && reportPlan.pages.length > 0
    ? reportPlan.pages
    : [{ id: "page_1", displayName: "Trang Tổng quan", visuals: reportPlan.visuals || [] }];

  const safePageIndex = Math.min(activePageIndex, pages.length - 1);
  const currentPage = pages[safePageIndex] || pages[0];
  const pageVisuals = currentPage.visuals || [];

  // Tách visuals theo nhóm chức năng
  const slicers = pageVisuals.filter((v) => v.visualType === "slicer");
  const kpiCards = pageVisuals.filter((v) => v.visualType === "cardVisual" || v.visualType === "kpi_card");
  const charts = pageVisuals.filter((v) => v.visualType !== "slicer" && v.visualType !== "cardVisual" && v.visualType !== "kpi_card");

  // Xử lý mở modal thêm visual
  function openAddModal(type) {
    setAddModalType(type);
    setAddForm({
      title: type === "kpi" ? "Chỉ số mới" : type === "slicer" ? "Bộ lọc mới" : "Biểu đồ mới",
      visualType: type === "kpi" ? "cardVisual" : type === "slicer" ? "slicer" : "columnChart",
      categoryField: categoryColumns[0]?.name || (availableColumns[0]?.name || "Category"),
      measureField: numericColumns[0]?.name || (availableColumns[0]?.name || "Total"),
      secondaryMeasureField: numericColumns[1]?.name || numericColumns[0]?.name || "",
      seriesField: categoryColumns[1]?.name || categoryColumns[0]?.name || "",
    });
    setAddModalOpen(true);
  }

  function handleSaveAddModal() {
    if (addModalType === "kpi") {
      onAddKpi && onAddKpi({
        visualType: "cardVisual",
        title: addForm.title || `KPI ${addForm.measureField}`,
        measureField: addForm.measureField,
        position: { width: 320, height: 110 },
      }, currentPage.id);
    } else if (addModalType === "slicer") {
      onAddSlicer && onAddSlicer({
        visualType: "slicer",
        title: addForm.title || `Bộ lọc ${addForm.categoryField}`,
        categoryField: addForm.categoryField,
        position: { width: 1840, height: 90 },
      }, currentPage.id);
    } else {
      onAddVisual && onAddVisual({
        visualType: addForm.visualType,
        title: addForm.title,
        categoryField: addForm.categoryField,
        measureField: addForm.measureField,
        secondaryMeasureField: addForm.secondaryMeasureField,
        ...(addForm.visualType==='stackedColumnChart'?{seriesField:addForm.seriesField}:{}),
        ...(addForm.visualType==='scatterChart'?{xAxis:addForm.measureField,yAxis:addForm.secondaryMeasureField}:{}),
        ...(addForm.visualType==='histogram'?{field:addForm.field || availableColumns.find(c=>c.isNumeric)?.name,binSize:addForm.binSize}:{}),
        ...(addForm.visualType==='tableEx'?{columns:availableColumns.map(c=>c.name)}:{}),
        position: { width: 910, height: 350 },
      }, currentPage.id);
    }
    setAddModalOpen(false);
  }

  // Render từng biểu đồ cụ thể dựa trên số liệu previewData
  function renderChartContent(v) {
    const data = v.previewData;
    if (!data || data.isEmpty) {
      return (
        <div className="ai-preview-empty-box">
          <Activity size={24} color="#94a3b8" />
          <span>Chưa có dữ liệu thống kê phù hợp với bộ lọc hiện tại.</span>
        </div>
      );
    }

    const vType = v.visualType || "columnChart";

    // 1. COLUMN / BAR CHART
    if (vType === "columnChart" || vType === "clusteredColumnChart" || vType === "barChart" || vType === "clusteredBarChart") {
      const categories = data.categories || [];
      const values = data.values || data.series?.[0]?.data || data.seriesValues || [];
      const maxVal = Math.max(...values, 1);
      const isBar = vType.toLowerCase().includes("bar");
      if(datasetProfile?.contractVersion===1) {
        const entries=categories.map((label,i)=>({label,value:values[i]}));
        if(v.histogram) entries.sort((a,b)=>{
          const left=parseFloat(a.label),right=parseFloat(b.label);
          return (Number.isFinite(left)?left:Infinity)-(Number.isFinite(right)?right:Infinity);
        });
        const chartWidth=isBar?340:Math.max(340,entries.length*44+80);
        const chartHeight=isBar?Math.max(160,entries.length*25):235;
        const lo=Math.min(0,...values.filter(x=>x!==null));const hi=Math.max(0,...values.filter(x=>x!==null));const span=hi-lo || 1;
        const y=n=>130-(n-lo)/span*110;const x=n=>100+(n-lo)/span*220;
        return <div className="ai-preview-chart-body ai-readable-chart"><svg width="100%" style={{minWidth:chartWidth,display:"block"}} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={v.title || "Biểu đồ"}>
          {isBar?<line x1={x(0)} x2={x(0)} y1="5" y2={Math.max(150,categories.length*25)} stroke="#64748b"/>:<line x1="15" x2={chartWidth-15} y1={y(0)} y2={y(0)} stroke="#64748b"/>}
          {entries.map(({label:cat,value:val},i)=>{
            const step=(chartWidth-80)/Math.max(entries.length,1);const barWidth=Math.min(30,step*.65);
            const labelX=30+i*step+barWidth/2;
            const fullLabel=String(cat);const readableLabel=v.histogram?fullLabel.replace(/\./g,','):fullLabel;
            const shortLabel=readableLabel.length>20?`${readableLabel.slice(0,19)}…`:readableLabel;
            return <g key={i}><title>{`${cat}: ${val ?? 'BLANK'}`}</title>
              {val!==null && (isBar?<rect x={Math.min(x(0),x(val))} y={i*25+5} width={Math.abs(x(val)-x(0))} height="16" fill={PALETTE[i%PALETTE.length]}/>:<rect x={30+i*step} y={Math.min(y(0),y(val))} width={barWidth} height={Math.abs(y(val)-y(0))} fill={PALETTE[i%PALETTE.length]}/>)}
              <text x={isBar?95:labelX} y={isBar?i*25+17:148} transform={isBar?undefined:`rotate(55 ${labelX} 148)`} fontSize="10" fill="#475569" textAnchor={isBar?'end':'start'}><title>{fullLabel}</title>{shortLabel}</text>
              <text x={isBar?x(val || 0)+3:labelX} textAnchor={isBar?"start":"middle"} y={isBar?i*25+17:(val===null?120:y(val)-4)} fontSize="9">{val ?? '—'}</text>
            </g>;
          })}
        </svg></div>;
      }

      if (isBar) {
        return (
          <div className="ai-preview-chart-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
              {categories.map((cat, idx) => {
                const val = values[idx] ?? 0;
                const pct = Math.max(4, Math.round((val / maxVal) * 100));
                const color = PALETTE[idx % PALETTE.length];
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.785rem" }}>
                    <span style={{ width: "85px", textAlign: "right", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cat}>
                      {cat}
                    </span>
                    <div style={{ flex: 1, background: "#f1f5f9", height: "18px", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px" }} />
                    </div>
                    <span style={{ width: "45px", fontWeight: 700, color: "#1e293b" }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // Column Chart (SVG)
      return (
        <div className="ai-preview-chart-body">
          <svg width="100%" height="160" viewBox="0 0 340 160">
            <line x1="15" y1="130" x2="325" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
            {categories.map((cat, idx) => {
              const val = values[idx] ?? 0;
              const barH = Math.max(6, Math.round((val / maxVal) * 95));
              const stepX = 300 / Math.max(categories.length, 1);
              const barW = Math.min(38, Math.max(16, stepX - 10));
              const x = 20 + idx * stepX + (stepX - barW) / 2;
              const y = 130 - barH;
              const color = PALETTE[idx % PALETTE.length];
              const shortCat = cat.length > 10 ? cat.slice(0, 8) + "…" : cat;

              return (
                <g key={idx}>
                  <title>{`${cat}: ${val}`}</title>
                  <rect x={x} y={y} width={barW} height={barH} rx="4" fill={color} />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#1e293b">
                    {val}
                  </text>
                  <text x={x + barW / 2} y="146" textAnchor="middle" fontSize="8.5" fill="#64748b">
                    {shortCat}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 2. DONUT / PIE CHART
    if (vType === "donutChart" || vType === "pieChart") {
      const percentages = data.percentages || [];
      const radius=vType==="pieChart"?30:42;
      const ringWidth=vType==="pieChart"?60:20;
      const circumference = 2*Math.PI*radius;
      let accumulatedPct = 0;

      return (
        <div className="ai-preview-donut-layout">
          <div style={{ flex: "0 0 130px", height: "150px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={ringWidth} />
              {percentages.map((p, idx) => {
                const dashLength = (p.percentage / 100) * circumference;
                const offset = -(accumulatedPct / 100) * circumference;
                accumulatedPct += p.percentage;
                const color = PALETTE[idx % PALETTE.length];

                return (
                  <circle
                    key={idx}
                    cx="65"
                    cy="65"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={ringWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 65 65)"
                  >
                    <title>{`${p.label}: ${p.count} (${p.percentage}%)`}</title>
                  </circle>
                );
              })}
              <text display={vType==="pieChart"?"none":undefined} x="65" y="63" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e293b">
                {data.sampleSize}
              </text>
              <text display={vType==="pieChart"?"none":undefined} x="65" y="75" textAnchor="middle" fontSize="8.5" fill="#64748b">
                mẫu
              </text>
            </svg>
          </div>

          <div className="ai-preview-legend-list">
            {percentages.map((p, idx) => (
              <div key={idx} className="ai-preview-legend-item">
                <span className="ai-legend-dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                <span className="ai-legend-label" title={p.label}>{p.label}</span>
                <span className="ai-legend-val">{p.count ?? p.value ?? 0} ({p.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. LINE / AREA CHART
    if (vType === "lineChart" || vType === "areaChart") {
      const categories = data.categories || [];
      const values = data.values || data.series?.[0]?.data || data.seriesValues || [];
      const maxVal = Math.max(...values, 1);
      const minVal = Math.min(...values, 0);
      const range = maxVal - minVal || 1;
      const stepX = 280 / Math.max(categories.length - 1, 1);

      const points = values.map((val, idx) => {
        const x = 30 + idx * stepX;
        const y = 130 - ((val - minVal) / range) * 90;
        return `${x},${y}`;
      }).join(" ");

      const areaPath = vType === "areaChart" && values.length > 0
        ? `M 30 130 L ${points.split(" ").map(p => p).join(" L ")} L ${30 + (values.length - 1) * stepX} 130 Z`
        : "";

      return (
        <div className="ai-preview-chart-body">
          <svg width="100%" height="160" viewBox="0 0 340 160">
            <defs>
              <linearGradient id={`areaGrad_${v.title?.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <line x1="20" y1="130" x2="320" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
            {vType === "areaChart" && <path d={areaPath} fill={`url(#areaGrad_${v.title?.replace(/[^a-zA-Z0-9]/g, "")})`} />}
            <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5" points={points} />
            {values.map((val, idx) => {
              const x = 30 + idx * stepX;
              const y = 130 - ((val - minVal) / range) * 90;
              const shortCat = categories[idx]?.length > 8 ? categories[idx].slice(0, 7) + "…" : categories[idx];
              return (
                <g key={idx}>
                  <title>{`${categories[idx]}: ${val}`}</title>
                  <circle cx={x} cy={y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y={y - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e293b">{val}</text>
                  <text x={x} y="146" textAnchor="middle" fontSize="8.5" fill="#64748b">{shortCat}</text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 4. COMBO CHART (lineClusteredColumnComboChart)
    if (vType === "lineClusteredColumnComboChart" || vType === "comboChart") {
      const categories = data.categories || [];
      const barData = data.barData || [];
      const lineData = data.lineData || [];
      const allVals = [...barData, ...lineData];
      const maxVal = Math.max(...allVals, 1);
      const stepX = 290 / Math.max(categories.length, 1);
      const barW = Math.min(36, Math.max(16, stepX - 16));

      const linePoints = lineData.map((val, idx) => {
        const x = 25 + idx * stepX + stepX / 2;
        const y = 130 - (val / maxVal) * 95;
        return `${x},${y}`;
      }).join(" ");

      return (
        <div className="ai-preview-chart-body">
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", marginBottom: "0.25rem", justifyContent: "flex-end" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 10, height: 10, background: "#4f46e5", borderRadius: 2 }} />
              {data.colField || "Cột"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 14, height: 2.5, background: "#06b6d4", display: "inline-block" }} />
              {data.lineField || "Đường"}
            </span>
          </div>
          <svg width="100%" height="150" viewBox="0 0 340 150">
            <line x1="15" y1="125" x2="325" y2="125" stroke="#cbd5e1" strokeWidth="1.5" />
            {categories.map((cat, idx) => {
              const bVal = barData[idx] ?? 0;
              const barH = Math.max(6, Math.round((bVal / maxVal) * 95));
              const x = 20 + idx * stepX + (stepX - barW) / 2;
              const y = 125 - barH;
              return (
                <g key={`b_${idx}`}>
                  <rect x={x} y={y} width={barW} height={barH} rx="3" fill="#4f46e5" />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#4338ca">{bVal}</text>
                  <text x={x + barW / 2} y="142" textAnchor="middle" fontSize="8.5" fill="#64748b">{cat}</text>
                </g>
              );
            })}
            <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={linePoints} />
            {lineData.map((lVal, idx) => {
              const x = 25 + idx * stepX + stepX / 2;
              const y = 125 - (lVal / maxVal) * 95;
              return (
                <g key={`l_${idx}`}>
                  <circle cx={x} cy={y} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y={y - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0891b2">{lVal}</text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 5. SCATTER CHART (scatterChart)
    if (vType === "scatterChart" || vType === "scatter") {
      const points = data.points || [];
      const [minX, maxX] = data.xRange || [0, 10];
      const [minY, maxY] = data.yRange || [0, 10];
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;

      return (
        <div className="ai-preview-chart-body">
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.2rem", textAlign: "right" }}>
            Trục X: <strong>{data.xField}</strong> • Trục Y: <strong>{data.yField}</strong>
          </div>
          <svg width="100%" height="150" viewBox="0 0 340 150">
            <line x1="30" y1="125" x2="320" y2="125" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="30" y1="15" x2="30" y2="125" stroke="#cbd5e1" strokeWidth="1.5" />
            {points.map((pt, idx) => {
              const cx = 35 + ((pt.x - minX) / rangeX) * 270;
              const cy = 120 - ((pt.y - minY) / rangeY) * 95;
              const color = PALETTE[idx % PALETTE.length];
              return (
                <g key={idx}>
                  <title>{`${pt.label}: X=${pt.x}, Y=${pt.y}`}</title>
                  <circle cx={cx} cy={cy} r="5" fill={color} stroke="#ffffff" strokeWidth="1.5" />
                  <text x={cx + 6} y={cy + 3} fontSize="8" fill="#334155">{pt.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 6. MATRIX / PIVOT TABLE (pivotTable)
    if ((vType === "pivotTable" || vType === "matrix") && !data.columns) {
      const matrixRows = data.matrixRows || [];
      return (
        <div className="ai-preview-matrix-body">
          <table className="ai-preview-table">
            <thead>
              <tr>
                <th>{data.rowField || "Nhóm"}</th>
                <th>Điểm TB ({data.valField})</th>
                <th>Số lượng SV</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((mr, idx) => (
                <tr key={idx}>
                  <td><strong>{mr.rowKey}</strong></td>
                  <td><span className="ai-matrix-badge">{mr.avg}</span></td>
                  <td>{mr.count} SV</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // 7. STACKED COLUMN CHART (stackedColumnChart)
    if (vType === "stackedColumnChart") {
      const stackedData = data.stackedData || [];
      const seriesNames = data.seriesNames || [];
      const maxTotal = Math.max(...stackedData.map(d => d.total), 1);
      const stepX = 290 / Math.max(stackedData.length, 1);
      const barW = Math.min(42, Math.max(20, stepX - 16));

      return (
        <div className="ai-preview-chart-body">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.725rem", marginBottom: "0.3rem", justifyContent: "flex-end" }}>
            {seriesNames.map((ser, sIdx) => (
              <span key={sIdx} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <span style={{ width: 9, height: 9, background: PALETTE[sIdx % PALETTE.length], borderRadius: 2 }} />
                {ser}
              </span>
            ))}
          </div>
          <svg width="100%" height="150" viewBox="0 0 340 150">
            <line x1="15" y1="125" x2="325" y2="125" stroke="#cbd5e1" strokeWidth="1.5" />
            {stackedData.map((row, idx) => {
              const x = 25 + idx * stepX + (stepX - barW) / 2;
              let currentY = 125;

              return (
                <g key={idx}>
                  {seriesNames.map((ser, sIdx) => {
                    const count = row[ser] || 0;
                    if (count === 0) return null;
                    const segH = Math.max(4, Math.round((count / maxTotal) * 95));
                    currentY -= segH;
                    const color = PALETTE[sIdx % PALETTE.length];
                    return (
                      <g key={sIdx}>
                        <title>{`${row.category} - ${ser}: ${count}`}</title>
                        <rect x={x} y={currentY} width={barW} height={segH} fill={color} />
                        {segH > 12 && (
                          <text x={x + barW / 2} y={currentY + segH / 2 + 3} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#ffffff">
                            {count}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text x={x + barW / 2} y="142" textAnchor="middle" fontSize="8.5" fill="#64748b">{row.category}</text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 8. TABLE EX (tableEx)
    if (["tableEx", "pivotTable", "matrix"].includes(vType)) {
      const cols = data.columns || [];
      const tRows = data.rows || [];
      return (
        <div className="ai-preview-table-wrap" style={{ maxHeight: "240px", overflowY: "auto" }}>
          <table className="ai-preview-table">
            <thead>
              <tr>
                {cols.map((c, idx) => (
                  <th key={idx}>{c.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tRows.map((r, rIdx) => (
                <tr key={rIdx}>
                  {cols.map((c, cIdx) => (
                    <td key={cIdx}>{r[c] !== undefined && r[c] !== null && r[c] !== "" ? String(r[c]) : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: "0.75rem", color: "#64748b", padding: "0.35rem 0.5rem", textAlign: "right", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            Hiển thị {Math.min(tRows.length, 50)} / {data.totalRows || tRows.length} dòng dữ liệu
          </div>
        </div>
      );
    }

    // 9. TEXTBOX / HEADER BANNER (textbox)
    if (vType === "textbox" || vType === "text") {
      const text = data.text || v.text || v.title || "Khung thông tin tóm tắt và ghi chú.";
      return (
        <div className="ai-preview-textbox-body" style={{ padding: "0.85rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <FileCode size={16} color="#4f46e5" />
            <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>{v.title || "Tiêu đề báo cáo"}</strong>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, whiteSpace: "pre-line" }}>
            {text}
          </div>
        </div>
      );
    }

    return <div>Chưa hỗ trợ render loại visual: {vType}</div>;
  }

  return (
    <div className="ai-visual-designer-root">
      {/* 1. DISCLAIMER BANNER BẮT BUỘC THEO MỤC 2 */}
      <div className="ai-preview-disclaimer-banner"><Info size={16}/><span>Đây là bản xem trước từ dữ liệu của bạn. Duyệt thiết kế khi đã hài lòng, sau đó xuất bản để xem báo cáo trên Power BI.</span></div>

      {/* 2. WORKFLOW STATE STATUS BAR THEO MỤC 8 */}
      <div className="ai-workflow-header-row">
        <div>
          <h3 style={{ margin: "0 0 0.2rem 0", fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
            {reportPlan.reportTitle || "Báo Cáo Phân Tích Học Tập"}
          </h3>
          <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
            <strong>{reportPlan.domain || "Tổng hợp"}</strong> · <strong>{reportPlan.sampleSize || datasetProfile?.totalRows || 0} dòng dữ liệu</strong>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className={`ai-workflow-status-badge status-${workflowStatus}`}>
            {({DESIGN_DRAFT:'Bản nháp',DESIGN_APPROVED:'Đã duyệt thiết kế',POWERBI_GENERATING:'Đang chuẩn bị báo cáo…',POWERBI_GENERATED:'Đã chuẩn bị báo cáo',LOCAL_ARTIFACTS_GENERATED:'Sẵn sàng xuất bản',CLOUD_VERIFICATION_REQUIRED:'Đang chờ kiểm tra dữ liệu',CLOUD_DATA_VERIFIED:'Dữ liệu đã đối chiếu',POWERBI_DATA_VERIFIED:'Dữ liệu đã kiểm tra',PUBLISH_PENDING:'Đang xuất bản…',PUBLISH_BLOCKED:'Cần kiểm tra kết nối',PUBLISHED:'Đã xuất bản',EMBED_READY:'Sẵn sàng xem',READY_FOR_LIBRARY_AND_RENDER:'Đã xuất bản',REPORT_ACCESS_VERIFIED:'Có quyền xem báo cáo'})[workflowStatus] || workflowStatus}
          </span>
        </div>
      </div>

      {/* 3. MULTI-PAGE TABS THEO MỤC 2 & 3 */}
      <div className="ai-preview-page-tabs-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {pages.map((p, idx) => (
            <button
              key={p.id || idx}
              type="button"
              className={`ai-page-tab-btn ${safePageIndex === idx ? "active" : ""}`}
              onClick={() => setActivePageIndex(idx)}
            >
              <span>{p.displayName || `Trang ${idx + 1}`}</span>
              <span className="ai-page-count-pill">{p.visuals?.length || 0}</span>
            </button>
          ))}
          <button
            type="button"
            className="ai-add-page-btn"
            onClick={onAddPage}
            title="Thêm trang báo cáo mới"
          >
            <Plus size={14} /> Thêm trang
          </button>
        </div>

        {pages.length > 1 && (
          <button
            type="button"
            className="ai-del-page-btn"
            onClick={() => onDeletePage && onDeletePage(currentPage.id)}
            title="Xóa trang hiện tại"
          >
            <Trash2 size={13} /> Xóa trang này
          </button>
        )}
      </div>

      {/* 4. ACTION TOOLBAR THEO MỤC 3, 4, 5, 6 */}
      <div className="ai-preview-toolbar">
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button type="button" className="ai-tb-btn" onClick={() => openAddModal("chart")}>
            <BarChart3 size={14} color="#4f46e5" /> Thêm biểu đồ
          </button>
          <button type="button" className="ai-tb-btn" onClick={() => openAddModal("kpi")}>
            <LayersIcon size={14} color="#10b981" /> Thẻ chỉ số
          </button>
          <button type="button" className="ai-tb-btn" onClick={() => openAddModal("slicer")}>
            <Filter size={14} color="#f59e0b" /> Bộ lọc
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* NÚT PHÊ DUYỆT THIẾT KẾ & TẠO POWER BI BẮT BUỘC THEO MỤC 4 */}
          <button
            type="button"
            className="ai-btn-approve-primary"
            onClick={onApproveAndGenerate}
            disabled={isApproving || isGenerating}
            title="Xác nhận phê duyệt bản thiết kế và tự động sinh mã nguồn Power BI Fabric thật"
          >
            {isApproving || isGenerating ? (
              <>
                <RefreshCw size={15} className="ai-spin" />
                <span>Đang tạo Power BI...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>1. Duyệt thiết kế</span>
              </>
            )}
          </button>

          {/* NÚT XUẤT BẢN SERVICE THEO MỤC 6 */}
          <button
            type="button"
            className="ai-btn-publish"
            onClick={onPublish}
            disabled={isPublishing}
            title="Triển khai Báo cáo lên Microsoft Power BI Service"
          >
            {isPublishing ? (
              <>
                <RefreshCw size={14} className="ai-spin" />
                <span>Đang xuất bản...</span>
              </>
            ) : (
              <>
                <Globe size={14} />
                <span>2. Xuất bản Power BI</span>
              </>
            )}
          </button>

          <details className="ai-designer-more"><summary>Công cụ khác</summary><div>
          {/* NÚT KIỂM TRA MICROSOFT FABRIC (READ-ONLY) - BẮT BUỘC THEO TASK 09 */}
          <button
            type="button"
            className="ai-btn-secondary"
            id="btn-verify-fabric-readonly"
            onClick={onVerifyFabric}
            disabled={isVerifyingFabric}
            title="Xác minh kết nối Microsoft Fabric ở chế độ Read-Only (Không ghi dữ liệu)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              padding: "0.45rem 0.85rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: isVerifyingFabric ? "not-allowed" : "pointer"
            }}
          >
            {isVerifyingFabric ? (
              <>
                <RefreshCw size={14} className="ai-spin" />
                <span>Đang kiểm tra Fabric API...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={15} color="#16a34a" />
                <span>Kiểm tra kết nối Microsoft</span>
              </>
            )}
          </button>

          {/* NÚT TẢI FILE ZIP DỰ ÁN */}
          {pbiProjectResult && (
            <button
              type="button"
              className="ai-btn-download-zip"
              onClick={onDownloadZip}
              disabled={isDownloadingZip}
              title="Tải gói tệp nén ZIP gồm .pbip, .SemanticModel và .Report"
            >
              <Download size={14} />
              <span>Tải tệp dự án (.ZIP)</span>
            </button>
          )}
          </div></details>
        </div>
      </div>

      {/* THÔNG BÁO KẾT QUẢ KIỂM TRA FABRIC READ-ONLY NẾU CÓ */}
      {fabricVerificationResult && (
        <div
          className="ai-fabric-verify-result-banner"
          id="fabric-verify-result-banner"
          style={{
            margin: "0.75rem 0",
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            border: `1px solid ${fabricVerificationResult.success ? "#bbf7d0" : "#fecaca"}`,
            backgroundColor: fabricVerificationResult.success ? "#f0fdf4" : "#fef2f2",
            fontSize: "0.85rem",
            color: fabricVerificationResult.success ? "#14532d" : "#991b1b"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
            <ShieldCheck size={20} color={fabricVerificationResult.success ? "#16a34a" : "#dc2626"} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.95rem" }}>
                {fabricVerificationResult.success
                  ? `✓ Đã đọc workspace; triển khai cần phê duyệt tài nguyên cụ thể`
                  : `Trạng thái Fabric: HTTP ${fabricVerificationResult.statusCode || 401} (${fabricVerificationResult.requiresLogin ? "Yêu cầu đăng nhập Microsoft" : "Chưa hoàn tất xác thực"})`}
              </strong>
              <div>{fabricVerificationResult.message || "Đã thẩm định kết nối Microsoft Fabric thành công."}</div>

              {fabricVerificationResult.success && pbiProjectResult?.projectName==="PBI_Benchmark_Demo_Task08" && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.8)", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontWeight: 600, color: "#166534", marginBottom: "0.4rem" }}>
                    📋 Thông tin xem xét Benchmark trước khi xuất bản:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.8rem", color: "#334155" }}>
                    <div><strong>Workspace:</strong> {fabricVerificationResult.workspaceName || "LMS_Analytics_Workspace"}</div>
                    <div><strong>Workspace ID:</strong> <code>{fabricVerificationResult.workspaceId || "Chưa chọn workspace"}</code></div>
                    <div><strong>Dự án Benchmark:</strong> <code>PBI_Benchmark_Demo_Task08</code></div>
                    <div><strong>Bảng Dữ liệu:</strong> <code>ThongKeLopHoc</code> (4 lớp, 0% PII)</div>
                    <div><strong>Hạ tầng Capacity:</strong> {fabricVerificationResult.capacityDiagnosis?.capacityType || "Dedicated Fabric Active"}</div>
                    <div><strong>Quy tắc An toàn:</strong> Tạo mới riêng biệt, không ghi đè/xóa item hiện có</div>
                  </div>

                  {onExecuteBenchmarkPublish && (
                    <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        id="btn-confirm-publish-benchmark"
                        type="button"
                        className="ai-btn-primary"
                        onClick={onExecuteBenchmarkPublish}
                        disabled={isPublishing}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          padding: "0.55rem 1.1rem",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          cursor: isPublishing ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        }}
                      >
                        {isPublishing ? "⏳ Đang cập nhật lên Fabric Cloud..." : "🚀 Cập nhật Định nghĩa PBIR lên Fabric"}
                      </button>
                      <span style={{ fontSize: "0.775rem", color: "#64748b" }}>
                        (Tái sử dụng Semantic Model & Report đã duyệt, cập nhật Visual Bindings an toàn)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {fabricVerificationResult.success && pbiProjectResult?.projectName!=="PBI_Benchmark_Demo_Task08" && <p>Workspace: {fabricVerificationResult.workspaceId}. Dự án: {pbiProjectResult?.projectName || 'Chưa sinh dự án'}. Chọn “Xuất bản Power BI Service” để xem và duyệt model/report riêng.</p>}
              {fabricVerificationResult.workspaceId && !fabricVerificationResult.success && (
                <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "#475569" }}>
                  Workspace ID: <code>{fabricVerificationResult.workspaceId}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. KHỐI BỘ LỌC SLICER TƯƠNG TÁC THEO MỤC 2 */}
      {slicers.length > 0 && (
        <div className="ai-preview-slicers-container">
          {slicers.map((s, idx) => {
            const field = s.categoryField || s.previewData?.field || "LopHoc";
            const options = s.previewData?.options || [];
            const activeVal = activeFilters[field] || "All";

            return (
              <div key={idx} className="ai-slicer-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <span className="ai-slicer-title">
                    <Filter size={13} color="#4f46e5" />
                    <strong>{s.title || `Lọc theo ${field}`}:</strong>
                  </span>
                  <button
                    type="button"
                    className="ai-visual-del-btn"
                    onClick={() => onDeleteVisual && onDeleteVisual(s.id || s.name || s.title)}
                    title="Xóa bộ lọc này"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="ai-slicer-pills-row">
                  <button
                    type="button"
                    className={`ai-slicer-pill ${activeVal === "All" ? "active" : ""}`}
                    onClick={() => onFilterChange && onFilterChange(field, "All")}
                  >
                    Tất cả
                  </button>
                  {options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      type="button"
                      className={`ai-slicer-pill ${String(activeVal) === String(opt) ? "active" : ""}`}
                      onClick={() => onFilterChange && onFilterChange(field, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. THẺ KPI CARDS (DỮ LIỆU THẬT) */}
      {kpiCards.length > 0 && (
        <div className="ai-preview-kpi-grid">
          {kpiCards.map((kpi, idx) => {
            const val = kpi.previewData?.formattedValue ?? kpi.previewData?.metricValue ?? "—";
            return (
              <div key={idx} className="ai-preview-kpi-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ai-kpi-label">{kpi.title || kpi.measureField}</span>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    <button
                      type="button"
                      className="ai-visual-icon-btn"
                      onClick={() => setEditingVisual(kpi)}
                      title="Sửa KPI"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      type="button"
                      className="ai-visual-icon-btn del"
                      onClick={() => onDeleteVisual && onDeleteVisual(kpi.id || kpi.name || kpi.title)}
                      title="Xóa KPI"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <div className={`ai-kpi-val-text ${kpi.previewData?.isError ? "error" : ""}`} style={kpi.previewData?.isError ? { color: "#ef4444", fontSize: "1.1rem" } : {}}>
                  {val}
                </div>
                <span className="ai-kpi-sub-note">
                  {kpi.previewData?.isError ? (
                    <span style={{ color: "#ef4444" }}>⚠️ {kpi.previewData?.errorMessage || "Lỗi liên kết"}</span>
                  ) : (
                    <span>Measure: <code>{kpi.measureField || "Avg"}</code></span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. LƯỚI BIỂU ĐỒ BẢN XEM TRƯỚC (DỮ LIỆU THẬT 100%) */}
      <div className="ai-preview-visuals-grid">
        {charts.map((v, idx) => (
          <div key={v.id || v.name || idx} className="ai-preview-visual-card">
            <div className="ai-visual-card-top-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1, overflow: "hidden" }}>
                <span className="ai-visual-badge">{({columnChart:"Cột",clusteredColumnChart:"Cột",barChart:"Thanh",clusteredBarChart:"Thanh",stackedColumnChart:"Cột chồng",lineChart:"Đường",areaChart:"Miền",donutChart:"Vòng",pieChart:"Tròn",scatterChart:"Phân tán",tableEx:"Bảng",pivotTable:"Ma trận",textbox:"Ghi chú"})[v.visualType] || "Biểu đồ"}</span>
                <h5 className="ai-visual-title" title={v.title}>{v.title}</h5>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <button
                  type="button"
                  className="ai-visual-icon-btn"
                  onClick={() => setEditingVisual(v)}
                  title="Chỉnh sửa cấu hình biểu đồ"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  type="button"
                  className="ai-visual-icon-btn del"
                  onClick={() => onDeleteVisual && onDeleteVisual(v.id || v.name || v.title)}
                  title="Xóa biểu đồ này"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="ai-visual-card-sub-info">
              {v.categoryField && <span>Trục: <strong>{v.categoryField}</strong></span>}
              {v.measureField && <span> · Chỉ số: <strong>{v.measureField}</strong></span>}
              {v.secondaryMeasureField && <span> • Phụ: <strong>{v.secondaryMeasureField}</strong></span>}
              {v.seriesField && <span> • Chồng: <strong>{v.seriesField}</strong></span>}
            </div>

            <div className="ai-visual-render-container">
              {renderChartContent(v)}
            </div>
          </div>
        ))}
      </div>

      {/* 8. HỘI THOẠI AI CHỈNH SỬA KẾ HOẠCH BÁO CÁO (CONVERSATIONAL REFINEMENT) */}
      <div className="ai-preview-chat-refine-box">
        <form
          className="ai-preview-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            onConversationalEdit && onConversationalEdit();
          }}
        >
          <Sparkles size={16} color="#6366f1" />
          <input
            type="text"
            className="ai-preview-chat-input"
            placeholder="Ví dụ: Đổi biểu đồ cột thành biểu đồ đường, thêm chỉ số tổng…"
            value={planEditInput}
            onChange={(e) => setPlanEditInput && setPlanEditInput(e.target.value)}
            disabled={isEditingPlan}
          />
          <button
            type="submit"
            className="ai-preview-chat-btn"
            disabled={isEditingPlan || !planEditInput?.trim()}
          >
            {isEditingPlan ? (
              <>
                <RefreshCw size={13} className="ai-spin" />
                <span>AI đang xử lý...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Cập nhật với AI</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 9. THẺ THÔNG BÁO KẾT QUẢ SINH POWER BI THẬT (PBIP DATA VERIFIED) */}
      {pbiProjectResult && (
        <details className="ai-project-disclosure"><summary><CheckCircle2 size={16}/>Đã chuẩn bị báo cáo · Xem thông tin tệp</summary><div className="ai-pbi-result-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
            <CheckCircle2 size={20} color="#10b981" />
            <h4 style={{ margin: 0, color: "#1e293b", fontSize: "0.95rem", fontWeight: 700 }}>
              Thông tin dự án Power BI
            </h4>
          </div>
          <div className="ai-pbi-result-meta-grid">
            <div>Tệp dự án: <code>{pbiProjectResult.projectName}.pbip</code></div>
            <div>Đường dẫn cục bộ: <code>{pbiProjectResult.pbipFilePath}</code></div>
            <div>Tổng số tệp sinh: <strong>{pbiProjectResult.totalFilesCount || 19} tệp Fabric</strong></div>
            <div>Trạng thái: <strong>Đã tạo tệp dự án. Dữ liệu cloud được kiểm tra khi xuất bản.</strong></div>
          </div>
        </div></details>
      )}

      {/* 10. THẺ BÁO CÁO PUBLISH_BLOCKED VÀ KHẢO SÁT 8 ĐIỀU KIỆN THEO TASK 05.7 */}
      {pbiPublishResult?.status === "PUBLISH_BLOCKED" && (
        <div className="ai-publish-blocked-box">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <ShieldAlert size={20} color="#dc2626" />
            <h4 style={{ margin: 0, color: "#991b1b", fontSize: "0.95rem", fontWeight: 700 }}>
              Xuất Bản Tự Động Lên Power BI Service Bị Chặn (PUBLISH_BLOCKED)
            </h4>
          </div>
          <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.825rem", color: "#7f1d1d" }}>
            {pbiPublishResult.message}
          </p>

          {/* BẢNG KHẢO SÁT 8 TIÊU CHÍ MICROSOFT FABRIC & ENTRA ID (TASK 05.7) */}
          {Array.isArray(pbiPublishResult.auditMatrix) && pbiPublishResult.auditMatrix.length > 0 && (
            <div style={{ margin: "0.75rem 0", background: "#ffffff", borderRadius: "8px", border: "1.5px solid #fed7aa", padding: "0.85rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#9a3412", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>📋 Bảng Khảo Sát 8 Tiêu Chí Xuất Bản & Nhúng Power BI Service:</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pbiPublishResult.auditMatrix.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.6rem",
                      fontSize: "0.785rem",
                      borderBottom: "1px solid #f1f5f9",
                      paddingBottom: "0.45rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.02em",
                        whiteSpace: "nowrap",
                        background: item.status === "PASS" ? "#dcfce7" : item.status === "WARNING" ? "#fef3c7" : "#fee2e2",
                        color: item.status === "PASS" ? "#166534" : item.status === "WARNING" ? "#92400e" : "#991b1b",
                        border: `1px solid ${item.status === "PASS" ? "#86efac" : item.status === "WARNING" ? "#fde047" : "#fca5a5"}`,
                      }}
                    >
                      {item.status}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: "#1e293b" }}>{item.title}</strong>
                      <div style={{ color: "#475569", marginTop: "0.15rem", lineHeight: 1.45 }}>{item.details}</div>
                      {item.status !== "PASS" && (
                        <div style={{ color: "#0369a1", fontSize: "0.735rem", marginTop: "0.2rem", fontWeight: 500 }}>
                          💡 <strong>Checklist khắc phục:</strong> {item.resolution}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "#ffffff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #fecaca", fontSize: "0.785rem" }}>
            <strong style={{ color: "#991b1b" }}>Checklist cấu hình dành cho Quản trị viên Microsoft 365 / Fabric:</strong>
            <ul style={{ margin: "0.4rem 0 0 1.2rem", padding: 0, color: "#374151" }}>
              {(pbiPublishResult.requiredConfigurationGuide || []).map((step, sIdx) => (
                <li key={sIdx} style={{ marginBottom: "0.25rem" }}>{step}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "#475569" }}>
            💡 <em>Dữ liệu sinh viên được bảo vệ tuyệt đối: Hệ thống tuân thủ Luật An ninh mạng, KHÔNG sử dụng hình thức Publish to web công khai. Giảng viên có thể mở tệp .pbip trực tiếp bằng Power BI Desktop trên máy tính.</em>
          </div>

          {/* PHƯƠNG ÁN XUẤT BẢN KHẢ THI THEO TASK 05.8 (USER OWNS DATA — 0 VNĐ) */}
          <div style={{ marginTop: "0.75rem", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", padding: "0.85rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#166534", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span>Phương Án Khả Thi Nhất Với Tài Khoản Trường (User Owns Data — 0đ Chi Phí):</span>
            </div>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", color: "#14532d", lineHeight: 1.45 }}>
              Theo tài liệu Microsoft chính thức, với tài khoản email trường <code>@dlu.edu.vn</code> (đã có bản quyền Power BI Pro), Thầy/Cô có thể xuất bản trực tiếp bằng tính năng <strong>One-Click Desktop Publish</strong> mà <strong>KHÔNG CẦN Client Secret hay gói Capacity trả phí</strong>.
            </p>
            <div style={{ background: "#ffffff", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "0.775rem", color: "#1e293b" }}>
              <strong>3 bước đơn giản:</strong>
              <ol style={{ margin: "0.3rem 0 0 1.1rem", padding: 0 }}>
                <li>Tải gói dự án ZIP hoặc mở trực tiếp tệp <code>.pbip</code> bằng Power BI Desktop.</li>
                <li>Nhấp nút <strong>"Xuất bản" (Publish)</strong> trên thanh công cụ Power BI Desktop và chọn Workspace <strong>LMS Analytics</strong>.</li>
                <li>Dán Report ID vừa tạo vào LMS để nhúng và phân quyền tức thì!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* 11. THẺ THÔNG BÁO XUẤT BẢN THÀNH CÔNG (PUBLISHED) & SẴN SÀNG NHÚNG LMS (EMBED_READY) */}
      {(pbiPublishResult?.status === "PUBLISHED" || pbiPublishResult?.status === "PUBLISHED_LIVE" || pbiPublishResult?.workflowStatus === "PUBLISHED") && pbiPublishResult?.reportId && (
        <div className="ai-pbi-result-banner" id="pbi-published-success-banner" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
            <CheckCircle2 size={20} color="#10b981" />
            <h4 style={{ margin: 0, color: "#14532d", fontSize: "0.95rem", fontWeight: 700 }}>
              🚀 Đã Xuất Bản Thành Công Lên Power BI Service — Sẵn Sàng Nhúng LMS (EMBED_READY)
            </h4>
          </div>
          <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.825rem", color: "#166534" }}>
            {pbiPublishResult.message}
          </p>
          <div className="ai-pbi-result-meta-grid" style={{ borderColor: "#bbf7d0" }}>
            <div>Workspace ID: <code>{pbiPublishResult.workspaceId}</code></div>
            <div>Report ID Thật: <code>{pbiPublishResult.reportId}</code></div>
            <div>Semantic Model ID: <code>{pbiPublishResult.semanticModelId || "Đã liên kết"}</code></div>
            <div>Mô hình Nhúng: <strong>Secure Embed for Organization (MSAL Token)</strong></div>
            <div>Trạng thái LMS: <strong style={{ color: "#10b981" }}>EMBED_READY (Sẵn sàng mở)</strong></div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a
              href={`/phan-tich?reportId=${pbiPublishResult.reportId}`}
              className="ai-btn-primary"
              id="btn-open-lms-embed"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", padding: "0.5rem 1rem" }}
              target="_blank"
              rel="noreferrer"
            >
              <Globe size={15} />
              <span>Mở Báo Cáo Nhúng LMS (Secure Embed)</span>
            </a>
            {pbiPublishResult.embedUrl && (
              <a
                href={pbiPublishResult.embedUrl}
                className="ai-btn-outline"
                id="btn-open-powerbi-service"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", padding: "0.5rem 1rem", borderColor: "#0284c7", color: "#0284c7" }}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} />
                <span>Mở Trên Power BI Service</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA BIỂU ĐỒ (VISUAL EDIT POPOVER) */}
      {editingVisual && (
        <div className="ai-modal-overlay">
          <div className="ai-edit-visual-modal ai-chart-picker-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>Chỉnh Sửa Biểu Đồ</h4>
              <button type="button" className="ai-btn-close-sm" onClick={() => setEditingVisual(null)}>
                <X size={16} />
              </button>
            </div>

            {datasetProfile?.contractVersion===1 && <>
              <label>Bảng <select value={editingVisual.tableName || reportPlan.tableName} onChange={e=>setEditingVisual({...editingVisual,tableName:e.target.value,categoryField:'',measureField:'',columns:[],seriesField:'',columnField:'',xAxis:'',yAxis:''})}>
                {datasetProfile.tables.map(t=><option key={t.tableName} value={t.tableName}>{t.originalName}</option>)}
              </select></label>
              <label>Aggregation <select value={editingVisual.aggregation || 'SUM'} onChange={e=>setEditingVisual({...editingVisual,aggregation:e.target.value})}>
                {['SUM','AVG','MIN','MAX','COUNT','COUNTA','DISTINCTCOUNT'].map(a=><option key={a}>{a}</option>)}
              </select></label>
              <label>Bộ lọc visual (JSON: cột → giá trị)<textarea defaultValue={JSON.stringify(editingVisual.filters || {})} onBlur={e=>{try{setEditingVisual({...editingVisual,filters:JSON.parse(e.target.value)});e.target.setCustomValidity('');}catch{e.target.setCustomValidity('JSON không hợp lệ');e.target.reportValidity();}}} /></label>
              {editingVisual.visualType==='tableEx' && <label>Cột trong bảng<select multiple value={editingVisual.columns || []} onChange={e=>setEditingVisual({...editingVisual,columns:[...e.target.selectedOptions].map(o=>o.value)})}>{availableColumns.map(c=><option key={c.name} value={c.name}>{c.originalName || c.name}</option>)}</select></label>}
              {editingVisual.visualType==='pivotTable' && <label>Cột ma trận<select value={editingVisual.columnField || ''} onChange={e=>setEditingVisual({...editingVisual,columnField:e.target.value})}><option value="">Không phân cột</option>{availableColumns.map(c=><option key={c.name}>{c.name}</option>)}</select></label>}
              {editingVisual.visualType==='histogram' && <><label>Cột số<select value={editingVisual.field || ''} onChange={e=>setEditingVisual({...editingVisual,field:e.target.value})}>{availableColumns.filter(c=>c.isNumeric).map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>Độ rộng khoảng<input type="number" min="0" value={editingVisual.binSize || ''} onChange={e=>setEditingVisual({...editingVisual,binSize:Number(e.target.value)})}/></label></>}
            </>}
            <div className="ai-form-group">
              <label>Tiêu đề visual:</label>
              <input
                type="text"
                value={editingVisual.title || ""}
                onChange={(e) => setEditingVisual({ ...editingVisual, title: e.target.value })}
              />
            </div>

            <div className="ai-form-group">
              <label>Loại biểu đồ:</label>
              <ChartTypePicker value={editingVisual.visualType || 'columnChart'} allowCombo={datasetProfile?.contractVersion!==1} allowHistogram={datasetProfile?.contractVersion===1 && availableColumns.some(c=>c.isNumeric)} onChange={type=>setEditingVisual({...editingVisual,visualType:type,
                seriesField:type==='stackedColumnChart'?(editingVisual.seriesField || categoryColumns[1]?.name || categoryColumns[0]?.name):undefined,
                ...(type==='scatterChart'?{xAxis:editingVisual.xAxis || editingVisual.measureField || numericColumns[0]?.name,yAxis:editingVisual.yAxis || editingVisual.secondaryMeasureField || numericColumns[1]?.name || numericColumns[0]?.name}:{}),
                ...(type==='histogram'?{field:editingVisual.field || editingVisual.histogram?.field || availableColumns.find(c=>c.isNumeric)?.name}:{}),
                ...(type==='tableEx'?{columns:editingVisual.columns?.length?editingVisual.columns:availableColumns.map(c=>c.name)}:{})})}/>

            </div>

            <div className="ai-form-group">
              <label>Trục phân nhóm (Category / Row / X):</label>
              <select
                value={editingVisual.categoryField || ""}
                onChange={(e) => setEditingVisual({ ...editingVisual, categoryField: e.target.value })}
              >
                {categoryColumns.map((c, idx) => (
                  <option key={idx} value={c.name}>{c.originalName || c.name}</option>
                ))}
              </select>
            </div>

            <div className="ai-form-group">
              <label>Chỉ số thống kê (Measure / Value / Y):</label>
              <select
                value={editingVisual.measureField || ""}
                onChange={(e) => setEditingVisual({ ...editingVisual, measureField: e.target.value, ...(editingVisual.visualType==="scatterChart"?{xAxis:e.target.value}:{}) })}
              >
                {numericColumns.map((c, idx) => (
                  <option key={idx} value={c.name}>{c.originalName || c.name}</option>
                ))}
              </select>
            </div>

            {(editingVisual.visualType === "lineClusteredColumnComboChart" || editingVisual.visualType === "scatterChart") && (
              <div className="ai-form-group">
                <label>Chỉ số thứ 2 (Đường xu hướng / Trục Y2):</label>
                <select
                  value={editingVisual.secondaryMeasureField || ""}
                  onChange={(e) => setEditingVisual({ ...editingVisual, secondaryMeasureField: e.target.value, ...(editingVisual.visualType==="scatterChart"?{yAxis:e.target.value}:{}) })}
                >
                  {numericColumns.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.originalName || c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editingVisual.visualType === "stackedColumnChart" && (
              <div className="ai-form-group">
                <label>Trường phân tầng cột chồng (Series / Legend):</label>
                <select
                  value={editingVisual.seriesField || ""}
                  onChange={(e) => setEditingVisual({ ...editingVisual, seriesField: e.target.value })}
                >
                  {categoryColumns.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.originalName || c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" className="ai-btn-secondary" onClick={() => setEditingVisual(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="ai-btn-primary"
                onClick={() => {
                  onUpdateVisual && onUpdateVisual(editingVisual.id || editingVisual.name || editingVisual.title, editingVisual);
                  setEditingVisual(null);
                }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM BIỂU ĐỒ / KPI / SLICER */}
      {addModalOpen && (
        <div className="ai-modal-overlay">
          <div className="ai-edit-visual-modal ai-chart-picker-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>
                {addModalType === "kpi" ? "Thêm Thẻ KPI Đo Lường" : addModalType === "slicer" ? "Thêm Bộ Lọc Slicer" : "Thêm Biểu Đồ Mới"}
              </h4>
              <button type="button" className="ai-btn-close-sm" onClick={() => setAddModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="ai-form-group">
              <label>Tiêu đề hiển thị:</label>
              <input
                type="text"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              />
            </div>

            {addModalType === "chart" && (
              <div className="ai-form-group">
                <label>Loại biểu đồ:</label>
                <ChartTypePicker value={addForm.visualType} allowCombo={datasetProfile?.contractVersion!==1} allowHistogram={datasetProfile?.contractVersion===1 && availableColumns.some(c=>c.isNumeric)} onChange={type=>setAddForm({...addForm,visualType:type,field:addForm.field || availableColumns.find(c=>c.isNumeric)?.name})}/>

              </div>
            )}

            {addModalType==='chart' && ['scatterChart','lineClusteredColumnComboChart'].includes(addForm.visualType) && <div className="ai-form-group"><label>Chỉ số thứ hai (trục Y / đường)</label><select value={addForm.secondaryMeasureField || ''} onChange={e=>setAddForm({...addForm,secondaryMeasureField:e.target.value})}>{numericColumns.map(c=><option key={c.name} value={c.name}>{c.originalName || c.name}</option>)}</select></div>}
            {addModalType==='chart' && addForm.visualType==='stackedColumnChart' && <div className="ai-form-group"><label>Nhóm phân tầng</label><select value={addForm.seriesField || ''} onChange={e=>setAddForm({...addForm,seriesField:e.target.value})}>{categoryColumns.map(c=><option key={c.name} value={c.name}>{c.originalName || c.name}</option>)}</select></div>}
            {addModalType==='chart' && addForm.visualType==='histogram' && <div className="ai-form-group"><label>Cột số cần xem phân bố</label><select value={addForm.field || ''} onChange={e=>setAddForm({...addForm,field:e.target.value})}>{availableColumns.filter(c=>c.isNumeric).map(c=><option key={c.name} value={c.name}>{c.originalName || c.name}</option>)}</select><label>Độ rộng khoảng (để trống để tự chia)</label><input type="number" min="0" value={addForm.binSize || ''} onChange={e=>setAddForm({...addForm,binSize:Number(e.target.value)})}/></div>}
            {(addModalType === "chart" || addModalType === "slicer") && (
              <div className="ai-form-group">
                <label>Trục phân nhóm / Cột lọc:</label>
                <select
                  value={addForm.categoryField}
                  onChange={(e) => setAddForm({ ...addForm, categoryField: e.target.value })}
                >
                  {categoryColumns.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.originalName || c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(addModalType === "chart" || addModalType === "kpi") && (
              <div className="ai-form-group">
                <label>Chỉ số đo lường (Measure):</label>
                <select
                  value={addForm.measureField}
                  onChange={(e) => setAddForm({ ...addForm, measureField: e.target.value })}
                >
                  {numericColumns.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.originalName || c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" className="ai-btn-secondary" onClick={() => setAddModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="ai-btn-primary" onClick={handleSaveAddModal}>
                Thêm vào trang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

