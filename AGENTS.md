<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Resolve operational permissions from protected user_roles rows using permissionsFor; enforce is_operator in server handlers so UI labels cannot grant access.
- Retain is_staff as a database compatibility wrapper during role rollout so older published code keeps working.
- Keep user-role administration in authenticated roles.functions handlers with an Admin check before privileged account lookups; operational permissions must not grant privilege assignment.
- Use filtered_reporting_quotes for list, analytics and exports so combined filters and Regina boundaries cannot diverge; aggregate in SQL and paginate exports on the server.
- Generate XLSX in memory through the maintained SheetJS distribution inside server-only export helpers to avoid filesystem-dependent writers in the Worker; export explicit safe columns only.
- Derive phone area-code regions from src/config/canadianAreaCodes.ts mirrored by SQL public.phone_region_code (never stored over phone fields); change both together via a new migration so dashboard filters and exports stay consistent.
- Change quote conversion outcomes only through public.set_quote_conversion (a trigger blocks direct column writes) so every change is audited in quote_conversion_history; quote status only suggests outcomes.
