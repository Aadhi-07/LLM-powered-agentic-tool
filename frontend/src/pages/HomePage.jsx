import { useEffect, useMemo, useRef, useState } from 'react';
import AgentPipeline from '../components/AgentPipeline';
import ResearchForm from '../components/ResearchForm';
import ResultViewer from '../components/ResultViewer';
import { startResearchSync } from '../api/client';

const AGENT_NAMES = ['Researcher', 'Analyst', 'Writer', 'Critic'];
const ESTIMATED_TOTAL_SECONDS = 120;

function formatEta(seconds) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function HomePage() {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [etaSeconds, setEtaSeconds] = useState(ESTIMATED_TOTAL_SECONDS);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  const activeAgentName = useMemo(() => {
    if (!isRunning || activeIndex < 0 || activeIndex >= AGENT_NAMES.length) {
      return 'Waiting to start';
    }
    return AGENT_NAMES[activeIndex];
  }, [activeIndex, isRunning]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const handleStartResearch = async (event) => {
    event.preventDefault();

    if (!topic.trim() || isRunning) {
      return;
    }

    setIsRunning(true);
    setResult('');
    setError('');
    setActiveIndex(0);
    setEtaSeconds(ESTIMATED_TOTAL_SECONDS);

    clearTimer();
    timerRef.current = setInterval(() => {
      setEtaSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        const elapsed = ESTIMATED_TOTAL_SECONDS - next;
        const nextAgent = Math.min(3, Math.floor(elapsed / 30));
        setActiveIndex(nextAgent);
        return next;
      });
    }, 1000);

    try {
      const data = await startResearchSync(topic.trim());
      const generated = data?.result?.trim();
      if (!generated) {
        setError('Research completed but no report text was returned.');
        return;
      }

      setResult(generated);
      setActiveIndex(3);
      setEtaSeconds(0);
    } catch (err) {
      setError(err.message || 'Unexpected error while running research.');
    } finally {
      clearTimer();
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
    } catch {
      setError('Unable to copy. Your browser may be blocking clipboard access.');
    }
  };

  const handleDownload = () => {
    if (!result) {
      return;
    }

    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-report-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/70 bg-card/70 p-6 sm:p-8">
        <h2 className="mb-3 bg-[linear-gradient(120deg,#a78bfa,#7c3aed,#60a5fa)] bg-[length:240%_240%] bg-clip-text text-3xl font-extrabold text-transparent animate-gradient-shift sm:text-5xl">
          ResearchCrew AI
        </h2>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Run a coordinated 4-agent workflow where each specialist refines the previous stage into a polished markdown report.
        </p>
      </section>

      <AgentPipeline activeIndex={activeIndex} running={isRunning} completed={!isRunning && !!result} />

      {(isRunning || error) && (
        <section className="rounded-2xl border border-slate-700/70 bg-card/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current Step</p>
              <p className="text-lg font-semibold text-slate-100">{activeAgentName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Estimated Time Remaining</p>
              <p className="text-lg font-semibold text-accent">{isRunning ? formatEta(etaSeconds) : '0:00'}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-researcher via-accent to-critic ${
                isRunning ? 'w-2/5 animate-pulse' : result ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </section>
      )}

      <ResearchForm
        topic={topic}
        setTopic={setTopic}
        onSubmit={handleStartResearch}
        isRunning={isRunning}
        disabled={false}
      />

      <ResultViewer
        result={result}
        isRunning={isRunning}
        error={error && !isRunning ? error : ''}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />
    </div>
  );
}

export default HomePage;