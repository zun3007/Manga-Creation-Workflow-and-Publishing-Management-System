export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  requiresPasswordChange: boolean;
  user: AuthUser;
};

export type GoogleRequestOtpResponse = {
  message: string;
  email: string;
};