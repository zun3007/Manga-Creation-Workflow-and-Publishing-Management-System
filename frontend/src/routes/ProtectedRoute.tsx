import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
};

type CurrentUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = localStorage.getItem('accessToken');
  const userText = localStorage.getItem('user');

  if (!token || !userText) {
    return <Navigate to="/login" replace />;
  }

  let user: CurrentUser | null = null;

  try {
    user = JSON.parse(userText);
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}