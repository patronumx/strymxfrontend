const RAILWAY_BACKEND = 'https://strymxbackend-production.up.railway.app';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || RAILWAY_BACKEND;
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL;

export const getApiUrl = (path: string) => `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
export const getWsUrl = () => WS_URL;
