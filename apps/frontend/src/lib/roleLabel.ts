import type { Role } from "@manga/shared";

const LABELS: Record<string, string> = {
  MANGAKA: "Hoạ sĩ",
  ASSISTANT: "Trợ lý",
  TANTOU_EDITOR: "Biên tập",
  EDITORIAL_BOARD: "Hội đồng",
  ADMIN: "Quản trị",
};

/** Vietnamese display label for a role; falls back to the raw value. */
export const roleLabel = (r: Role | string): string => LABELS[r] ?? String(r);
