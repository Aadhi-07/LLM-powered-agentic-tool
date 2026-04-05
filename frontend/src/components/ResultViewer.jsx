import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Clipboard, Download } from 'lucide-react';

function ResultViewer({ result, isRunning, error, onCopy, onDownload }) {
  if (isRunning) {
    return (
      <section className="animate-float-in rounded-2xl border border-slate-700/70 bg-card/70 p-5 sm:p-6">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-slate-700/80" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-9/12 animate-pulse rounded bg-slate-800" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-200">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide">Research Error</h3>
        <p className="text-sm">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-2xl border border-slate-700/70 bg-card/60 p-5 text-slate-400">
        Submit a topic to generate a full markdown research report.
      </section>
    );
  }

  return (
    <section className="animate-float-in rounded-2xl border border-slate-700/70 bg-card/70 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Research Report</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition hover:border-accent/60 hover:text-accent"
          >
            <Clipboard size={16} />
            Copy to Clipboard
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            <Download size={16} />
            Download .md
          </button>
        </div>
      </div>

      <article className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {result}
        </ReactMarkdown>
      </article>
    </section>
  );
}

export default ResultViewer;