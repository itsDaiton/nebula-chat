const isDevelopment = import.meta.env.MODE === 'development';

export const SERVER_CONFIG = {
  LOCAL_URL: import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:3000',
  PRODUCTION_URL: import.meta.env.VITE_API_URL || 'https://api.nebula-chat.com',

  getBaseUrl: (): string => {
    if (isDevelopment) {
      return SERVER_CONFIG.LOCAL_URL;
    }
    return SERVER_CONFIG.PRODUCTION_URL;
  },

  getApiEndpoint: (path: string): string => `${SERVER_CONFIG.getBaseUrl()}${path}`,
};

export default SERVER_CONFIG;
