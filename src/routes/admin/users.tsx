import { AdminBackNav } from "@/components/admin/AdminBackNav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getAdminSession } from "@/lib/admin.functions";
import { listRoleAssignments, changeRoleAssignment } from "@/lib/roles.functions";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({ meta: [
    { title: "User Roles — Riverbend Autoglass" },
    { name: "description", content: "Admin-only management of Riverbend Autoglass team roles." },
    { property: "og:title", content: "User Roles — Riverbend Autoglass" },
    { property: "og:description", content: "Manage authorized team role assignments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Users,
});

function Users() {
  const sessionFn = useServerFn(getAdminSession);
  const listFn = useServerFn(listRoleAssignments);
  const changeFn = useServerFn(changeRoleAssignment);
  const cache = useQueryClient();
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => sessionFn({}), retry: false });
  const roles = useQuery({ queryKey: ["role-assignments"], queryFn: () => listFn({}), enabled: session.data?.canManageRoles === true, retry: false });
  const change = useMutation({ mutationFn: (data: { assignmentId: string; role: "admin" | "marketing" }) => changeFn({ data }), onSuccess: () => { void cache.invalidateQueries({ queryKey: ["role-assignments"] }); } });
  return <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8"><div className="mx-auto max-w-3xl">
    <AdminBackNav />
    <h1 className="mt-6 text-2xl font-semibold">User roles</h1>
    {session.isPending ? <p className="mt-6">Loading…</p> : !session.data?.canManageRoles ? <p role="alert" className="mt-6 text-destructive">Only Admin can manage user roles.</p> : <>
      {(roles.isPending) && <p className="mt-6">Loading…</p>}
      {roles.error && <p role="alert" className="mt-6 text-destructive">Could not load roles.</p>}
      <ul className="mt-6 divide-y divide-border">{roles.data?.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
        <span className="min-w-0 break-all text-sm">{r.email}</span>
        <Select value={r.role} disabled={r.isSelf || change.isPending} onValueChange={v => { if (v === "admin" || v === "marketing") change.mutate({ assignmentId: r.id, role: v }); }}>
          <SelectTrigger className="w-40" aria-label={`Role for ${r.email}`}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="marketing">Marketing</SelectItem>{r.role === "staff" && <SelectItem value="staff">Staff (legacy)</SelectItem>}</SelectContent>
        </Select>
      </li>)}</ul>
      {change.error && <p role="alert" className="mt-4 text-destructive">{change.error.message}</p>}
    </>}
  </div></main>;
}