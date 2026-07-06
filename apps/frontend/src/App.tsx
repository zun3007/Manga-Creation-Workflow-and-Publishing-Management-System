import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { AuthProvider } from "./lib/auth";
import type { Role } from "@manga/shared";
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
import PublicationSchedule from "./pages/board/PublicationSchedule";
import ReaderVoteImport from "./pages/board/ReaderVoteImport";
import AssistantTasks from "./pages/assistant/Tasks";
import AssistantEarnings from "./pages/assistant/Earnings";
import StudioPage from "./pages/studio/StudioPage";
import StudioRegionPage from "./pages/studio/StudioRegionPage";
import EditorReviewQueue from "./pages/editor/ReviewQueue";
import EditorChapterReview from "./pages/editor/ChapterReview";
import AdminConsole from "./pages/admin/Console";
import AdminDisputes from "./pages/admin/Disputes";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/app/AppShell";
import { RoleProtected } from "./components/app/RoleProtected";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./lib/confirm";

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
            <RoleProtected roles={["MANGAKA" as Role]}>
              <AppShell>
                <Proposals />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/series"
        element={
          <Protected>
            <RoleProtected roles={["MANGAKA" as Role]}>
              <AppShell>
                <SeriesList />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/series/:id"
        element={
          <Protected>
            <RoleProtected roles={["MANGAKA" as Role]}>
              <AppShell>
                <SeriesDetail />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/series/:seriesId/chapters/:chapterId"
        element={
          <Protected>
            <RoleProtected roles={["MANGAKA" as Role]}>
              <AppShell>
                <ChapterWorkspace />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/review"
        element={
          <Protected>
            <RoleProtected roles={["MANGAKA" as Role]}>
              <AppShell>
                <ReviewQueue />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/board/proposals"
        element={
          <Protected>
            <RoleProtected roles={["EDITORIAL_BOARD" as Role]}>
              <AppShell>
                <BoardProposals />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/board/series"
        element={
          <Protected>
            <RoleProtected roles={["EDITORIAL_BOARD" as Role]}>
              <AppShell>
                <BoardSeries />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/board/rankings"
        element={
          <Protected>
            <RoleProtected roles={["EDITORIAL_BOARD" as Role]}>
              <AppShell>
                <BoardRankings />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/board/reader-votes/import"
        element={
          <Protected>
            <RoleProtected roles={["EDITORIAL_BOARD" as Role]}>
              <AppShell>
                <ReaderVoteImport />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/board/publication-schedule"
        element={
          <Protected>
            <RoleProtected roles={["EDITORIAL_BOARD" as Role]}>
              <AppShell>
                <PublicationSchedule />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/my-tasks"
        element={
          <Protected>
            <RoleProtected roles={["ASSISTANT" as Role]}>
              <AppShell>
                <AssistantTasks />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/earnings"
        element={
          <Protected>
            <RoleProtected roles={["ASSISTANT" as Role]}>
              <AppShell>
                <AssistantEarnings />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route path="/studio/page/:pageId" element={<Protected><StudioPage /></Protected>} />
      <Route path="/studio/region/:taskId" element={<Protected><StudioRegionPage /></Protected>} />
      <Route
        path="/editor/review"
        element={
          <Protected>
            <RoleProtected roles={["TANTOU_EDITOR" as Role]}>
              <AppShell>
                <EditorReviewQueue />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/editor/review/:chapterId"
        element={
          <Protected>
            <RoleProtected roles={["TANTOU_EDITOR" as Role]}>
              <AppShell>
                <EditorChapterReview />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <RoleProtected roles={["ADMIN" as Role]}>
              <AppShell>
                <AdminConsole />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <Protected>
            <RoleProtected roles={["ADMIN" as Role]}>
              <AppShell>
                <AdminDisputes />
              </AppShell>
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <AppShell>
              <Profile />
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
        <ToastProvider>
          <ConfirmProvider>
            <AppRoutes />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
