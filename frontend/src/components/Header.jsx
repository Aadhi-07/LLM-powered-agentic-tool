import { NavLink } from 'react-router-dom';
import { Activity, Bot } from 'lucide-react';

function Header({ health, healthLoading }) {
  const isOnline = health?.status === 'ok';
  const hasKey = Boolean(health?.groq_api_key_set);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="group inline-flex items-center gap-2">
          <div className="rounded-lg bg-accent/20 p-2 text-accent transition group-hover:bg-accent/30">
            <Bot size={20} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Multi-Agent Research</p>
            <h1 className="text-lg font-semibold text-slate-100">ResearchCrew AI</h1>
          </div>
        </NavLink>

        <nav className="flex items-center gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-accent/20 text-accent' : 'text-slate-300 hover:bg-slate-800/70'
              }`
            }
          >
            Research
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-accent/20 text-accent' : 'text-slate-300 hover:bg-slate-800/70'
              }`
            }
          >
            Reports
          </NavLink>

          <div className="ml-2 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            <Activity size={14} className={healthLoading ? 'animate-pulse text-slate-400' : ''} />
            <span
              className={`h-2 w-2 rounded-full ${
                healthLoading
                  ? 'bg-slate-500'
                  : isOnline && hasKey
                    ? 'bg-emerald-400'
                    : isOnline
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
              }`}
            />
            {healthLoading
              ? 'Checking API...'
              : isOnline && hasKey
                ? 'API healthy'
                : isOnline
                  ? 'API up, key missing'
                  : 'API offline'}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;