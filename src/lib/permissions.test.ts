import { describe, expect, test } from "vitest";
import { permissionsFor } from "./permissions";

describe("Phase 2 role rules", () => {
  test("Admin has operational and role administration access", () => {
    expect(permissionsFor(["admin"])).toMatchObject({ canOperate: true, canDeleteQuotes: true, canManageRoles: true });
  });
  test("Marketing has quote management and deletion access", () => {
    expect(permissionsFor(["marketing"])).toMatchObject({ canOperate: true, canDeleteQuotes: true });
  });
  test("Marketing cannot assign roles", () => {
    expect(permissionsFor(["marketing"]).canManageRoles).toBe(false);
  });
  test("only Marketing edits and publishes reports", () => {
    expect(permissionsFor(["marketing"])).toMatchObject({ canEditMarketingReports: true, canPublishMarketingReports: true });
    expect(permissionsFor(["admin"])).toMatchObject({ canEditMarketingReports: false, canPublishMarketingReports: false, canViewPublishedReports: true });
  });
  test("unassigned users have no protected access", () => {
    expect(permissionsFor([])).toMatchObject({ canOperate: false, canDeleteQuotes: false, canManageRoles: false, canEditMarketingReports: false });
  });
  test("legacy Staff remains compatible during rollout", () => {
    expect(permissionsFor(["staff"]).canOperate).toBe(true);
  });
});