import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, clearToken } from "./api";
import {
  isTwoFactorRequired,
  type AuthUser,
  type AuthSuccess,
  type LoginResponse,
  type ResendResult,
} from "@manga/shared";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /**
   * Start a login. Resolves to either an access-token success (session set) or a
   * 2FA challenge (nothing set yet — caller must collect the OTP and call
   * verifyTwoFactor).
   */
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  resendOtp: (challengeToken: string) => Promise<ResendResult>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const { data } = await api.get("/auth/me");
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        avatarUrl: data.avatarUrl ?? null,
      });
    } catch (err) {
      console.error("[auth] /auth/me failed; clearing session", err);
      clearToken();
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      if (getToken()) await fetchMe();
      setLoading(false);
    })();
  }, []);

  function applySession(data: AuthSuccess) {
    setToken(data.accessToken);
    setUser(data.user);
  }

  async function login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    // Only an access-token response opens a session; a 2FA challenge does not.
    if (!isTwoFactorRequired(data)) applySession(data);
    return data;
  }

  async function verifyTwoFactor(challengeToken: string, code: string) {
    const { data } = await api.post<AuthSuccess>("/auth/2fa/verify", {
      challengeToken,
      code,
    });
    applySession(data);
  }

  async function resendOtp(challengeToken: string): Promise<ResendResult> {
    const { data } = await api.post<ResendResult>("/auth/2fa/resend", {
      challengeToken,
    });
    return data;
  }

  async function loginWithToken(token: string) {
    setToken(token);
    await fetchMe();
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyTwoFactor,
        resendOtp,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
