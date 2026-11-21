import { Link } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

type Parent = { to: "/admin/customers" | "/admin/email" | "/admin/performance"; label: string };

/** Back navigation for admin pages: one step back to the parent section, plus a direct Dashboard link. */
export function AdminBackNav({ parent }: { parent?: Parent }) {
  return (
    <nav aria-label="Back navigation" className="mb-4 flex flex-wrap items-center gap-2">
      {parent ? (
        <>
          <Button asChild variant="outline" className="h-10 rounded-xl"><Link to={parent.to}><ArrowLeft className="size-4" aria-hidden />Back to {parent.label}</Link></Button>
          <Button asChild variant="ghost" className="h-10 rounded-xl"><Link to="/admin/quotes"><LayoutDashboard className="size-4" aria-hidden />Dashboard</Link></Button>
        </>
      ) : (
        <Button asChild variant="outline" className="h-10 rounded-xl"><Link to="/admin/quotes"><ArrowLeft className="size-4" aria-hidden />Back to Dashboard</Link></Button>
      )}
    </nav>
  );
}
