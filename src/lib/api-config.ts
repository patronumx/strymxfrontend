export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export const getApiUrl = (path: string) => `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
export const getWsUrl = () => WS_URL;
