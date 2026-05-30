import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "manga_token";

export const api = axios.create({ baseURL: API_URL });

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On an expired/invalid token, clear the session and bounce to login.
// Skip when already on /login so a failed login attempt doesn't redirect-loop.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && !location.pathname.startsWith("/login")) {
      clearToken();
      location.href = "/login?error=session_expired";
    }
    return Promise.reject(error);
  },
);

export const googleLoginUrl = `${API_URL}/auth/google`;
