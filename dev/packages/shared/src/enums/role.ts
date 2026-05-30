export enum Role {
  MANGAKA = "MANGAKA",
  ASSISTANT = "ASSISTANT",
  TANTOU_EDITOR = "TANTOU_EDITOR",
  EDITORIAL_BOARD = "EDITORIAL_BOARD",
  ADMIN = "ADMIN",
}

/** Ordered list — also the set of valid `data-role` theme scopes. */
export const ROLES = [
  Role.MANGAKA,
  Role.ASSISTANT,
  Role.TANTOU_EDITOR,
  Role.EDITORIAL_BOARD,
  Role.ADMIN,
] as const;

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** Lowercase scope used in the UI `data-role` attribute, e.g. "tantou_editor". */
export const roleScope = (r: Role): string => r.toLowerCase();
