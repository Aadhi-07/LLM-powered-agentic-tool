import { useEffect, useMemo, useRef, useState } from 'react';
import AgentPipeline from '../components/AgentPipeline';
import ResearchForm from '../components/ResearchForm';
import ResultViewer from '../components/ResultViewer';
import { startResearch, getResearchStatus } from '../api/client';

const AGENT_NAMES = ['Planner', 'Executor'];
const ESTIMATED_TOTAL_SECONDS = 120;

function formatDuration(seconds) {
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const etaSeconds = Math.max(0, ESTIMATED_TOTAL_SECONDS - elapsedSeconds);
  const overEstimateSeconds = Math.max(0, elapsedSeconds - ESTIMATED_TOTAL_SECONDS);
  const isOverEstimate = isRunning && overEstimateSeconds > 0;
  const runningProgress = Math.min(
    95,
    Math.round((Math.min(elapsedSeconds, ESTIMATED_TOTAL_SECONDS) / ESTIMATED_TOTAL_SECONDS) * 100),
  );

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

  const clearPoller = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearTimer();
      clearPoller();
    },
    [],
  );

  const handleStartResearch = async (event) => {
    event.preventDefault();

    if (!topic.trim() || isRunning) {
      return;
    }

    setIsRunning(true);
    setResult('');
    setError('');
    setActiveIndex(0);
    setElapsedSeconds(0);

    clearTimer();
    clearPoller();

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        const nextAgent = Math.min(1, Math.floor(next / 60));
        setActiveIndex(nextAgent);
        return next;
      });
    }, 1000);

    try {
      const queued = await startResearch(topic.trim());
      const jobId = queued?.job_id;
      if (!jobId) {
        clearTimer();
        setIsRunning(false);
        setError('Unable to start research job. Please try again.');
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await getResearchStatus(jobId);
          const status = statusRes?.status;

          if (status === 'queued' || status === 'running') {
            return;
          }

          clearPoller();
          clearTimer();
          setIsRunning(false);

          const payload = (statusRes?.result || '').trim();
          if (status === 'success') {
            if (!payload) {
              setError('Research completed but no report text was returned.');
            } else {
              setResult(payload);
              setActiveIndex(1);
            }
          } else {
            setError(payload || 'Research failed. Please try again.');
          }
        } catch (pollError) {
          clearPoller();
          clearTimer();
          setIsRunning(false);
          setError(pollError.message || 'Failed while checking job status.');
        }
      }, 2000);
    } catch (err) {
      clearTimer();
      clearPoller();
      setIsRunning(false);
      setError(err.message || 'Unexpected error while running research.');
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
          Run a coordinated Agentic workflow where a Planner outlines the steps and an Autonomous Executor resolves them iteratively to produce a polished markdown report.
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {isOverEstimate ? 'Running Beyond Estimate' : 'Estimated Time Remaining'}
              </p>
              <p className="text-lg font-semibold text-accent">
                {isRunning
                  ? isOverEstimate
                    ? `+${formatDuration(overEstimateSeconds)}`
                    : formatDuration(etaSeconds)
                  : '0:00'}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-researcher to-accent ${
                isRunning ? 'animate-pulse' : ''
              }`}
              style={{
                width: isRunning ? `${runningProgress}%` : result ? '100%' : '0%',
              }}
            />
          </div>
          {isOverEstimate && !error && (
            <p className="mt-3 text-sm text-amber-300">
              This run is taking longer than estimated, but it is still in progress.
            </p>
          )}
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
