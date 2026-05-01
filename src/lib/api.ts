/**
 * STRYMX API Client Configuration
 * This file centralizes all backend endpoints to ensure consistency
 * across components and handle IPv4/IPv6 localhost resolution.
 */

import { API_URL } from './api-config';

export const BASE_URL = API_URL;

export const API_ENDPOINTS = {
    TOURNAMENTS: `${BASE_URL}/api/tournaments`,
    TEAMS: `${BASE_URL}/api/teams`,
    MATCHES: `${BASE_URL}/api/matches`,
    ASSETS: `${BASE_URL}/api/assets`,
    GRAPHICS: `${BASE_URL}/api/graphics`,
    AGENT: `${BASE_URL}/api/agent`,
};

export default API_ENDPOINTS;
