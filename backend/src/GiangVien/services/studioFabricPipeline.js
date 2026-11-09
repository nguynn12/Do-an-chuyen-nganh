import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { packagePbipToFabricItemDefinition, validateFabricReportDefinition } from './powerBiAuthoringService.js';
import { diagnoseCloudModel } from './powerBiDataVerificationService.js';

const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const active=new Set();
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function paths(projectName,projectDir) {
  if(!/^[a-zA-Z0-9_-]+$/.test(projectName || '')) throw new Error('INVALID_PROJECT_NAME');
  return {manifest:path.join(projectDir,`${projectName}.verification.json`),contract:path.join(projectDir,`${projectName}.dataset.json`),job:path.join(projectDir,`${projectName}.deployment.json`)};
}
export function prepareStudioDeployment({projectName,projectDir,workspaceId,owner}) {
  if(!guid.test(workspaceId || '')) throw new Error('WORKSPACE_SELECTION_REQUIRED');
  if(!owner?.userKey || !owner?.moodleUserId) throw new Error('AUTHENTICATED_OWNER_REQUIRED');
  const files=paths(projectName,projectDir);
  const contract=JSON.parse(fs.readFileSync(files.contract,'utf8'));
  const manifest=JSON.parse(fs.readFileSync(files.manifest,'utf8'));
  if(!guid.test(contract.datasetId) || contract.datasetId!==manifest.datasetId) throw new Error('DATASET_CONTRACT_MISMATCH');
  if(!contract.reportPlan.approvalHash) throw new Error('DESIGN_APPROVAL_REQUIRED');
  if(contract.owner?.userKey!==owner.userKey || contract.owner?.moodleUserId!==owner.moodleUserId) throw new Error('PROJECT_OWNER_MISMATCH');
  for(const table of manifest.tables) {
    if(!table.rowCount || table.unsupportedMeasures?.length) throw new Error('SOURCE_VERIFICATION_UNSUPPORTED');
    if(table.measureNames.some(name=>table.measures[name]===null)) throw new Error('EXPECTED_BLANK_MEASURE: Chọn measure có dữ liệu hoặc loại measure all-null trước publish.');
  }
  const pkg=packagePbipToFabricItemDefinition(projectName,projectDir);
  const suffix=contract.datasetId;
  const semanticModelName=`${projectName}_${suffix}_Model`;
  const reportName=`${projectName}_${suffix}_Report`;
  const intent={version:1,projectName,datasetId:contract.datasetId,workspaceId,owner:{userKey:owner.userKey,moodleUserId:owner.moodleUserId},
    semanticModelName,reportName,approvalHash:contract.reportPlan.approvalHash,
    payloadHash:sha({semantic:pkg.semanticModelItem.definition,report:pkg.reportItem.definition,manifest,plan:contract.reportPlan}),
    actions:['CHECK_WORKSPACE','CREATE_OWN_SEMANTIC_MODEL','PROCESS_IMPORT_MODEL','VERIFY_DAX','CREATE_LINKED_REPORT','VERIFY_REPORT_BINDING','LINK_OWN_LIBRARY','SECURE_EMBED'],
    sourceRowCounts:Object.fromEntries(manifest.tables.map(t=>[t.tableName,t.rowCount]))};
  return {...intent,intentHash:sha(intent),dryRun:true,status:'AWAITING_EXPLICIT_CLOUD_APPROVAL',cloudDataVerified:false,reportRendered:false,embedVerified:false};
}
function checkedOperationUrl(url) {
  const parsed=new URL(url);
  if(parsed.origin!=='https://api.fabric.microsoft.com' || !/^\/v1\/operations\/[0-9a-f-]+(?:\/result)?$/i.test(parsed.pathname)) throw new Error('UNTRUSTED_FABRIC_OPERATION_URL');
  return parsed.toString();
}
async function http(url,token,method='GET',body) {
  const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`CLOUD_HTTP_${response.status}:${data.errorCode || data.error?.code || response.statusText}`);
  return {response,data};
}
async function resolveCreatedItem(result,token,timeoutMs,onOperation=()=>{}) {
  if([200,201].includes(result.response.status) && guid.test(result.data.id || '')) return result.data.id;
  if(result.response.status!==202) throw new Error('CREATE_RESPONSE_HAS_NO_ITEM_GUID');
  const location=result.response.headers.get('Operation-Location') || result.response.headers.get('Location');
  if(!location && !guid.test(result.response.headers.get('x-ms-operation-id') || '')) throw new Error('LRO_LOCATION_MISSING');
  const operationId=result.response.headers.get('x-ms-operation-id');
  // Microsoft documents constructing the canonical state URL from this GUID.
  const operation=guid.test(operationId || '') ? `https://api.fabric.microsoft.com/v1/operations/${operationId}` : checkedOperationUrl(location);
  onOperation(operation);const start=Date.now();
  while(Date.now()-start<timeoutMs) {
    const poll=await http(operation,token);
    if(poll.data.status==='Failed' || poll.data.status==='Cancelled') throw new Error(`FABRIC_LRO_${poll.data.status}`);
    if(poll.data.status==='Succeeded') {
      const resultUrl=checkedOperationUrl(`${operation.replace(/\/result$/,'')}/result`);
      const final=await http(resultUrl,token);
      if(!guid.test(final.data.id || '')) throw new Error('LRO_RESULT_HAS_NO_ITEM_GUID');
      return final.data.id; // Never use the operation's id or the string "result".
    }
    await pause(Math.min(5000,(Number(poll.response.headers.get('Retry-After')) || 2)*1000));
  }
  throw new Error('FABRIC_LRO_PENDING_RESUME_WITHOUT_CREATE');
}
export async function executeStudioDeployment({projectName,projectDir,workspaceId,owner,fabricToken,powerBiToken,approval,dryRun=true,timeoutMs=90000}) {
  const intent=prepareStudioDeployment({projectName,projectDir,workspaceId,owner});
  if(dryRun!==false || approval?.intentHash!==intent.intentHash || approval?.action!=='CREATE_PROCESS_VERIFY_REPORT') return intent;
  if(!fabricToken || !powerBiToken) throw new Error('DISTINCT_FABRIC_AND_POWERBI_TOKENS_REQUIRED');
  const files=paths(projectName,projectDir);
  if(active.has(files.job)) throw new Error('DEPLOYMENT_IN_PROGRESS');
  active.add(files.job);
  let job=fs.existsSync(files.job)?JSON.parse(fs.readFileSync(files.job,'utf8')):{intentHash:intent.intentHash,datasetId:intent.datasetId,workspaceId,owner:intent.owner,phase:'PREPARED',events:[]};
  const save=(phase,details={})=>{Object.assign(job,details,{phase});job.events.push({phase,at:new Date().toISOString()});fs.writeFileSync(files.job,JSON.stringify(job,null,2),'utf8');};
  try {
    if(job.intentHash!==intent.intentHash) throw new Error('PROJECT_CHANGED_REQUIRES_NEW_DEPLOYMENT: Không ghi đè model/report đã triển khai.');
    const base=`https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}`;
    const ws=await http(base,fabricToken);
    if(!ws.data.capacityId) throw new Error('WORKSPACE_CAPACITY_REQUIRED');
    const items=[];let next=`${base}/items`;
    while(next) {
      if(!next.startsWith(`${base}/items`)) throw new Error('UNTRUSTED_ITEMS_CONTINUATION');
      const page=await http(next,fabricToken);items.push(...(page.data.value || []));next=page.data.continuationUri || null;
    }
    const pkg=packagePbipToFabricItemDefinition(projectName,projectDir);
    const findItem=(name,type)=>{const matches=items.filter(i=>i.displayName===name && i.type===type);if(matches.length>1)throw new Error('AMBIGUOUS_EXISTING_ITEMS');return matches[0];};
    const model=findItem(intent.semanticModelName,'SemanticModel');
    if(model && !job.semanticModelId && job.phase==='PREPARED') throw new Error('ITEM_ALREADY_EXISTS_REQUIRES_RECONCILIATION');
    if(!job.semanticModelId && model && guid.test(model.id)) save('MODEL_RESOLVED',{semanticModelId:model.id});
    if(!job.semanticModelId) {
      if(job.modelOperationUrl) {
        const response=new Response('{}',{status:202,headers:{Location:job.modelOperationUrl}});
        save('MODEL_CREATED',{semanticModelId:await resolveCreatedItem({response,data:{}},fabricToken,timeoutMs)});
      }
      if(!job.semanticModelId && job.modelCreateAttempted) throw new Error('MODEL_CREATE_UNCERTAIN: Kiểm tra operation/items; không tự POST lại.');
      if(!job.semanticModelId) {
      save('MODEL_CREATE_IN_FLIGHT',{modelCreateAttempted:true});
      const created=await http(`${base}/items`,fabricToken,'POST',{...pkg.semanticModelItem,displayName:intent.semanticModelName});
      const id=await resolveCreatedItem(created,fabricToken,timeoutMs,url=>save('MODEL_CREATE_IN_FLIGHT',{modelOperationUrl:url}));
      save('MODEL_CREATED',{semanticModelId:id});
      }
    }
    if(!guid.test(job.semanticModelId)) throw new Error('INVALID_MODEL_GUID');
    const pbi=`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${job.semanticModelId}`;
    if(!job.processAttempted) {
      save('PROCESS_IN_FLIGHT',{processAttempted:true,processAcceptedAt:new Date().toISOString()});
      const processed=await http(`${pbi}/refreshes`,powerBiToken,'POST',{notifyOption:'NoNotification'});
      const location=processed.response.headers.get('Location');
      const fromLocation=location?.split('/').pop();
      const requestId=guid.test(fromLocation || '')?fromLocation:processed.response.headers.get('x-ms-request-id') || processed.response.headers.get('requestId');
      save('PROCESS_ACCEPTED',{refreshRequestId:requestId || null,refreshHttpStatus:processed.response.status});
    }
    const manifest=JSON.parse(fs.readFileSync(files.manifest,'utf8'));
    const started=Date.now();let diagnostics=[];
    do {
      const history=await http(`${pbi}/refreshes?$top=60`,powerBiToken);
      const refresh=job.refreshRequestId ? history.data.value?.find(r=>r.requestId===job.refreshRequestId) : null;
      if(['Failed','Cancelled','Disabled'].includes(refresh?.status)) throw new Error(`IMPORT_PROCESS_${refresh.status}`);
      diagnostics=[];
      for(const table of manifest.tables) diagnostics.push(await diagnoseCloudModel({workspaceId,semanticModelId:job.semanticModelId,powerBiToken,
        tableName:table.tableName,measureNames:table.measureNames,expected:table}));
      if(diagnostics.every(d=>d.cloudDataVerified)) break;
      if(Date.now()-started>=timeoutMs) {save('DATA_UNVERIFIED',{verification:diagnostics.map(d=>({table:d.probes.rowCount,status:d.status,blockers:d.blockers,observedRowCount:d.observedRowCount}))});return {...job,success:false,cloudDataVerified:false,reportRendered:false,embedVerified:false};}
      await pause(2000);
    } while(true);
    save('CLOUD_DATA_VERIFIED',{cloudDataVerified:true,verifiedAt:new Date().toISOString(),verification:diagnostics.map(d=>({table:d.probes.rowCount,observedRowCount:d.observedRowCount,status:d.status}))});
    const report=findItem(intent.reportName,'Report');
    if(report && !job.reportId && !job.reportCreateAttempted) throw new Error('REPORT_ALREADY_EXISTS_REQUIRES_RECONCILIATION');
    if(!job.reportId && report && guid.test(report.id)) save('REPORT_RESOLVED',{reportId:report.id});
    if(!job.reportId) {
      if(job.reportOperationUrl) {
        const response=new Response('{}',{status:202,headers:{Location:job.reportOperationUrl}});
        save('REPORT_CREATED',{reportId:await resolveCreatedItem({response,data:{}},fabricToken,timeoutMs)});
      }
      if(!job.reportId && job.reportCreateAttempted) throw new Error('REPORT_CREATE_UNCERTAIN: Không tự POST lại.');
      if(!job.reportId) {
      const reportItem={...pkg.reportItem,displayName:intent.reportName,definition:{...pkg.reportItem.definition,parts:pkg.reportItem.definition.parts.map(p=>p.path==='definition.pbir'?{...p,payload:Buffer.from(JSON.stringify({$schema:'https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json',version:'4.0',datasetReference:{byConnection:{connectionString:`semanticmodelid=${job.semanticModelId}`}}})).toString('base64')}:p)}};
      validateFabricReportDefinition(reportItem,job.semanticModelId,pkg.modelSchema);
      save('REPORT_CREATE_IN_FLIGHT',{reportCreateAttempted:true});
      const created=await http(`${base}/items`,fabricToken,'POST',reportItem);
      save('REPORT_CREATED',{reportId:await resolveCreatedItem(created,fabricToken,timeoutMs,url=>save('REPORT_CREATE_IN_FLIGHT',{reportOperationUrl:url}))});
      }
    }
    const verified=await http(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${job.reportId}`,powerBiToken);
    if(verified.data.id!==job.reportId || verified.data.datasetId!==job.semanticModelId) throw new Error('REPORT_MODEL_MISMATCH');
    save('READY_FOR_LIBRARY_AND_RENDER',{reportAccessVerified:true,embedUrl:`https://app.powerbi.com/reportEmbed?reportId=${job.reportId}&groupId=${workspaceId}`});
    return {...job,success:true,cloudDataVerified:true,reportRendered:false,embedVerified:false};
  } catch(error) {
    if(job.intentHash===intent.intentHash) {job.lastError=error.message;fs.writeFileSync(files.job,JSON.stringify(job,null,2),'utf8');}
    throw error;
  } finally {active.delete(files.job);}
}
