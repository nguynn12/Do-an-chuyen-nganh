import { parseNumericValue } from './chartAggregationService.js';
// Cloud diagnostics use ordinary OAuth tokens supplied by the caller. Never read
// browser caches, global process tokens or disk token files.
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateIds({ workspaceId, semanticModelId, reportId }) {
  for (const [key, value] of Object.entries({ workspaceId, semanticModelId, reportId })) {
    if (value !== undefined && !guid.test(value)) throw new Error(`INVALID_${key}`);
  }
  if (!workspaceId || !semanticModelId) throw new Error('MODEL_IDS_REQUIRED');
}

export function buildSourceGroundTruth(spec, profile, rows) {
  const tableName = spec.tableName || profile.tableName || 'Data';
  const measures = {};
  const unsupportedMeasures = [];
  for (const measure of spec.measures || []) {
    const dax = String(measure.dax || '').trim();
    const countRows = /^COUNTROWS\(\s*(?:'([^']+)'|([^()]+))\s*\)$/i.exec(dax);
    if (countRows && (countRows[1] || countRows[2]).trim() === tableName) { measures[measure.name] = rows.length || null; continue; }
    const agg = /^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|DISTINCTCOUNT)\(\s*(?:'([^']+)'|([^\[]+))\[([^\]]+)\]\s*\)$/i.exec(dax);
    if (!agg || (agg[2] || agg[3]).trim() !== tableName) { unsupportedMeasures.push(measure.name); continue; }
    const col = profile.columns?.find(c => c.name === agg[4] || c.name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g,'_') === agg[4]);
    if (!col) { unsupportedMeasures.push(measure.name); continue; }
    const raw = rows.map(row=>row[col.name]);
    const values = raw.map(parseNumericValue).filter(n=>n!==null && Number.isFinite(n));
    const op=agg[1].toUpperCase();
    if (op==='DISTINCTCOUNT') measures[measure.name]=new Set(raw.map(v=>v===''||v===undefined?null:v)).size;
    else if (op==='COUNTA') measures[measure.name]=raw.filter(v=>v!==null && v!==undefined && v!=='').length;
    else if (op==='COUNT') measures[measure.name]=values.length;
    else if (!values.length) measures[measure.name]=null;
    else if (op==='SUM') measures[measure.name]=values.reduce((a,b)=>a+b,0);
    else if (op==='AVERAGE') measures[measure.name]=values.reduce((a,b)=>a+b,0)/values.length;
    else if (op==='MIN') measures[measure.name]=Math.min(...values);
    else if (op==='MAX') measures[measure.name]=Math.max(...values);
  }
  return { tableName, rowCount: rows.length, measures, measureNames: (spec.measures || []).map(m=>m.name), unsupportedMeasures };
}
async function request(url, token, method = 'GET', body) {
  if (!token) return { httpStatus: null, ok: false, error: 'MICROSOFT_LOGIN_REQUIRED' };
  try {
    const res = await fetch(url, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    return { httpStatus: res.status, ok: res.ok, requestId: res.headers.get('requestId') || res.headers.get('x-ms-request-id'),
      location: res.headers.get('Location'), data };
  } catch (err) {
    return { httpStatus: null, ok: false, error: err.name === 'TimeoutError' ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR' };
  }
}

export function buildDataProbe(tableName, measureNames = []) {
  const table = `'${String(tableName).replace(/'/g, "''")}'`;
  const names = [...new Set(measureNames)];
  return {
    rowCount: `EVALUATE ROW("RowCount", COUNTROWS(${table}))`,
    measures: names.length ? `EVALUATE ROW(${names.map((name, i) => `"Metric${i}", [${String(name).replace(/]/g, ']]')}]`).join(', ')})` : null,
    measureNames: names,
  };
}
function firstRow(result) {
  if (!result?.ok || result.data?.error || result.data?.results?.some(r => r.error)) return null;
  return result.data?.results?.[0]?.tables?.[0]?.rows?.[0] || null;
}

// A successful HTTP status or completed refresh alone is insufficient.
export function assessCloudData({ model, report, rowCount, measures, measureNames = [], expected = {} }) {
  const blockers = [];
  if (!model?.ok || (expected.semanticModelId && model.data?.id !== expected.semanticModelId)) blockers.push('MODEL_READ_FAILED');
  if (report && (!report.ok || report.data?.datasetId !== expected.semanticModelId)) blockers.push('REPORT_MODEL_MISMATCH');
  const count = firstRow(rowCount)?.['[RowCount]'];
  if (!Number.isInteger(count) || count <= 0) blockers.push(count === 0 || (count === null && firstRow(rowCount)) ? 'MODEL_EMPTY_OR_UNPROCESSED' : 'ROWCOUNT_QUERY_FAILED');
  if (expected.rowCount !== undefined && count !== expected.rowCount) blockers.push('ROWCOUNT_MISMATCH');
  const values = firstRow(measures);
  for (const [i, name] of measureNames.entries()) {
    const value = values?.[`[Metric${i}]`];
    if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) blockers.push(`MEASURE_BLANK_OR_INVALID:${name}`);
    else if (expected.measures?.[name] !== undefined && Math.abs(value - expected.measures[name]) > 1e-8 * Math.max(1, Math.abs(expected.measures[name]))) blockers.push(`MEASURE_MISMATCH:${name}`);
  }
  // Require source ground truth for every measure; nonblank alone is not correctness.
  if (expected.rowCount === undefined || measureNames.some(name => typeof expected.measures?.[name] !== 'number' || !Number.isFinite(expected.measures[name]))) blockers.push('SOURCE_GROUND_TRUTH_REQUIRED');
  return { status: blockers.length ? 'CLOUD_DATA_UNVERIFIED' : 'CLOUD_DATA_VERIFIED',
    cloudDataVerified: blockers.length === 0, observedRowCount: count ?? null, blockers,
    processing: count > 0 ? 'QUERYABLE_ROWS_OBSERVED' : 'NOT_CONFIRMED',
    reportRendered: false, embedVerified: false };
}

