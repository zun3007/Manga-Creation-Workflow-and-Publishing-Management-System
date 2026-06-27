import { api } from '../../api/axios';

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  requiresPasswordChange: boolean;
  user: {
    id: number;
    email: string;
    displayName: string;
    role: string;
    mustChangePassword: boolean;
  };
};

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function changePassword(payload: ChangePasswordPayload) {
  const response = await api.post<LoginResponse>(
    '/auth/change-password',
    payload,
  );

  return response.data;
}
