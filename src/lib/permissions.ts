export type OperationalRole = "admin" | "marketing" | "staff";

export function permissionsFor(roles: readonly string[]) {
  const isAdmin = roles.includes("admin");
  const isMarketing = roles.includes("marketing");
  const canOperate = isAdmin || isMarketing || roles.includes("staff");
  return {
    roleLabel: isAdmin ? "Admin" : isMarketing ? "Marketing" : roles.includes("staff") ? "Staff (legacy)" : "No access",
    isAdmin,
    isMarketing,
    canOperate,
    canDeleteQuotes: canOperate,
    canManageRoles: isAdmin,
    canEditMarketingReports: isMarketing,
    canPublishMarketingReports: isMarketing,
    canViewPublishedReports: isAdmin || isMarketing,
  };
}