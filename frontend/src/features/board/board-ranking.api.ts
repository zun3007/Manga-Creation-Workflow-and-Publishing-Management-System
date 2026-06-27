import { api } from '../../api/axios';

export type BoardVoteStatus = 'PENDING' | 'REVIEWED' | 'REVISED';

export type BoardVote = {
  id: number;
  proposalId: number;
  boardUserId: number;
  artQuality: number | string;
  storyClarity: number | string;
  marketPotential: number | string;
  finalScore: number | string;
  comment: string | null;
  status: BoardVoteStatus;
  createdAt: string;
  updatedAt: string;
  boardUser?: {
    id: number;
    displayName: string;
    email: string;
  };
};

export type BoardRankingItem = {
  id: number;
  title: string;
  synopsis: string;
  proposedFrequency: string;
  proposedStatus: string;
  submittedAt?: string | null;
  reviewDueDate?: string | null;
  genres?: {
    genre: {
      id: number;
      name: string;
    };
  }[];
  boardVotes?: BoardVote[];
  averageVoteScore: number | null;
  rankingScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  voteCount: number;
};

export type CreateBoardVotePayload = {
  proposalId: number;
  artQuality: number;
  storyClarity: number;
  marketPotential: number;
  comment?: string;
};

export async function getBoardRankings() {
  const response = await api.get<BoardRankingItem[]>('/board/rankings');

  return response.data;
}

export async function submitBoardVote(payload: CreateBoardVotePayload) {
  const response = await api.post<BoardVote>('/board/rankings/vote', payload);

  return response.data;
}
export async function approveBoardProposal(proposalId: number) {
  const response = await api.patch(
    `/board/rankings/proposals/${proposalId}/approve`,
  );

  return response.data;
}
export async function rejectBoardProposal(proposalId: number) {
  const response = await api.patch(
    `/board/rankings/proposals/${proposalId}/reject`,
  );

  return response.data;
}