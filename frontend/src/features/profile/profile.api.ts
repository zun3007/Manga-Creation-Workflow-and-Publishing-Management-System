import { api } from "../../api/axios";
import type {
  ChangePasswordPayload,
  ProfileUser,
  UpdateProfilePayload,
} from "../../types/profile";

type ChangePasswordResponse = {
  accessToken: string;
  tokenType: string;
  requiresPasswordChange: boolean;
  user: {
    id: number;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    role: string;
    mustChangePassword: boolean;
  };
};

export async function getMyProfile() {
  const response = await api.get<ProfileUser>("/profile/me");
  return response.data;
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const response = await api.patch<ProfileUser>("/profile/me", payload);
  return response.data;
}

export async function uploadMyAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.post<ProfileUser>("/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function changeMyPassword(payload: ChangePasswordPayload) {
  const response = await api.post<ChangePasswordResponse>(
    "/auth/change-password",
    payload,
  );

  return response.data;
}
