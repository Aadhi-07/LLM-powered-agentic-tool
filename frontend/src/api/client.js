import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 1000 * 60 * 12,
});

function normalizeError(error) {
  if (error?.response) {
    const status = error.response.status;
    const detail =
      error.response.data?.detail ||
      error.response.data?.message ||
      'Request failed. Please try again.';

    if (status === 429) {
      return 'Rate limit reached (429). Please wait a moment and retry.';
    }

    return `${detail} (HTTP ${status})`;
  }

  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. The crew may still be running; please try again.';
  }

  return 'API is unreachable. Make sure FastAPI is running on http://localhost:8000.';
}

export async function getApiInfo() {
  const { data } = await api.get('/');
  return data;
}

export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function startResearchSync(topic) {
  try {
    const { data } = await api.post('/research/sync', { topic });
    return data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function startResearch(topic) {
  try {
    const { data } = await api.post('/research', { topic });
    return data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getResearchStatus(jobId) {
  try {
    const { data } = await api.get(`/research/${jobId}`);
    return data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getReports() {
  try {
    const { data } = await api.get('/reports');
    return data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getReport(filename) {
  try {
    const { data } = await api.get(`/reports/${encodeURIComponent(filename)}`);
    return data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export { normalizeError };