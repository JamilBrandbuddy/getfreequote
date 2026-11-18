import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRoleAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !allowed) throw new Error("Only Admin can manage user roles.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: assignments, error: readError } = await context.supabase.from("user_roles").select("id,user_id,role").order("created_at");
    if (readError) throw new Error("Could not read user roles.");
    return Promise.all((assignments ?? []).map(async (r) => {
      const { data, error: userError } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      if (userError) throw new Error("Could not read account details.");
      return { ...r, email: data.user?.email ?? "Unknown account", isSelf: r.user_id === context.userId };
    }));
  });

export const changeRoleAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ assignmentId: z.string().uuid(), role: z.enum(["admin", "marketing"]) }))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !allowed) throw new Error("Only Admin can manage user roles.");
    const { data: row, error: readError } = await context.supabase.from("user_roles").select("user_id").eq("id", data.assignmentId).single();
    if (readError || !row) throw new Error("Role assignment not found.");
    if (row.user_id === context.userId) throw new Error("You cannot change your own role.");
    const { error: updateError } = await context.supabase.from("user_roles").update({ role: data.role }).eq("id", data.assignmentId);
    if (updateError) throw new Error("Could not update role.");
    return { ok: true };
  });