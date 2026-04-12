import { useState, useRef, useEffect, useCallback } from 'react';

/* ── constants ───────────────────────────────────────────────── */
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fmtTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
const uid = () => Math.random().toString(36).slice(2, 7);

const TAG = {
  SYS:  { bg: '#00c8ff18', color: '#00c8ff', label: 'SYS ' },
  PLAN: { bg: '#ffaa0018', color: '#ffaa00', label: 'PLAN' },
  EXEC: { bg: '#00ff8818', color: '#00ff88', label: 'EXEC' },
  TOOL: { bg: '#ff4dff18', color: '#ff4dff', label: 'TOOL' },
  DONE: { bg: '#00ff8818', color: '#00ff88', label: 'DONE' },
  ERR:  { bg: '#ff4d4d18', color: '#ff4d4d', label: 'ERR ' },
};

const MODE = {
  fast: { icon: '⚡', label: 'FAST', desc: 'Single executor agent — ~15s' },
  deep: { icon: '🔬', label: 'DEEP', desc: 'Planner → Executor → Critic — ~60s' },
};

const CHIPS = [
  'Latest AI breakthroughs 2025',
  'Climate change latest solutions',
  'Space exploration missions 2025',
  'Quantum computing progress',
  'Economic outlook next quarter',
  'CRISPR gene editing advances',
];

const SPINNER = ['⡿', '⣟', '⣯', '⣷', '⣾', '⣽', '⣻', '⢿'];

/* ── tiny helpers ────────────────────────────────────────────── */
function neonBtn(extra = {}) {
  return {
    fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.1em',
    background: 'transparent', border: '1px solid rgba(0,200,255,0.25)',
    borderRadius: 2, color: 'var(--text-dim)', padding: '0.18rem 0.55rem',
    cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
    ...extra,
  };
}

function hoverNeon(e) {
  e.currentTarget.style.color = 'var(--neon)';
  e.currentTarget.style.borderColor = 'var(--neon)';
}
function hoverOff(e) {
  e.currentTarget.style.color = 'var(--text-dim)';
  e.currentTarget.style.borderColor = 'rgba(0,200,255,0.25)';
}

/* ── StatusDot ───────────────────────────────────────────────── */
function StatusDot({ status }) {
  const color = { online: '#00c8ff', running: '#ffaa00', offline: '#ff4d4d' }[status] || '#ff4d4d';
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: `0 0 6px ${color}, 0 0 16px ${color}55`,
      animation: 'pulse-dot 2s infinite',
    }} />
  );
}

/* ── LogTag ──────────────────────────────────────────────────── */
function LogTag({ type }) {
  const s = TAG[type] || TAG.SYS;
  return (
    <span style={{
      background: s.bg, color: s.color, fontFamily: 'var(--mono)',
      fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.08em',
      padding: '0.05rem 0.38rem', borderRadius: 2, flexShrink: 0, userSelect: 'none',
    }}>{s.label}</span>
  );
}

/* ── LogLine ─────────────────────────────────────────────────── */
function LogLine({ entry }) {
  return (
    <div style={{
      display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
      animation: 'slide-in 0.18s ease', fontSize: '0.74rem', lineHeight: 1.6,
    }}>
      <span style={{ color: '#2a4050', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {entry.ts}
      </span>
      <LogTag type={entry.type} />
      <span style={{ color: entry.type === 'ERR' ? '#ff7070' : 'var(--text)', wordBreak: 'break-word' }}>
        {entry.msg}
      </span>
    </div>
  );
}

/* ── SpinnerLine ─────────────────────────────────────────────── */
function SpinnerLine({ elapsed }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(p => (p + 1) % SPINNER.length), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.74rem', color: 'var(--neon)' }}>
      <span style={{ color: '#2a4050' }}>{fmtTime()}</span>
      <span>{SPINNER[i]}</span>
      <span>agent running{elapsed ? ` — ${elapsed}s` : '…'}</span>
    </div>
  );
}

/* ── CornerBox ───────────────────────────────────────────────── */
function CornerBox({ focused, children }) {
  const c = focused ? '#00c8ff' : 'rgba(0,200,255,0.22)';
  const w = focused ? '2px' : '1px';
  const S = { position: 'absolute', width: 11, height: 11 };
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ ...S, top: 0, left: 0,    borderTop:    `${w} solid ${c}`, borderLeft:  `${w} solid ${c}` }} />
      <span style={{ ...S, top: 0, right: 0,   borderTop:    `${w} solid ${c}`, borderRight: `${w} solid ${c}` }} />
      <span style={{ ...S, bottom: 0, left: 0,  borderBottom: `${w} solid ${c}`, borderLeft:  `${w} solid ${c}` }} />
      <span style={{ ...S, bottom: 0, right: 0, borderBottom: `${w} solid ${c}`, borderRight: `${w} solid ${c}` }} />
      {children}
    </div>
  );
}

