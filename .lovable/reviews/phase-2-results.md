# Phase 2 — Admin and Marketing roles

## Applied changes
- Applied `drizzle/migrations/0000_add_marketing_operational_role.sql`: added `marketing` to the existing enum; added `is_operator`; retained `is_staff` as a compatibility wrapper; added operational DELETE policies for quotes, attachment rows and private objects. Existing SELECT/UPDATE policies now resolve through the compatibility wrapper.
- Updated only role row `c518bb65-22d2-488a-aced-71c5c1874a1d` for existing user `ff75e237-6b6b-46a2-b610-d37cff75d0ed` from Admin to Marketing. Sales user `5fc8f89c-985b-4d21-a4e6-a31f4872afb9` remains Admin.
- Added shared permission flags, explicit operational checks to quote server functions, correct dashboard labels and Admin-only `/admin/users` with server-authorized role editing. Admin cannot demote their own role through this screen. Sign-out clears protected caches.
- No account recreation, password reset, quote edits, customer edits, attachment deletion, email sends, publication or Phase 3 work.
- Backup verification explicitly waived by the user for this phase; recoverability remains unverified.

## Verification
| Requirement | Result |
|---|---|
| Existing Sales session reaches dashboard as Admin | PASS |
| Existing Jamil session reaches dashboard as Marketing | PASS |
| Both read existing quotes and open details / Delete confirmation | PASS |
| Marketing cannot access role administration | PASS |
| Marketing direct role-escalation server call is rejected | PASS |
| Signed-out protected server call is rejected | PASS |
| Permission rules | PASS — six Vitest tests |
| Reports: Marketing edit/publish; Admin published-only read | Permission flags PASS; module deferred, no report UI exists |
| Customer directory, exports, campaigns, conversion modules | Deferred to later phases; not created here |
| Real quote update and permanent deletion | NOT RUN — preserved production records |
| Password-form login for both accounts | NOT RUN — tested managed sessions, not password credentials |
| Desktop/mobile roles screens | PASS, no horizontal overflow |

Data before/after: 47 quotes, 21 attachment records, 21 stored attachments, 48 history rows, 2 users. Full quote fingerprint unchanged: `c9e7169c31c4ab00bac2850111973b0c`. User IDs and role-row IDs verified unchanged. Passwords were not accessed or modified.

## Rollback without losing customer data
1. From Sales Admin on `/admin/users`, change Jamil back to Admin. Alternatively apply a narrowly scoped role-row update through the data tools, matching the same user and assignment IDs above. Do not recreate users.
2. Restore the pre-Phase-2 application code from checkpoint `eb1e622b41cd5e46b45c6d91a99b039b2d8a2c62` using a new forward commit; do not rewrite Git history. Publish only with explicit approval.
3. Leave the added enum value and compatibility helper in place. If strict legacy deletion behavior is required, a new approved migration can alter the three new DELETE policies to use `has_role(auth.uid(),'admin')`; no quote or file rows need removal.
4. Never use whole-database restore for an ordinary role rollback. Storage is not included in daily database backups. No backup inventory or restore drill was verified.

## Remaining limits
Legacy Staff is retained solely for backwards-compatible rollout; zero current accounts have Staff. The currently published older Delete handler remains Admin-only until the new code is explicitly published, although the role-row change applies to the shared backend immediately. Report and campaign permission flags must be enforced server-side when those modules are implemented.

Database advisor: submission log intentionally has no public policies; role helper execution is required for policies; overlapping DELETE policies retained for compatibility produce performance notices. Existing unindexed assignment/history actor foreign keys are out of scope.