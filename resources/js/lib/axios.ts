import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Pre-configured Axios instance with CSRF token handling.
 *
 * Features:
 * - Automatically includes CSRF token from meta tag
 * - Retries requests on 419 (CSRF token mismatch) by refreshing the token
 * - Proper credentials handling for same-origin requests
 */
const api = axios.create({
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true,
    withXSRFToken: true,
});

// Flag to prevent infinite retry loops
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
    config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: AxiosError | null = null) => {
    failedQueue.forEach(({ resolve, reject, config }) => {
        if (error) {
            reject(error);
        } else {
            resolve(api.request(config));
        }
    });
    failedQueue = [];
};

// Request interceptor to add CSRF token from meta tag
api.interceptors.request.use((config) => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
        config.headers['X-CSRF-TOKEN'] = token;
    }
    return config;
});

// Response interceptor to handle 419 errors and refresh CSRF token
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // Only handle 419 (CSRF token mismatch) errors
        if (error.response?.status !== 419 || !originalRequest) {
            return Promise.reject(error);
        }

        // If already refreshing, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject, config: originalRequest });
            });
        }

        isRefreshing = true;

        try {
            // Fetch fresh CSRF token by making a request to get a new session token
            // This works because Laravel will set a fresh XSRF-TOKEN cookie
            await axios.get('/sanctum/csrf-cookie', { withCredentials: true });

            // Update the token in the original request
            const newToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (newToken) {
                originalRequest.headers['X-CSRF-TOKEN'] = newToken;
            }

            // Process any queued requests
            processQueue();

            // Retry the original request
            return api.request(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError as AxiosError);
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
