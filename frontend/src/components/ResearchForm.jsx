import { Sparkles, Zap, Brain } from 'lucide-react';

const EXAMPLES = [
  'Latest breakthroughs in AI agents for autonomous software development',
  'Market analysis of EV battery recycling startups in India and US',
  'Compare open-source vector databases for enterprise RAG systems',
];

function ResearchForm({ topic, setTopic, mode, setMode, onSubmit, isRunning, disabled }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-700/70 bg-card/70 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-200">
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-lg font-semibold">Choose a Research Topic</h2>
        </div>
        
        {/* Fast/Deep Mode Toggle */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700/80 p-1 w-max">
          <button
            type="button"
            onClick={() => setMode('fast')}
            disabled={disabled || isRunning}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === 'fast' 
                ? 'bg-researcher/20 text-researcher shadow-sm' 
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Zap size={14} />
            Fast
          </button>
          <button
            type="button"
            onClick={() => setMode('deep')}
            disabled={disabled || isRunning}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === 'deep' 
                ? 'bg-critic/20 text-critic shadow-sm' 
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Brain size={14} />
            Deep
          </button>
        </div>
      </div>

      <textarea
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        rows={5}
        placeholder={EXAMPLES.join('\n')}
        className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-accent focus:ring-2 focus:ring-accent/20"
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setTopic(example)}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-accent/60 hover:text-accent"
          >
            Use example
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={disabled || isRunning || !topic.trim()}
        className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? 'Researching...' : `Start Research (${mode === 'fast' ? '< 10 sec' : '~ 1-2 min'})`}
      </button>
    </form>
  );
}

export default ResearchForm;