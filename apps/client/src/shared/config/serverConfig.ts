const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Empty when unset: nothing wakes a worker in dev or tests.
const WORKER_URL = (import.meta.env.VITE_WORKER_URL || '').replace(/\/+$/, '');

export const SERVER_CONFIG = {
  BASE_URL,
  WORKER_URL,
  getApiEndpoint: (path: string): string => `${SERVER_CONFIG.BASE_URL}${path}`,
};
