# Supabase audit and cleanup — paused checklist

**Status:** Paused at the user's request on October 13, 2026.

**Project:** `ccox0719's Project` · `svaozzitkajgqzacldur` · PostgreSQL 17.

**Audit workspace:** `/Users/cox/Documents/supabase-audit-2026-10-13`

The user authorized investigating the ecosystem and implementing cleanup that can be established as safe. No further production changes should occur until the user resumes. The original audit brief's safeguards still apply: preserve data and authentication, verify backups, review dependencies, avoid weakening authorization, and test affected applications. Do not interpret this checklist as authorization for broader migrations or deletion.

## Completed investigation

- [x] Confirmed the target Supabase project and inspected all non-system schemas.
- [x] Inventoried **77 application base tables and one application view**.
- [x] Captured **845 application columns, 310 constraints, 240 baseline indexes, 40 application functions, and 64 non-internal triggers**. Trigger scope includes relevant Auth triggers.
- [x] Captured the baseline **221 RLS policies**, including Storage policies, plus grants/default privileges and realtime publications.
- [x] Collected exact application-table row counts without exporting financial or student record contents into the report.
- [x] Checked **113 declared foreign-key relationships**: no orphaned rows found; no unvalidated application constraints found.
- [x] Inspected Storage configuration: no buckets or objects present in this project.
- [x] Checked installed extensions: `pg_cron` is not installed.
- [x] Listed **13 Edge Functions**; retrieved source for nine. Source retrieval was unavailable for `rename-bucket`, `delete-bucket`, `bright-endpoint`, and `create-bucket`.
- [x] Captured security and performance advisor findings, migration history, table activity, normalized query statistics, and aggregate recent API log evidence.
- [x] Enumerated and inspected **42 ccox0719 GitHub repositories**, including the private `editor` repository.
- [x] Examined static queries, configuration, migration files, deployment files, and dynamic Home table references. This does not establish every external/runtime caller.
- [x] Scanned available repository source for literal Supabase service-role JWTs/secret keys: none found. Environment values and historical Git objects have not been comprehensively audited for secrets.
- [x] Verified DevoBase's live public configuration points to this project.
- [x] Confirmed `meals` and `foodtruck` are rejected by the current Data API with `PGRST106`; tested public endpoints without fetching private rows.
- [x] Verified backup availability in the Supabase dashboard: **the current Free plan has no hosted project backups**. CLI backup listing also returned 403.

## Implemented and verified cleanup

### Exact duplicate policies and index

- [x] Saved scoped row backups for `meals.meals`, `meals.ingredients`, `meals.meal_ingredients`, and `public.scholarship_task_templates`.
- [x] Verified backup row counts, JSON parseability, and server SHA-256 hashes against the saved files.
- [x] Captured original policy/index definitions and prepared exact rollback SQL before applying changes.
- [x] Removed **10 exactly equivalent duplicate policies** from the three normalized `meals` tables. Matching policies with the same roles, commands, predicates, and checks remain. Access behavior was preserved; legacy anonymous access was not secured by this cleanup.
- [x] Removed standalone duplicate index `public.scholarship_task_templates_scholarship_title_key`.
- [x] Retained the constraint-backed unique index/constraint `scholarship_task_templates_scholarship_id_title_key`; uniqueness on `(scholarship_id, title)` remains enforced.
- [x] Used transaction, timeout, and catalog-equivalence precondition guards.
- [x] Verified the affected data hashes are unchanged after cleanup. Policy count decreased from 221 to 211.

### Database ownership labels

- [x] Added ownership comments to **all 78 application table/view objects**, preserving any previous comments.
- [x] Marked shared finance and household identity resources explicitly.
- [x] Correctly identified `public.devotional_lessons` as DevoBase.
- [x] Saved exact original-comment rollback SQL.
- [x] Verified all 78 ownership labels exist.

### `quick-task` security fix

- [x] Backed up the original deployed function source (version 8).
- [x] Identified that its service-role delete could affect the live `public.transactions` table without validating household membership.
- [x] Added server-side `auth.getUser(token)` validation and a `public.household_members` lookup scoped to the validated user and requested household before service-role mutations.
- [x] Kept gateway JWT verification enabled.
- [x] Passed five authorization tests: missing token, invalid user token, unrelated account, exact member/household scoping, and another-household denial.
- [x] Deployed **version 9** successfully.
- [x] Verified a real userless legacy anon JWT receives **401 `Invalid sign-in`**, before any transaction mutation.
- [ ] Test actual signed-in permitted and forbidden household requests. Existing user passwords/tokens were not provided; positive membership behavior was tested with mocks, not a real signed-in client.
- [ ] Resolve the function's older bucket/amount-column model before declaring the entire legacy feature functional. The security fix does not recreate missing tables or columns.

### Legacy `Menu` meal-app reference fix

