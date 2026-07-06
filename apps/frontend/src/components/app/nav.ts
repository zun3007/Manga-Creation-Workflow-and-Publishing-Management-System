import { Role } from "@manga/shared";
import { LayoutDashboard, FileText, BookOpen, ListChecks, Inbox, Shield, Vote, Upload, CircleDollarSign, Scale, User, CalendarDays } from "lucide-react";
import type { NavItem } from "../ui/Sidebar";

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  [Role.MANGAKA]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Đề xuất", to: "/proposals", icon: FileText },
    { label: "Series", to: "/series", icon: BookOpen },
    { label: "Chờ duyệt", to: "/review", icon: Inbox },
    { label: "Hồ sơ", to: "/profile", icon: User },
  ],
  [Role.ASSISTANT]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Việc của tôi", to: "/my-tasks", icon: ListChecks },
    { label: "Thu nhập", to: "/earnings", icon: CircleDollarSign },
    { label: "Hồ sơ", to: "/profile", icon: User },
  ],
  [Role.TANTOU_EDITOR]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Series quản lý", to: "/editor/series", icon: BookOpen },
    { label: "Duyệt chương", to: "/editor/review", icon: ListChecks },
    { label: "Hồ sơ", to: "/profile", icon: User },
  ],
  [Role.EDITORIAL_BOARD]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Duyệt đề xuất", to: "/board/proposals", icon: FileText },
    { label: "Phân công BT", to: "/board/series", icon: BookOpen },
    { label: "Lịch xuất bản", to: "/board/publication-schedule", icon: CalendarDays },
    { label: "Biểu quyết", to: "/board/rankings", icon: Vote },
    { label: "Vote độc giả", to: "/board/reader-votes/import", icon: Upload },
    { label: "Hồ sơ", to: "/profile", icon: User },
  ],
  [Role.ADMIN]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Quản trị", to: "/admin", icon: Shield },
    { label: "Khiếu nại", to: "/admin/disputes", icon: Scale },
    { label: "Hồ sơ", to: "/profile", icon: User },
  ],
};
