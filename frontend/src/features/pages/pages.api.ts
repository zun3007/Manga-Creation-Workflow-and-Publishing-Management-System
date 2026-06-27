import { api } from '../../api/axios';
import type {
  CreatePageRequest,
  CreatePageVersionRequest,
  CreateRegionRequest,
  MangaPage,
  PageVersion,
  Region,
} from '../../types/page';

// Lấy page theo chapter
export async function getPagesByChapter(chapterId: number) {
  const response = await api.get<MangaPage[]>(
    `/pages/chapter/${chapterId}`,
  );

  return response.data;
}

// Tạo page mới kèm version đầu tiên
export async function createPage(data: CreatePageRequest) {
  const response = await api.post<MangaPage>('/pages', data);

  return response.data;
}

// Lấy region theo page
export async function getRegionsByPage(pageId: number) {
  const response = await api.get<Region[]>(
    `/regions/page/${pageId}`,
  );

  return response.data;
}

// Tạo region mới
export async function createRegion(data: CreateRegionRequest) {
  const response = await api.post<Region>('/regions', data);

  return response.data;
}

// Tạo version mới cho page sau khi vẽ
export async function createPageVersion(
  pageId: number,
  data: CreatePageVersionRequest,
) {
  const response = await api.post<PageVersion>(
    `/pages/${pageId}/versions`,
    data,
  );

  return response.data;
}