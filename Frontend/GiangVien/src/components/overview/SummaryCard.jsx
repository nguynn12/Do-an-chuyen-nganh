import { ChevronRight } from "lucide-react";

function SummaryCard({ icon, label, value, subtext, className, onClick }) {
  return (
    <button
      className={`summary-item ${className}`}
      onClick={onClick}
      type="button"
    >
      <div className="summary-icon">{icon}</div>

      <div className="summary-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {subtext && <small>{subtext}</small>}
      </div>

      <ChevronRight className="summary-arrow" size={18} />
    </button>
  );
}

export default SummaryCard;