export async function diagnoseCloudModel({ workspaceId, semanticModelId, reportId, powerBiToken, fabricToken, tableName, measureNames, expected = {} }) {
  validateIds({ workspaceId, semanticModelId, reportId });
  const pbi = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}`;
  const dataset = `${pbi}/datasets/${semanticModelId}`;
  const probes = buildDataProbe(tableName, measureNames);
  const query = text => request(`${dataset}/executeQueries`, powerBiToken, 'POST', { queries: [{ query: text }], serializerSettings: { includeNulls: true } });
  const [model, report, refreshHistory, dataSources, rowCount, measures, fabricModel] = await Promise.all([
    request(dataset, powerBiToken), reportId ? request(`${pbi}/reports/${reportId}`, powerBiToken) : undefined,
    request(`${dataset}/refreshes?$top=10`, powerBiToken), request(`${dataset}/datasources`, powerBiToken),
    query(probes.rowCount), probes.measures ? query(probes.measures) : undefined,
    request(`https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/semanticModels/${semanticModelId}`, fabricToken),
  ]);
  return { checkedAt: new Date().toISOString(), workspaceId, semanticModelId, reportId,
    model, report, refreshHistory, dataSources, fabricModel, probes, rowCount, measures,
    ...assessCloudData({ model, report, rowCount, measures, measureNames: probes.measureNames, expected: { ...expected, semanticModelId } }) };
}

// Definition retrieval is read-only despite Microsoft's POST verb.
export async function readCloudDefinition({ workspaceId, semanticModelId, fabricToken }) {
  validateIds({ workspaceId, semanticModelId });
  return request(`https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/semanticModels/${semanticModelId}/getDefinition?format=TMDL`, fabricToken, 'POST');
}

// Refresh is a separate, explicit operation. Acceptance is never reported as data verified.
export async function processExistingModel({ workspaceId, semanticModelId, powerBiToken, dryRun = true, approval }) {
  validateIds({ workspaceId, semanticModelId });
  if (dryRun !== false || approval?.action !== 'REFRESH_MODEL' || approval.workspaceId !== workspaceId || approval.semanticModelId !== semanticModelId) {
    return { status: 'REFRESH_APPROVAL_REQUIRED', dryRun: true, workspaceId, semanticModelId, cloudDataVerified: false };
  }
  const result = await request(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${semanticModelId}/refreshes`, powerBiToken, 'POST', { notifyOption: 'NoNotification' });
  return { ...result, status: result.ok ? 'PROCESSING_ACCEPTED_VERIFICATION_REQUIRED' : 'PROCESSING_FAILED', cloudDataVerified: false };
}

export async function observeModelProcessing({ workspaceId, semanticModelId, powerBiToken, requestId }) {
  validateIds({ workspaceId, semanticModelId });
  if (!requestId) throw new Error('REFRESH_REQUEST_ID_REQUIRED');
  const history = await request(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${semanticModelId}/refreshes?$top=60`, powerBiToken);
  const refresh = history.ok ? history.data?.value?.find(r=>r.requestId === requestId) : null;
  return { history, refresh: refresh || null,
    status: refresh?.status === 'Completed' ? 'PROCESSING_COMPLETED_QUERY_VERIFICATION_REQUIRED'
      : ['Failed','Cancelled','Disabled'].includes(refresh?.status) ? 'PROCESSING_FAILED'
      : 'PROCESSING_PENDING_OR_UNCONFIRMED', cloudDataVerified: false };
}
