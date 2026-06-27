import { api } from '../../api/axios';

export type StudioAsset = {
  id: number;
  ownerUserId: number;
  name: string;
  fileName: string;
  type: string;
  fileUrl: string;
  mimeType: string | null;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export async function getMyAssets() {
  const response = await api.get<StudioAsset[]>('/studio-assets/my');
  return response.data;
}

export async function uploadStudioAsset(file: File, assetType: string) {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('assetType', assetType);

  const response = await api.post<StudioAsset>('/studio-assets', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function deleteStudioAsset(assetId: number) {
  const response = await api.delete(`/studio-assets/${assetId}`);
  return response.data;
}
export async function updateStudioAsset(
  assetId: number,
  payload: {
    originalName?: string;
    assetType?: string;
  },
) {
  const response = await api.patch<StudioAsset>(
    `/studio-assets/${assetId}`,
    payload,
  );

  return response.data;
}