import axios from "axios";
import { emitToast } from "./toastBus";

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
    const status = error?.response?.status as number | undefined;
    if (status === 401) {
      if (!location.pathname.startsWith("/login")) {
        clearToken();
        location.href = "/login?error=session_expired";
      }
      return Promise.reject(error);
    }
    // Surface every other failure (validation 400, 403, 404, 5xx, network) as a toast
    // so no action ever fails silently.
    let msg = error?.response?.data?.message;
    if (Array.isArray(msg)) msg = msg.join("; ");
    emitToast(
      "error",
      msg || (status ? `Có lỗi xảy ra (HTTP ${status})` : "Không kết nối được máy chủ."),
    );
    return Promise.reject(error);
  },
);

export const googleLoginUrl = `${API_URL}/auth/google`;

/** Extract the server-provided message from an API error without resorting to `any`. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string | string[] } | undefined)
      ?.message;
    if (Array.isArray(msg)) return msg.join("; ");
    if (msg) return msg;
  }
  return fallback;
}
