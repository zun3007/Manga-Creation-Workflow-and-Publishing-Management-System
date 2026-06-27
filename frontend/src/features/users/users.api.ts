import { api } from '../../api/axios';

export type UserRole =
  | 'ADMIN'
  | 'MANGAKA'
  | 'ASSISTANT'
  | 'TANTOU_EDITOR'
  | 'EDITORIAL_BOARD';

export type AdminUser = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getUsers() {
  const response = await api.get<AdminUser[]>('/users');

  return response.data;
}

export async function updateUserRole(userId: number, role: UserRole) {
  const response = await api.patch<AdminUser>(`/users/${userId}`, {
    role,
  });

  return response.data;
}