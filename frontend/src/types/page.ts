export type PageVersion = {
  id: number;
  pageId: number;
  versionNumber: number;
  imageUrl: string;
  uploadNote: string | null;
  createdAt: string;
};

export type MangaPage = {
  id: number;
  chapterId: number;
  pageNumber: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  versions?: PageVersion[];
};

export type CreatePageRequest = {
  chapterId: number;
  pageNumber: number;
  imageUrl: string;
  uploadNote?: string;
};

export type Region = {
  id: number;
  pageId: number;
  pageVersionId: number;
  type: string;
  xCoordinate: string | number;
  yCoordinate: string | number;
  width: string | number;
  height: string | number;
  zIndex: number;
  aiSuggested: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRegionRequest = {
  pageId: number;
  regionType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note?: string;
};

export type CreatePageVersionRequest = {
  imageUrl: string;
  uploadNote?: string;
};