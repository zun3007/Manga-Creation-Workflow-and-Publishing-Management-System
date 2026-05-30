import { Role } from "@manga/shared";
import { LayoutDashboard } from "lucide-react";
import type { NavItem } from "../ui/Sidebar";

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  [Role.MANGAKA]: [{ label: "Tổng quan", to: "/", icon: LayoutDashboard }],
  [Role.ASSISTANT]: [{ label: "Tổng quan", to: "/", icon: LayoutDashboard }],
  [Role.TANTOU_EDITOR]: [{ label: "Tổng quan", to: "/", icon: LayoutDashboard }],
  [Role.EDITORIAL_BOARD]: [{ label: "Tổng quan", to: "/", icon: LayoutDashboard }],
  [Role.ADMIN]: [{ label: "Tổng quan", to: "/", icon: LayoutDashboard }],
};