/* ── Tooltip ─────────────────────────────────────────────────── */
function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ fontSize: '0.6rem', color: '#2a4050', cursor: 'help', borderBottom: '1px dashed #2a4050' }}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', left: '1.3rem', top: '-0.2rem', zIndex: 99,
          background: '#0d1214', border: '1px solid var(--border)',
          borderRadius: 2, padding: '0.3rem 0.65rem',
          fontSize: '0.67rem', color: 'var(--text)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px #000c',
        }}>{text}</span>
      )}
    </span>
  );
}

/* ── ResultBlock ─────────────────────────────────────────────── */
function ResultBlock({ result, isError }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function handleDownload(ext) {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-result.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      border: `1px solid ${isError ? 'rgba(255,77,77,0.4)' : 'var(--border)'}`,
      borderRadius: 2, marginBottom: '1.2rem', animation: 'slide-in 0.3s ease',
    }}>
      {/* header bar */}
      <div style={{
        background: '#0d1214', borderBottom: '1px solid var(--border)',
        padding: '0.38rem 0.8rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontSize: '0.67rem', letterSpacing: '0.1em',
          color: isError ? '#ff4d4d' : 'var(--neon)',
        }}>
          {isError ? '✗ ERR OUTPUT' : '✓ OUTPUT'}
        </span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['md', 'txt'].map(ext => (
            <button key={ext} onClick={() => handleDownload(ext)}
              style={neonBtn()} onMouseEnter={hoverNeon} onMouseLeave={hoverOff}>
              ↓ .{ext}
            </button>
          ))}
          <button onClick={handleCopy}
            style={neonBtn({ color: copied ? '#00ff88' : undefined, borderColor: copied ? '#00ff88' : undefined })}>
            {copied ? '✓ copied' : 'copy'}
          </button>
        </div>
      </div>

      {/* body — always safe <pre>, no external deps */}
      <pre style={{
        background: '#050708', margin: 0, padding: '1rem',
        fontFamily: 'var(--mono)', fontSize: '0.8rem', lineHeight: 1.8,
        color: isError ? '#ff9090' : 'var(--text)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        maxHeight: 420, overflowY: 'auto',
      }}>
        {result}
      </pre>
    </div>
  );
}

/* ── RunHistory ──────────────────────────────────────────────── */
function RunHistory({ history, onRerun }) {
  if (!history.length) return null;
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{
        color: 'var(--text-dim)', fontSize: '0.66rem', letterSpacing: '0.12em',
        textTransform: 'uppercase', marginBottom: '0.5rem',
      }}>
        run history
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
        {history.map(h => {
          const label = typeof h.ts === 'number'
            ? new Date(h.ts * 1000).toLocaleTimeString('en-GB', { hour12: false })
            : (h.ts || '—');
          return (
            <div key={h.id || label} style={{
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              fontSize: '0.7rem', color: 'var(--text-dim)',
              borderBottom: '1px solid rgba(0,200,255,0.07)',
              paddingBottom: '0.28rem',
            }}>
              <span style={{ color: '#2a4050', flexShrink: 0 }}>{label}</span>
              <span style={{
                color: h.mode === 'deep' ? '#ffaa00' : 'var(--neon)',
                fontSize: '0.62rem', textTransform: 'uppercase', flexShrink: 0,
              }}>{h.mode}</span>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{h.topic}</span>
              <span style={{
                color: h.status === 'success' ? '#00ff88' : '#ff4d4d', flexShrink: 0,
              }}>
                {h.status === 'success' ? '✓' : '✗'} {h.elapsed ? `${h.elapsed}s` : '?'}
              </span>
              <button
                onClick={() => onRerun?.(h.topic, h.mode)}
                title="Re-run"
                style={neonBtn({ padding: '0.08rem 0.38rem', fontSize: '0.65rem' })}
                onMouseEnter={hoverNeon} onMouseLeave={hoverOff}
              >↺</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── keyboard shortcuts ──────────────────────────────────────── */
function useShortcuts({ running, clearLogs, clearResult, abort }) {
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && running) { abort(); return; }
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); clearLogs(); }
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); clearResult(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, clearLogs, clearResult, abort]);
}

