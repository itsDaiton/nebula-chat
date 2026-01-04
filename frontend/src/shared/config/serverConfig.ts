const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const SERVER_CONFIG = {
  BASE_URL,
  getApiEndpoint: (path: string): string => `${SERVER_CONFIG.BASE_URL}${path}`,
};

export default SERVER_CONFIG;
