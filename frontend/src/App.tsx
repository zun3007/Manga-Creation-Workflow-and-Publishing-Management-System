import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "./pages/LoginPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";

import { MyProposalsPage } from "./pages/MyProposalsPage";
import { MySeriesPage } from "./pages/MySeriesPage";
import { PageWorkspacePage } from "./pages/PageWorkspacePage";
import { MyChaptersPage } from "./pages/MyChaptersPage";
import { MyCreatedTasksPage } from "./pages/MyCreatedTasksPage";
import { ReviewSubmissionsPage } from "./pages/ReviewSubmissionsPage";

import { AssistantTasksPage } from "./pages/AssistantTasksPage";
import { AssistantSubmissionsPage } from "./pages/AssistantSubmissionsPage";
import { AssistantEarningsPage } from "./pages/AssistantEarningsPage";

import { EditorProductionPage } from "./pages/EditorProductionPage";

import { BoardProposalsPage } from "./pages/BoardProposalsPage";
import { BoardRankingPage } from "./pages/BoardRankingPage";

import { AdminUsersPage } from "./pages/AdminUsersPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { TeamPage } from "./pages/TeamPage";
import { AssetsPage } from "./pages/AssetsPage";
import { ProfilePage } from "./pages/ProfilePage";

import { ProtectedRoute } from "./routes/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            PUBLIC ROUTES
            Các route không cần đăng nhập
        ========================== */}

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* 
          Trang đổi mật khẩu để user đổi password lần đầu.
          Tạm để public vì có thể user được redirect sau login.
        */}
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* =========================
            COMMON PROTECTED ROUTES
            Các route dùng chung cho user đã đăng nhập
        ========================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <AssetsPage />
            </ProtectedRoute>
          }
        />

        {/* 
          Team đúng nghiệp vụ chỉ dành cho:
          - MANGAKA: xem assistant để giao task
          - TANTOU_EDITOR: xem team để quản lý production
          ASSISTANT không được vào Team.
        */}
        <Route
          path="/team"
          element={
            <ProtectedRoute roles={["MANGAKA", "TANTOU_EDITOR"]}>
              <TeamPage />
            </ProtectedRoute>
          }
        />

        {/* =========================
            MANGAKA ROUTES
            Tác giả quản lý proposal, series, chapter, page, task, review
        ========================== */}

        <Route
          path="/mangaka/proposals"
          element={
            <ProtectedRoute roles={["MANGAKA"]}>
              <MyProposalsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mangaka/series"
          element={
            <ProtectedRoute roles={["MANGAKA"]}>
              <MySeriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mangaka/chapters"
          element={
            <ProtectedRoute roles={["MANGAKA"]}>
              <MyChaptersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mangaka/pages"
          element={
            <ProtectedRoute roles={["MANGAKA"]}>
              <PageWorkspacePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mangaka/tasks"
          element={
            <ProtectedRoute roles={["MANGAKA"]}>
              <MyCreatedTasksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mangaka/review"
          element={
            <ProtectedRoute roles={["MANGAKA"]}>
              <ReviewSubmissionsPage />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ASSISTANT ROUTES
            Assistant chỉ nhận task, vẽ, submit bài, xem earning
            Không có quyền vào Team.
        ========================== */}

        <Route
          path="/assistant/tasks"
          element={
            <ProtectedRoute roles={["ASSISTANT"]}>
              <AssistantTasksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assistant/submissions"
          element={
            <ProtectedRoute roles={["ASSISTANT"]}>
              <AssistantSubmissionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assistant/earnings"
          element={
            <ProtectedRoute roles={["ASSISTANT"]}>
              <AssistantEarningsPage />
            </ProtectedRoute>
          }
        />

        {/* =========================
            TANTOU EDITOR ROUTES
            Editor theo dõi production và review submission
        ========================== */}

        <Route
          path="/editor/production"
          element={
            <ProtectedRoute roles={["TANTOU_EDITOR"]}>
              <EditorProductionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor/review"
          element={
            <ProtectedRoute roles={["TANTOU_EDITOR"]}>
              <ReviewSubmissionsPage />
            </ProtectedRoute>
          }
        />

        {/* =========================
            EDITORIAL BOARD ROUTES
            Board duyệt proposal, ranking, decision
        ========================== */}

        <Route
          path="/board/proposals"
          element={
            <ProtectedRoute roles={["EDITORIAL_BOARD"]}>
              <BoardProposalsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/board/ranking"
          element={
            <ProtectedRoute roles={["EDITORIAL_BOARD"]}>
              <BoardRankingPage />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ADMIN ROUTES
            Admin quản lý user
        ========================== */}

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        {/* =========================
            FALLBACK ROUTE
            Route không tồn tại thì về login.
            Luôn để dòng này cuối cùng.
        ========================== */}

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;