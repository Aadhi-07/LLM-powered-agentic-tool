import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ArrowLeft, Download, ListTree } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getReport, getReports } from '../api/client';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function formatCreated(created) {
  if (!created) {
    return 'Unknown date';
  }

  const numeric = Number(created);
  const date = Number.isNaN(numeric) ? new Date(created) : new Date(numeric * 1000);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

function getHeadingText(node) {
  if (!node) {
    return '';
  }

  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(getHeadingText).join(' ');
  }

  if (node.props?.children) {
    return getHeadingText(node.props.children);
  }

  return '';
}

function extractToc(markdown = '') {
  const entries = [];
  const regex = /^(#{1,3})\s+(.+)$/gm;
  let match = regex.exec(markdown);

  while (match) {
    entries.push({
      level: match[1].length,
      text: match[2].trim(),
      id: slugify(match[2]),
    });
    match = regex.exec(markdown);
  }

  return entries;
}

function ReportViewerPage() {
  const { filename } = useParams();
  const location = useLocation();
  const decodedFilename = decodeURIComponent(filename || '');

  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState(location.state?.report || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      if (!decodedFilename) {
        setError('Missing report filename.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [reportData, listData] = await Promise.all([getReport(decodedFilename), getReports()]);
        setContent(reportData?.content || '');

        const matched = (listData?.reports || []).find((item) => item.filename === decodedFilename);
        setMetadata(matched || location.state?.report || null);
      } catch (err) {
        setError(err.message || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [decodedFilename, location.state?.report]);

  const toc = useMemo(() => extractToc(content), [content]);

  const headingRenderer = (Tag) =>
    function HeadingComponent(props) {
      const text = getHeadingText(props.children);
      return <Tag id={slugify(text)}>{props.children}</Tag>;
    };

  const handleDownload = () => {
    if (!content) {
      return;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = decodedFilename || `report-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-card/70 p-5">
        <div className="space-y-1">
          <Link to="/reports" className="inline-flex items-center gap-2 text-sm text-accent hover:text-violet-300">
            <ArrowLeft size={16} />
            Back to Reports
          </Link>
          <h2 className="break-all text-xl font-semibold text-slate-100">{decodedFilename || 'Report Viewer'}</h2>
          <p className="text-xs text-slate-400">
            Size: {metadata?.size_kb ?? 'Unknown'} KB | Created: {formatCreated(metadata?.created)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!content}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          Download .md
        </button>
      </div>

      {loading && (
        <section className="rounded-2xl border border-slate-700/70 bg-card/70 p-6">
          <div className="h-5 w-56 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-11/12 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-10/12 animate-pulse rounded bg-slate-800" />
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</section>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[270px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-700/70 bg-card/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-100">
              <ListTree size={16} className="text-accent" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Table of Contents</h3>
            </div>
            {toc.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-300">
                {toc.map((item) => (
                  <li key={`${item.id}-${item.level}`} className={item.level > 1 ? 'ml-3' : ''}>
                    <a href={`#${item.id}`} className="hover:text-accent">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No headings found in this report.</p>
            )}
          </aside>

          <article className="markdown-content rounded-2xl border border-slate-700/70 bg-card/70 p-5 sm:p-6">
            {content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  h1: headingRenderer('h1'),
                  h2: headingRenderer('h2'),
                  h3: headingRenderer('h3'),
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-slate-400">This report is empty.</p>
            )}
          </article>
        </div>
      )}
    </div>
  );
}

export default ReportViewerPage;