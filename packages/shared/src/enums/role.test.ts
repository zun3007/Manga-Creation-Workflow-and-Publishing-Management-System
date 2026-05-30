import { describe, it, expect } from "vitest";
import { Role, ROLES, isRole } from "./role";

describe("Role", () => {
  it("has the five SWP05 roles", () => {
    expect(ROLES).toEqual([
      "MANGAKA", "ASSISTANT", "TANTOU_EDITOR", "EDITORIAL_BOARD", "ADMIN",
    ]);
  });
  it("Role enum maps to its own string value", () => {
    expect(Role.MANGAKA).toBe("MANGAKA");
    expect(Role.ADMIN).toBe("ADMIN");
  });
  it("isRole narrows valid/invalid strings", () => {
    expect(isRole("MANGAKA")).toBe(true);
    expect(isRole("nope")).toBe(false);
  });
});
