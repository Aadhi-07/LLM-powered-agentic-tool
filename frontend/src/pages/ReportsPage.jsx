import { useEffect, useMemo, useState } from 'react';
import { Search, FileX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReportCard from '../components/ReportCard';
import { getReports } from '../api/client';

function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getReports();
        setReports(data?.reports || []);
      } catch (err) {
        setError(err.message || 'Unable to load reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) {
      return reports;
    }
    return reports.filter((report) => report.filename.toLowerCase().includes(text));
  }, [query, reports]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/70 bg-card/70 p-5 sm:p-6">
        <h2 className="text-2xl font-bold text-slate-100">Saved Reports</h2>
        <p className="mt-1 text-sm text-slate-400">Browse all markdown outputs from your research runs.</p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
          <Search className="text-slate-500" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by filename"
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</section>
      )}

      {loading && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-slate-700/70 bg-card/70 p-4">
              <div className="h-5 w-24 animate-pulse rounded bg-slate-800" />
              <div className="mt-4 h-4 w-11/12 animate-pulse rounded bg-slate-800" />
              <div className="mt-2 h-4 w-7/12 animate-pulse rounded bg-slate-800" />
              <div className="mt-5 h-3 w-8/12 animate-pulse rounded bg-slate-800" />
              <div className="mt-2 h-3 w-6/12 animate-pulse rounded bg-slate-800" />
            </div>
          ))}
        </section>
      )}

      {!loading && filtered.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report) => (
            <ReportCard
              key={report.filename}
              report={report}
              onClick={() =>
                navigate(`/report/${encodeURIComponent(report.filename)}`, {
                  state: { report },
                })
              }
            />
          ))}
        </section>
      )}

      {!loading && !error && filtered.length === 0 && (
        <section className="rounded-2xl border border-dashed border-slate-700 bg-card/50 p-10 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-slate-800 p-4 text-slate-400">
            <FileX size={26} />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">No reports found</h3>
          <p className="mt-1 text-sm text-slate-400">
            {reports.length === 0 ? 'Run research from the home page to generate your first report.' : 'Try a different filename filter.'}
          </p>
        </section>
      )}
    </div>
  );
}

export default ReportsPage;