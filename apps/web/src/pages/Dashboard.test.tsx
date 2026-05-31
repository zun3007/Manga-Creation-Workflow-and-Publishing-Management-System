import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'ADMIN', name: 'Admin User' },
  }),
}));

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: { users: 5, mangaka: 2, assistants: 3, series: 10, chapters: 45, proposals: 2 },
    }),
  },
}));

vi.mock('./mangaka/Dashboard', () => ({
  default: () => <div>Mangaka Dashboard</div>,
}));

import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('renders admin dashboard when user role is ADMIN', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText('Tổng quan hệ thống')).toBeTruthy();
  });

  it('displays stat cards for admin', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText('Người dùng')).toBeTruthy();
    expect(screen.getByText('Hoạ sĩ')).toBeTruthy();
    expect(screen.getByText('Trợ lý')).toBeTruthy();
    expect(screen.getByText('Series')).toBeTruthy();
    expect(screen.getByText('Chương')).toBeTruthy();
    expect(screen.getByText('Đề xuất')).toBeTruthy();
  });
});
