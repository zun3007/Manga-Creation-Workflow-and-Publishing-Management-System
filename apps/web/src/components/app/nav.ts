import { Role } from "@manga/shared";
import { LayoutDashboard, FileText, BookOpen, ListChecks, Inbox } from "lucide-react";
import type { NavItem } from "../ui/Sidebar";

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  [Role.MANGAKA]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Đề xuất", to: "/proposals", icon: FileText },
    { label: "Series", to: "/series", icon: BookOpen },
    { label: "Chờ duyệt", to: "/review", icon: Inbox },
  ],
  [Role.ASSISTANT]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Việc của tôi", to: "/my-tasks", icon: ListChecks },
  ],
  [Role.TANTOU_EDITOR]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
  ],
  [Role.EDITORIAL_BOARD]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
    { label: "Duyệt đề xuất", to: "/board/proposals", icon: FileText },
  ],
  [Role.ADMIN]: [
    { label: "Tổng quan", to: "/", icon: LayoutDashboard },
  ],
};
