// User-owns-data access check: exactly one read, no data re-audit or Fabric writes.
export async function verifyExistingReportAccess({ workspaceId, reportId, semanticModelId, powerBiToken }) {
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![workspaceId, reportId, semanticModelId].every(id => guid.test(id || ''))) {
    return { ok: false, httpStatus: 400, code: 'INVALID_REPORT_TARGET' };
  }
  if (!powerBiToken) return { ok: false, httpStatus: 401, code: 'POWERBI_LOGIN_REQUIRED' };
  try {
    const response = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`, {
      method: 'GET', headers: { Authorization: `Bearer ${powerBiToken}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { ok: false, httpStatus: response.status, code: 'REPORT_ACCESS_DENIED' };
    const report = await response.json();
    if (report.id !== reportId || report.datasetId !== semanticModelId) {
      return { ok: false, httpStatus: response.status, code: 'REPORT_MODEL_MISMATCH' };
    }
    // Construct only the authenticated reportEmbed URL for the verified target.
    return { ok: true, httpStatus: response.status, reportId, semanticModelId, workspaceId,
      reportName: report.name,
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      reportAccessVerified: true, reportRendered: false, embedVerified: false };
  } catch { return { ok: false, httpStatus: null, code: 'POWERBI_API_UNREACHABLE' }; }
}
