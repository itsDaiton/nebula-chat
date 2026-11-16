const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Empty when unset: nothing wakes a worker in dev or tests.
const RAW_WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
const WORKER_URL = RAW_WORKER_URL.endsWith('/') ? RAW_WORKER_URL.slice(0, -1) : RAW_WORKER_URL;

export const SERVER_CONFIG = {
  BASE_URL,
  WORKER_URL,
  getApiEndpoint: (path: string): string => `${SERVER_CONFIG.BASE_URL}${path}`,
};
