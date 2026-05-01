/**
 * STRYMX API Client Configuration
 * This file centralizes all backend endpoints to ensure consistency
 * across components and handle IPv4/IPv6 localhost resolution.
 */

export const BACKEND_PORT = 4000;

// On Windows, 'localhost' is generally safer for browser loopback than 127.0.0.1
// as it handles both IPv4 and IPv6 resolution.
export const BASE_URL = `http://localhost:${BACKEND_PORT}`;

export const API_ENDPOINTS = {
    TOURNAMENTS: `${BASE_URL}/api/tournaments`,
    TEAMS: `${BASE_URL}/api/teams`,
    MATCHES: `${BASE_URL}/api/matches`,
    ASSETS: `${BASE_URL}/api/assets`,
    GRAPHICS: `${BASE_URL}/api/graphics`,
    AGENT: `${BASE_URL}/api/agent`,
};

export default API_ENDPOINTS;
