import React, { useState } from 'react';
import { Layers, FileText, CircleHelp, BrainCircuit } from 'lucide-react';
import SecurePowerBIReport from '../powerbi/SecurePowerBIReport';
import { POWER_BI_PAGES_CONFIG } from '../../config/powerBiConfig';

const REPORTS = [
  { key: 'ASSIGNMENT', icon: FileText },
  { key: 'QUIZ', icon: CircleHelp },
  { key: 'KNOWLEDGE_GAP', icon: BrainCircuit },
];

export default function AssignmentPowerBITab({ selectedCourse, cohort = 'ALL' }) {
  const [activeReport, setActiveReport] = useState('ASSIGNMENT');
  const report = POWER_BI_PAGES_CONFIG[activeReport];
  return (
    <div className="assignment-powerbi-content">
      <nav className="assignment-powerbi-tabs" aria-label="Phân hệ thống kê Power BI">
        <span className="assignment-powerbi-label"><Layers size={16} /> Phân hệ:</span>
        {REPORTS.map(({ key, icon: Icon }) => (
          <button key={key} type="button"
            className={`assignment-powerbi-tab ${activeReport === key ? 'active' : ''}`}
            aria-pressed={activeReport === key} onClick={() => setActiveReport(key)}>
            <Icon size={16} />{POWER_BI_PAGES_CONFIG[key].label}
          </button>
        ))}
      </nav>
      <section className="monitor-panel assignment-powerbi-description" aria-label={report.label}>
        <h2>{report.label}</h2><p>{report.description}</p>
      </section>
      <div className="pbi-report-wrapper">
        <SecurePowerBIReport courseKey={selectedCourse?.Course_Key}
          cohort={cohort === 'ALL' ? '' : cohort} targetPage={report.id}
          height="auto" hidePageNavigation={true} />
      </div>
    </div>
  );
}
