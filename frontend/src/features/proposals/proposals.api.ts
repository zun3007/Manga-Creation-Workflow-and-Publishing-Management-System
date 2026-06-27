import { api } from '../../api/axios';
import type {
  CreateProposalRequest,
  SeriesProposal,
} from '../../types/proposal';

// Lấy proposal của Mangaka hiện tại
export async function getMyProposals() {
  const response = await api.get<SeriesProposal[]>(
    '/series-proposals/mine',
  );

  return response.data;
}

// Tạo proposal mới
export async function createProposal(data: CreateProposalRequest) {
  const response = await api.post<SeriesProposal>(
    '/series-proposals',
    data,
  );

  return response.data;
}

// Submit proposal
export async function submitProposal(id: number) {
  const response = await api.post<SeriesProposal>(
    `/series-proposals/${id}/submit`,
  );

  return response.data;
}