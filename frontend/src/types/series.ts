export type Series = {
  id: number;
  proposalId: number | null;
  mangakaUserId: number;
  title: string;
  status: string;
  publicationFrequency: string;
  createdAt: string;
  updatedAt: string;
};

export type Chapter = {
  id: number;
  seriesId: number;
  chapterNumber: number;
  title: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateChapterRequest = {
  seriesId: number;
  chapterNumber: number;
  title: string;
  deadline?: string;
};