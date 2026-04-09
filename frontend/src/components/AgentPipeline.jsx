import { ArrowRight, ListChecks, Bot } from 'lucide-react';

const AGENTS = [
  {
    key: 'planner',
    title: 'Planner Agent',
    icon: ListChecks,
    color: 'text-researcher',
    ring: 'ring-researcher/60',
    bg: 'bg-researcher/15',
  },
  {
    key: 'executor',
    title: 'Executor Agent',
    icon: Bot,
    color: 'text-accent',
    ring: 'ring-accent/60',
    bg: 'bg-accent/15',
  },
];

function AgentPipeline({ activeIndex = -1, running = false, completed = false }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-card/70 p-4 shadow-2xl shadow-black/25 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Agent Pipeline</h3>
        <p className="text-sm text-slate-400">Planner to Executor</p>
      </div>

      <div className="flex flex-col items-stretch justify-center gap-2 md:flex-row md:items-center md:gap-3">
        {AGENTS.map((agent, idx) => {
          const isActive = running && activeIndex === idx;
          const isDone = completed || idx < activeIndex;
          const Icon = agent.icon;

          return (
            <div key={agent.key} className="contents">
              <div
                className={`relative min-h-28 flex-1 overflow-hidden rounded-xl border border-slate-700/70 p-4 transition-all duration-500 ${
                  isDone ? 'bg-slate-800/80' : 'bg-slate-900/70'
                } ${isActive ? `ring-2 ${agent.ring} animate-glow-pulse` : ''}`}
              >
                <div
                  className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition ${
                    isActive || isDone ? agent.bg : 'bg-slate-700/0'
                  }`}
                />
                <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex rounded-lg p-2 ${isActive || isDone ? agent.bg : 'bg-slate-800'} ${agent.color}`}>
                      <Icon size={18} />
                    </span>
                    {isActive ? (
                      <span className="text-xs font-medium text-slate-200">Active</span>
                    ) : isDone ? (
                      <span className="text-xs font-medium text-emerald-300">Complete</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">Queued</span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-slate-100">{agent.title}</p>
                </div>
              </div>

              {idx < AGENTS.length - 1 && (
                <div className="relative flex h-8 items-center justify-center md:h-auto md:w-12">
                  <div className="hidden h-px w-12 bg-slate-700 md:block" />
                  <div className="block h-8 w-px bg-slate-700 md:hidden" />
                  {running && activeIndex === idx && (
                    <span className="pointer-events-none absolute hidden h-2 w-2 rounded-full bg-accent shadow-[0_0_16px_rgba(124,58,237,0.95)] md:block md:animate-travel" />
                  )}
                  <ArrowRight className="absolute hidden text-slate-500 md:block" size={16} />
                  <ArrowRight className="absolute rotate-90 text-slate-500 md:hidden" size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AgentPipeline;