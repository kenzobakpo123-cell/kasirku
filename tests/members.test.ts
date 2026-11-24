import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, canAssign, canRemove, roleLabel } from "@/lib/members";

describe("canAssign", () => {
  it("owner bisa memberikan semua role yang bisa ditetapkan", () => {
    for (const role of ASSIGNABLE_ROLES) expect(canAssign("OWNER", role)).toBe(true);
  });

  it("manager hanya bisa menjadikan kasir", () => {
    expect(canAssign("MANAGER", "CASHIER")).toBe(true);
    expect(canAssign("MANAGER", "MANAGER")).toBe(false);
    expect(canAssign("MANAGER", "AGENCY")).toBe(false);
  });

  it("kasir tidak bisa memberi role", () => {
    expect(canAssign("CASHIER", "CASHIER")).toBe(false);
  });
});

describe("canRemove", () => {
  it("tidak bisa menghapus diri sendiri atau owner", () => {
    expect(canRemove("OWNER", "OWNER", true)).toBe(false);
    expect(canRemove("OWNER", "OWNER", false)).toBe(false);
  });

  it("owner bisa menghapus manager dan kasir", () => {
    expect(canRemove("OWNER", "MANAGER", false)).toBe(true);
    expect(canRemove("OWNER", "CASHIER", false)).toBe(true);
  });

  it("manager hanya bisa menghapus kasir", () => {
    expect(canRemove("MANAGER", "CASHIER", false)).toBe(true);
    expect(canRemove("MANAGER", "MANAGER", false)).toBe(false);
  });
});

describe("roleLabel", () => {
  it("memiliki label Indonesia", () => {
    expect(roleLabel("OWNER")).toBe("Pemilik");
    expect(roleLabel("CASHIER")).toBe("Kasir");
  });
});