- [x] Confirmed the current GitHub `Menu` client used `{db:{schema:'meals'}}`, which the production API currently rejects.
- [x] Confirmed normalized meals, ingredients, links, and household JSON state match between `meals.*` and the parallel `public.meal_app_*` structures at audit time.
- [x] Changed only the client schema/table references to the already exposed `public.meal_app_*` tables and advanced the build marker to `gather-1.0.1`.
- [x] Saved original and corrected HTML and passed an inline JavaScript syntax check.
- [x] Committed the correction to `ccox0719/Menu` main: [`cdfa3c8434f9068e66d16932ee6ee49f4fdd8bed`](https://github.com/ccox0719/Menu/commit/cdfa3c8434f9068e66d16932ee6ee49f4fdd8bed).
- [x] Discovered the legacy app’s GitHub Pages URL: https://ccox0719.github.io/Menu/. A GitHub Pages deployment for correction commit `cdfa3c8434f9068e66d16932ee6ee49f4fdd8bed` was created. The Pages API reported `building` when the read-only lookup completed.
- [ ] Verify the actual live deployment serves this correction and shows the complete ingredient library. **GitHub commit success is not deployment success.** Production page behavior and terminal deployment success have not been verified.
- [ ] Verify the old planner's read/create/update/delete behavior and shopping generation in the actual deployed app; do not replace production records with test/sample data.

### AI development boundaries

- [x] Generated reusable standards and **42 repository-specific AGENTS.md drafts**.
- [x] Installed `AGENTS.md` on main in these eight repositories: `Menu`, `storage`, `coxwallet`, `ledger`, `coxaid`, `devobase`, `freedom-bowls`, and `ironpath`.
- [x] Recorded returned commit SHAs in `evidence/repository-instructions-installed.json`.
- [x] Instructions define owned/shared resources, preserve data, prohibit unrelated changes, and require project/dependency/backup verification.
- [ ] Review the other repository-specific drafts before installing them. No Supabase reference in a source scan is not proof of no runtime dependency.
- [ ] Add equivalent Family Table instructions to its Sites source workspace if wanted; this audit has not redeployed Family Table.

## Confirmed application boundaries

| Application | Source | Current resources / key dependency |
| --- | --- | --- |
| Home organization | `ccox0719/storage` | `public.home_*`; shared `public.household_members`/`households` |
| Old personal meal planner | `ccox0719/Menu` | Corrected source uses `public.meal_app_*`; original `meals.*` preserved |
| New meal planner | Family Table Sites source in `/Users/cox/Documents/mealplan` | `public.family_table_*`, grocery view, private membership helper |
| CoxWallet | `ccox0719/coxwallet` | Finance/classification tables; shares `public.transactions` with Ledger |
| Ledger | `ccox0719/ledger` | Budget, accounts, balances, settings, rules; shared transaction and household identity resources |
| Food Truck Business Planner | `ccox0719/freedom-bowls` | `public.ingredients`, `recipes`, `recipe_ingredients`, menu/cost/startup/event tables; deployed project environment still needs confirmation |
| Scholarship Planner | `ccox0719/coxaid` | Student, family, scholarship, task, application, answer, email, service, and award graph |
| DevoBase | `ccox0719/devobase` | `public.devotional_lessons`; live configuration verified |
| Workout app | `ccox0719/ironpath` | Browser localStorage (`ironpath_v2`); no Supabase dependency found |
| Older devotional app | `ccox0719/devotional-app` | Source references a different project, `sggxzlhpdkqjlepbwdqf`; not available in the connected Supabase project list |

The repository named `home` is not the current Home/Supabase app. The `storage` repository is the current Home app, and this is distinct from Supabase's managed `storage` schema.

## Important findings still open

- [ ] **Legacy anonymous access:** `public.meal_app_*` and Food Truck tables have permissive anonymous access. The original `meals` household table also lacks RLS, although the schema is currently not API-exposed. Do not silently tighten policies until the consuming app can authenticate properly.
- [ ] **Other legacy Edge Functions:** retrieved functions reference missing `bucket_settings`, `bucket_balances`, `chore_checks`, `chore_rate_overrides`, `ledger_custom`, `ledger_transfer`, and `ledger_entry_edits` tables. Some expect absent transaction columns. Determine actual callers before retiring or repairing them.
- [ ] **Four unreadable Edge Functions:** determine ownership, authentication, source availability, and usage; do not delete based only on missing source.
- [ ] **Shared finance table:** CoxWallet and Ledger use the same `transactions` table with different field conventions. Of 2,329 rows, 1,490 have household/`txn_date` fields. Validate whether the remaining rows intentionally belong to the older model before changing anything.
- [ ] **Household ambiguity:** one user has multiple `public.household_members` rows. Existing `current_household()` and client `.limit(1)` lookups do not explicitly choose an app/household. Resolve this with actual app behavior and ownership review.
- [ ] **Home whole-table replacement:** `storage/js/cloud.js` uses insert-then-delete snapshots. Verify concurrent edits and unique constraints before redesigning; current audit did not change that code.
- [ ] **Scholarship security:** review 26 anonymously executable security-definer functions individually. Some are trigger helpers, some are membership checks, and `lookup_family_invite` may intentionally support token-based public lookup. Do not blanket-revoke functions used by policies.
- [ ] `public.profiles` has RLS enabled with no policies; determine whether access is intentionally RPC-only.
- [ ] Leaked-password protection is disabled; confirm plan support and intended Auth configuration before changing it.
- [ ] Re-run performance advisors after cleanup. The baseline included 33 unindexed-FK findings, 41 auth/RLS-initplan findings, 54 unused-index findings, and 107 multiple-permissive-policy findings. These are advisory finding counts, not permission to delete resources.
- [ ] Reconcile `coxaid`'s old bucket/chores migrations with the actual scholarship app. Do not apply its entire migration folder blindly.
- [ ] Capture and verify a consistent full logical backup, including a tested restore and Auth handling, before any application/schema migration. Current scoped backups are **not** a complete disaster-recovery backup.

## Remaining deliverables

- [x] `DATABASE_INVENTORY.md` and `DATABASE_INVENTORY.csv` generated, including purpose, ownership, exact counts, catalog dependencies, source, status, and recommended action.
- [x] Raw schema/security/function/dependency evidence and rollback artifacts saved locally.
- [x] Reusable AGENTS, architecture, ownership, migration, and new-app checklist templates generated.
- [ ] Finish the Current Architecture Report and application-to-database dependency map, including deployment evidence and uncertainty.
- [ ] Finish the severity-ranked Database Problem Report.
- [ ] Finish the architecture recommendation comparing separate projects, schemas, and hybrid approaches. Working direction: keep one project initially, establish boundaries, and migrate apps individually only after backups/tests; keep shared finance dependencies coordinated.
- [ ] Finish the ordered Migration Roadmap with per-app destination, risk, priority, verification, downtime, and rollback.
- [ ] Finish the long-term monitoring/retirement standards and cleanup change log.
- [ ] Re-run final advisors and app regressions, record remaining findings, and package/link the completed reports.

## Where the evidence and rollback files are

All paths below are relative to `/Users/cox/Documents/supabase-audit-2026-10-13`:

- `evidence/catalog.json`: original schemas, objects, comments, grants and publications.
- `evidence/structure.json`: baseline columns, constraints, indexes, policies and default grants.
- `evidence/code.json`: function bodies, views, triggers and view dependencies.
- `evidence/row-counts.json`, `foreign-key-checks.json`, `data-health.json`: structural integrity evidence.
- `evidence/cleanup-data-backup.json`: scoped row backup; restricted local file permissions.
- `evidence/cleanup-verification.json`: post-cleanup hashes and retained uniqueness verification.
- `evidence/duplicate-policies.json`, `duplicate-index.json`: equivalence/dependency evidence.
- `drafts/cleanup-exact-duplicates.sql`: **already applied**, not a pending draft to rerun.
- `drafts/rollback-exact-duplicates.sql`: restores the removed policies and standalone index.
- `cleanup/ownership-comments.sql`: applied ownership labels; `rollback-ownership-comments.sql` restores originals.
- `cleanup/quick-task/original-index.ts`: original function source; `index.ts` and `authorize.mjs` are deployed version 9 source; `authorize.test.mjs` contains tests.
- `cleanup/Menu-original-index.html`, `Menu-fixed-index.html`, `Menu-fixed-script.js`: original/corrected old meal app and syntax-check artifact.
- `evidence/repository-instructions-installed.json`: eight installed instruction commits.
- `evidence/source-scan.json`: repository query/config evidence at audited source revisions.
- `evidence/netlify-deployments.json`: sanitized metadata from the currently connected Netlify account. That account's five sites did not identify the `Menu` deployment.
- `evidence/github-deployments.json`: completed read-only deployment lookup results; seven app repositories have GitHub Pages URLs. The lookup was collected before the pause and its already-running result was recorded during checklist creation.
- `templates/`: reusable standards and 42 repository instruction drafts.

## Resume order

1. Read this checklist and check whether the database, repositories, and deployments changed during the pause.
2. Verify the live legacy `Menu` correction before any more meal-table cleanup.
3. Complete final advisor checks and real signed-in checks of the changed endpoint where credentials are available.
4. Finish the five audit deliverables and record all implemented changes versus remaining proposals.
5. Establish full backup/restore capability before larger changes.
6. Select one app migration at a time; do not delete legacy/unknown objects or split the shared finance table without complete dependency validation.

**No production tables or user records were deleted, moved, renamed, or replaced during this audit. Auth accounts and passwords were preserved.**
