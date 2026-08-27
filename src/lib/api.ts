/**
 * @file src/lib/api.ts
 * @description Pre-configured Axios instance for all API calls.
 *
 * Features:
 *   - Base URL from environment variable (VITE_API_URL or PUBLIC_API_URL)
 *   - Request interceptor: attaches Authorization Bearer token from localStorage
 *   - Response interceptor: surfaces error messages, handles 401 logout
 *
 * Usage:
 *   import { apiClient } from '@/lib/api';
 *   const data = await apiClient.get('/projects');
 */
import axios from 'axios';

// ─── Base URL ───────────────────────────────────────────────────────────────
// PUBLIC_API_URL → available in both Astro (server) and client components
// VITE_API_URL   → available in Vite/React client-only components
const API_BASE_URL =
    (import.meta.env.PUBLIC_API_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined) ||
    '';

// ─── Instance ───────────────────────────────────────────────────────────────

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15_000,
    headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
    },
});

// ─── Request Interceptor ────────────────────────────────────────────────────

apiClient.interceptors.request.use(
    (config) => {
        // Attach JWT token from localStorage (React SPA admin)
        try {
            const token = localStorage.getItem('accessToken');
            if (token && config.headers) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        } catch {
            // localStorage may not be available in SSR context — safe to ignore
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ─── Response Interceptor ──────────────────────────────────────────────────

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        // 401 Unauthorized → clear local storage and redirect to login
        if (status === 401) {
            try {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                // Full page navigation to avoid stale React state
                window.location.href = '/login';
            } catch {
                // SSR context — ignore
            }
        }

        // Surface a human-readable error message
        const message: string =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Đã có lỗi xảy ra. Vui lòng thử lại.';

        return Promise.reject(new Error(message));
    },
);
