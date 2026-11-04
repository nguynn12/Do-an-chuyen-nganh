import { ChevronRight } from "lucide-react";

function SummaryCard({ icon, label, value, subtext, className, onClick }) {
  return (
    <button
      className={`summary-item ${className}`}
      onClick={onClick}
      type="button"
    >
      <div className="summary-icon" aria-hidden="true">{icon}</div>

      <div className="summary-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {subtext && <small>{subtext}</small>}
      </div>

      <ChevronRight className="summary-arrow" size={18} aria-hidden="true" />
    </button>
  );
}

export default SummaryCard;
