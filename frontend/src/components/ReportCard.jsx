import { FileText } from 'lucide-react';

function formatCreated(created) {
  if (!created) {
    return 'Unknown date';
  }
  const numeric = Number(created);
  const date = Number.isNaN(numeric) ? new Date(created) : new Date(numeric * 1000);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

function ReportCard({ report, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-slate-700/70 bg-card/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="mb-3 inline-flex rounded-lg bg-accent/20 p-2 text-accent">
        <FileText size={18} />
      </div>
      <h3 className="line-clamp-2 break-all text-sm font-semibold text-slate-100">{report.filename}</h3>
      <div className="mt-3 space-y-1 text-xs text-slate-400">
        <p>Size: {report.size_kb} KB</p>
        <p>Created: {formatCreated(report.created)}</p>
      </div>
    </button>
  );
}

export default ReportCard;