/* ══ MAIN PAGE ══════════════════════════════════════════════════ */
export default function TerminalPage() {
  const [mode, setMode]         = useState('fast');
  const [topic, setTopic]       = useState('');
  const [focused, setFocused]   = useState(false);
  const [running, setRunning]   = useState(false);
  const [logs, setLogs]         = useState([
    { id: uid(), ts: fmtTime(), type: 'SYS', msg: 'System initialised. Agent ready.' },
    { id: uid(), ts: fmtTime(), type: 'SYS', msg: 'Ctrl+K clear logs · Ctrl+L clear result · Esc abort' },
  ]);
  const [result, setResult]     = useState('');
  const [isError, setIsError]   = useState(false);
  const [elapsed, setElapsed]   = useState(null);
  const [apiStatus, setApi]     = useState('offline');
  const [model, setModel]       = useState('');
  const [history, setHistory]   = useState([]);

  const logsEnd  = useRef(null);
  const abortCtl = useRef(null);
  const timer    = useRef(null);
  const t0       = useRef(null);

  const addLog = useCallback((type, msg) => {
    setLogs(prev => [...prev.slice(-300), { id: uid(), ts: fmtTime(), type, msg }]);
  }, []);

  const refreshHistory = useCallback(() => {
    fetch(`${BASE}/history?limit=6`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.history) setHistory(d.history); })
      .catch(() => {});
  }, []);

  /* ── health ping ── */
  useEffect(() => {
    const ping = () =>
      fetch(`${BASE}/health`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) { setApi('online'); if (d.model) setModel(d.model); } else setApi('offline'); })
        .catch(() => setApi('offline'));
    ping();
    const id = setInterval(ping, 15000);
    return () => clearInterval(id);
  }, []);

  /* ── load persistent history ── */
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  /* ── auto-scroll logs ── */
  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, running]);

  /* ── run handler ── */
  const handleRun = useCallback(async (overrideTopic, overrideMode) => {
    const q = (overrideTopic ?? topic).trim();
    const m = overrideMode ?? mode;
    if (!q || running) return;

    abortCtl.current?.abort();
    const ctl = new AbortController();
    abortCtl.current = ctl;

    setRunning(true);
    setResult('');
    setIsError(false);
    setElapsed(null);
    t0.current = Date.now();

    addLog('SYS', `Starting ${m.toUpperCase()} run — "${q}"`);
    addLog(m === 'deep' ? 'PLAN' : 'EXEC',
      m === 'deep' ? 'Planner + Executor + Critic agents dispatched.' : 'Executor agent dispatched.');

    timer.current = setInterval(() => {
      setElapsed(((Date.now() - t0.current) / 1000).toFixed(1));
    }, 500);

    /* Try SSE stream first, fall back to sync /run */
    try {
      const res = await fetch(`${BASE}/run/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: q, mode: m }),
        signal: ctl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const chunks = buf.split('\n\n');
        buf = chunks.pop(); // keep partial

        for (const chunk of chunks) {
          let event = '', data = '';
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7).trim();
            if (line.startsWith('data: '))  data  = line.slice(6).trim();
          }
          if (!data) continue;
          try {
            const p = JSON.parse(data);
            if (event === 'log')    addLog(p.type, p.msg);
            if (event === 'tick')   setElapsed(String(p.elapsed));
            if (event === 'result') {
              const secs = ((Date.now() - t0.current) / 1000).toFixed(1);
              setElapsed(secs);
              setResult(p.result || '(no output)');
              setIsError(p.status !== 'success');
              refreshHistory();
            }
          } catch (_) { /* malformed SSE chunk — skip */ }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        addLog('SYS', 'Run aborted.');
        clearInterval(timer.current);
        setRunning(false);
        return;
      }

      /* SSE failed — fall back to sync endpoint */
      addLog('SYS', 'Streaming unavailable, using sync mode…');
      try {
        const r = await fetch(`${BASE}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: q, mode: m }),
        });
        const data = await r.json();
        const secs = ((Date.now() - t0.current) / 1000).toFixed(1);
        setElapsed(secs);
        setResult(data.result || '(no output)');
        setIsError(data.status !== 'success');
        addLog(data.status === 'success' ? 'DONE' : 'ERR',
          data.status === 'success' ? `Completed in ${secs}s.` : (data.result || 'Unknown error.'));
        refreshHistory();
      } catch (fbErr) {
        const secs = ((Date.now() - t0.current) / 1000).toFixed(1);
        setElapsed(secs);
        const msg = `Network error: ${fbErr.message}`;
        addLog('ERR', msg);
        setResult(msg);
        setIsError(true);
      }
    }

    clearInterval(timer.current);
    setRunning(false);
  }, [topic, mode, running, addLog, refreshHistory]);

  const handleAbort = useCallback(() => {
    abortCtl.current?.abort();
    clearInterval(timer.current);
    setRunning(false);
  }, []);

  useShortcuts({
    running,
    clearLogs:   () => setLogs([{ id: uid(), ts: fmtTime(), type: 'SYS', msg: 'Logs cleared.' }]),
    clearResult: () => { setResult(''); setIsError(false); },
    abort:       handleAbort,
  });

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun(); }
    if (e.key === 'Escape' && running)    { handleAbort(); }
  };

  /* ══ RENDER ══════════════════════════════════════════════════ */
  return (
    <div style={{
      position: 'relative', zIndex: 1,
      maxWidth: 900, margin: '0 auto',
      padding: 'clamp(1.25rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 1.5rem) 5rem',
      minHeight: '100vh',
    }}>

      {/* ── HEADER ─────────────────────────────────── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.9rem', marginBottom: '2rem',
      }}>
        <h1 style={{
          fontFamily: 'var(--head)', fontWeight: 800,
          fontSize: 'clamp(2rem, 6vw, 4rem)',
          letterSpacing: '-0.04em', lineHeight: 1,
          color: '#fff', userSelect: 'none', margin: 0,
        }}>
          AG<span style={{ color: 'var(--neon)' }}>ENT</span>
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.28rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <StatusDot status={running ? 'running' : apiStatus} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.07em' }}>
              {running ? 'RUNNING' : apiStatus.toUpperCase()}
            </span>
          </div>
          {model && <span style={{ fontSize: '0.6rem', color: '#2a3d48' }}>{model}</span>}
        </div>
      </header>

      {/* ── SHORTCUTS BAR ──────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        {[['Enter','submit'],['Shift+Enter','newline'],['Ctrl+K','clear logs'],['Ctrl+L','clear result'],['Esc','abort']].map(([k, d]) => (
          <span key={k} style={{ fontSize: '0.62rem', color: '#2a3d48' }}>
            <kbd style={{
              background: '#0d1214', border: '1px solid rgba(0,200,255,0.18)',
              borderRadius: 2, padding: '0.08rem 0.32rem',
              fontSize: '0.58rem', color: 'var(--neon)', marginRight: '0.28rem',
            }}>{k}</kbd>
            {d}
          </span>
        ))}
      </div>

      {/* ── MODE TOGGLE ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
        {Object.entries(MODE).map(([m, info]) => (
          <button
            key={m}
            id={`mode-${m}`}
            onClick={() => !running && setMode(m)}
            style={{
              fontFamily: 'var(--mono)', fontSize: '0.74rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', background: 'transparent', border: 'none',
              cursor: running ? 'not-allowed' : 'pointer',
              color: mode === m ? 'var(--neon)' : 'var(--text-dim)',
              padding: '0.4rem 1rem',
              borderBottom: mode === m ? '2px solid var(--neon)' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {info.icon} {info.label}
          </button>
        ))}
        <span style={{ marginLeft: '0.75rem', fontSize: '0.63rem', color: '#335566', alignSelf: 'center' }}>
          — {MODE[mode].desc}
        </span>
        <span style={{ marginLeft: '0.4rem', alignSelf: 'center' }}>
          <Tip text={MODE[mode].desc} />
        </span>
      </div>

      {/* ── TEXTAREA ────────────────────────────────── */}
      <CornerBox focused={focused}>
        <textarea
          id="prompt-input"
          value={topic}
          onChange={e => setTopic(e.target.value.slice(0, 2000))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKey}
          disabled={running}
          placeholder="Enter research topic or question…"
          rows={4}
          style={{
            width: '100%', background: '#0d1214',
            border: `1px solid ${focused ? 'rgba(0,200,255,0.38)' : 'rgba(0,200,255,0.12)'}`,
            borderRadius: 2, color: 'var(--text)',
            fontFamily: 'var(--mono)', fontSize: '0.84rem', lineHeight: 1.65,
            padding: '0.75rem 1rem', resize: 'vertical', outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
      </CornerBox>

      {/* ── SUBMIT ROW ──────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '0.55rem', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <span style={{ fontSize: '0.66rem', color: topic.length > 1800 ? '#ffaa00' : '#2a3d48' }}>
          {topic.length} / 2000
        </span>
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          {running && (
            <button
              id="abort-btn"
              onClick={handleAbort}
              style={{
                fontFamily: 'var(--mono)', fontSize: '0.73rem', letterSpacing: '0.08em',
                background: 'transparent', border: '1px solid rgba(255,77,77,0.5)',
                borderRadius: 2, color: '#ff6060', padding: '0.48rem 0.9rem',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✕ abort
            </button>
          )}
          <button
            id="run-btn"
            className="neon-btn"
            onClick={() => handleRun()}
            disabled={running || !topic.trim()}
          >
            {running ? 'running…' : '▶ run agent'}
          </button>
        </div>
      </div>

      {/* ── SUGGESTION CHIPS ───────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.8rem' }}>
        {CHIPS.map(s => (
          <button
            key={s}
            onClick={() => !running && setTopic(s)}
            style={neonBtn({ fontSize: '0.67rem', padding: '0.25rem 0.65rem' })}
            onMouseEnter={hoverNeon}
            onMouseLeave={hoverOff}
          >{s}</button>
        ))}
      </div>

      {/* ── TERMINAL PANEL ─────────────────────────── */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: '1.4rem' }}>
        {/* title bar */}
        <div style={{
          background: '#0d1214', borderBottom: '1px solid var(--border)',
          padding: '0.42rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.45rem',
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
          <span style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            agent.log — live terminal
          </span>
          <button
            title="Clear logs (Ctrl+K)"
            onClick={() => setLogs([{ id: uid(), ts: fmtTime(), type: 'SYS', msg: 'Logs cleared.' }])}
            style={{ background: 'transparent', border: 'none', color: '#335566', cursor: 'pointer', fontSize: '0.7rem' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--neon)'}
            onMouseLeave={e => e.currentTarget.style.color = '#335566'}
          >⊗</button>
        </div>
        {/* body */}
        <div style={{
          background: '#050708', padding: '0.7rem 1rem',
          height: 240, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.28rem',
        }}>
          {logs.map(e => <LogLine key={e.id} entry={e} />)}
          {running && <SpinnerLine elapsed={elapsed} />}
          <div ref={logsEnd} />
        </div>
      </div>

      {/* ── RESULT ─────────────────────────────────── */}
      {result && <ResultBlock result={result} isError={isError} />}

      {/* ── STATS ──────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
        fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.5rem',
      }}>
        <span>mode{' '}<span style={{ color: mode === 'deep' ? '#ffaa00' : 'var(--neon)' }}>{mode.toUpperCase()}</span></span>
        <span>elapsed{' '}<span style={{ color: 'var(--text)' }}>{elapsed !== null ? `${elapsed}s` : '—'}</span></span>
        <span>status{' '}
          <span style={{ color: running ? '#ffaa00' : result ? (isError ? '#ff4d4d' : '#00ff88') : 'var(--text-dim)' }}>
            {running ? 'RUNNING' : result ? (isError ? 'ERROR' : 'DONE') : 'IDLE'}
          </span>
        </span>
        <span>api{' '}<span style={{ color: apiStatus === 'online' ? '#00ff88' : '#ff4d4d' }}>{apiStatus.toUpperCase()}</span></span>
      </div>

      {/* ── HISTORY ────────────────────────────────── */}
      <RunHistory
        history={history}
        onRerun={(t, m) => { setTopic(t); setMode(m); handleRun(t, m); }}
      />

    </div>
  );
}
