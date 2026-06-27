import { api } from '../../api/axios';
import type { SeriesProposal } from '../../types/proposal';

export async function getPendingProposals() {
  const response = await api.get<SeriesProposal[]>(
    '/board/series-proposals/pending',
  );

  return response.data;
}

export async function approveProposal(id: number) {
  const response = await api.post(`/board/series-proposals/${id}/approve`);

  return response.data;
}

export async function rejectProposal(id: number) {
  const response = await api.post(`/board/series-proposals/${id}/reject`);

  return response.data;
}