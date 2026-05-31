import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { AuthProvider } from "./lib/auth";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Proposals from "./pages/mangaka/Proposals";
import SeriesList from "./pages/mangaka/SeriesList";
import SeriesDetail from "./pages/mangaka/SeriesDetail";
import ChapterWorkspace from "./pages/mangaka/ChapterWorkspace";
import ReviewQueue from "./pages/mangaka/ReviewQueue";
import BoardProposals from "./pages/board/Proposals";
import BoardSeries from "./pages/board/Series";
import BoardRankings from "./pages/board/Rankings";
import AssistantTasks from "./pages/assistant/Tasks";
import AssistantEarnings from "./pages/assistant/Earnings";
import StudioPage from "./pages/studio/StudioPage";
import StudioRegionPage from "./pages/studio/StudioRegionPage";
import EditorReviewQueue from "./pages/editor/ReviewQueue";
import EditorChapterReview from "./pages/editor/ChapterReview";
import AdminConsole from "./pages/admin/Console";
import AdminDisputes from "./pages/admin/Disputes";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/app/AppShell";

function Splash() {
  return (
    <div className="grid h-full place-items-center bg-bg text-ink">
      <div className="font-mono text-xs uppercase tracking-wider animate-pulse">Manga Studio — đang tải…</div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell>
              <Dashboard />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/proposals"
        element={
          <Protected>
            <AppShell>
              <Proposals />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/series"
        element={
          <Protected>
            <AppShell>
              <SeriesList />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/series/:id"
        element={
          <Protected>
            <AppShell>
              <SeriesDetail />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/series/:seriesId/chapters/:chapterId"
        element={
          <Protected>
            <AppShell>
              <ChapterWorkspace />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/review"
        element={
          <Protected>
            <AppShell>
              <ReviewQueue />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/board/proposals"
        element={
          <Protected>
            <AppShell>
              <BoardProposals />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/board/series"
        element={
          <Protected>
            <AppShell>
              <BoardSeries />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/board/rankings"
        element={
          <Protected>
            <AppShell>
              <BoardRankings />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/my-tasks"
        element={
          <Protected>
            <AppShell>
              <AssistantTasks />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/earnings"
        element={
          <Protected>
            <AppShell>
              <AssistantEarnings />
            </AppShell>
          </Protected>
        }
      />
      <Route path="/studio/page/:pageId" element={<Protected><StudioPage /></Protected>} />
      <Route path="/studio/region/:taskId" element={<Protected><StudioRegionPage /></Protected>} />
      <Route
        path="/editor/review"
        element={
          <Protected>
            <AppShell>
              <EditorReviewQueue />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/editor/review/:chapterId"
        element={
          <Protected>
            <AppShell>
              <EditorChapterReview />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <AppShell>
              <AdminConsole />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <Protected>
            <AppShell>
              <AdminDisputes />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="*"
        element={
          <Protected>
            <AppShell>
              <NotFound />
            </AppShell>
          </Protected>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
