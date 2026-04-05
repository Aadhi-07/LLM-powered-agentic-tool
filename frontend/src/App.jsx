import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ReportsPage from './pages/ReportsPage';
import ReportViewerPage from './pages/ReportViewerPage';
import { getHealth } from './api/client';

function App() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHealth = async () => {
      try {
        const data = await getHealth();
        if (isMounted) {
          setHealth(data);
          setHealthLoading(false);
        }
      } catch {
        if (isMounted) {
          setHealth(null);
          setHealthLoading(false);
        }
      }
    };

    fetchHealth();
    const intervalId = setInterval(fetchHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute right-10 top-1/3 h-72 w-72 rounded-full bg-researcher/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-critic/10 blur-3xl" />
      </div>

      <Header health={health} healthLoading={healthLoading} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/report/:filename" element={<ReportViewerPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;