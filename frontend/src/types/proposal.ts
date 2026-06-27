export type Genre = {
  id: number;
  name: string;
};

export type ProposalGenre = {
  proposalId: number;
  genreId: number;
  genre: Genre;
};

export type SeriesProposal = {
  id: number;
  mangakaUserId: number;
  title: string;
  synopsis: string;
  proposedStatus: string;
  proposedFrequency: string;
  reviewDueDate: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  genres: ProposalGenre[];
};

export type CreateProposalRequest = {
  title: string;
  synopsis: string;
  proposedFrequency: string;
  genreIds: number[];
};