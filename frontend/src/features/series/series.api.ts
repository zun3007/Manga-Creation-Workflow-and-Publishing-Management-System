import { api } from '../../api/axios';
import type {
  Chapter,
  CreateChapterRequest,
  Series,
} from '../../types/series';

// Lấy series của Mangaka hiện tại
export async function getMySeries() {
  const response = await api.get<Series[]>('/series/mine');

  return response.data;
}

// Lấy chapter theo series
export async function getChaptersBySeries(seriesId: number) {
  const response = await api.get<Chapter[]>(
    `/chapters/series/${seriesId}`,
  );

  return response.data;
}

// Tạo chapter mới
export async function createChapter(data: CreateChapterRequest) {
  const response = await api.post<Chapter>('/chapters', data);

  return response.data;
}