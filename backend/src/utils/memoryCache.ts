const cache = new Map<string, any>();

export const getFromCache = (key: string): string | undefined => cache.get(key);

export const saveToCache = (key: string, value: string) => cache.set(key, value);

export const generateKey = (data: any): string => JSON.stringify(data);
