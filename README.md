# Family Table

A mobile-first household meal planner, grocery list, and reusable meal library. React + Vite, Supabase Auth/Postgres/Realtime, installable PWA.

## Use

Sign in with either existing household Supabase email/password account. Choose meals in **Plan** (Saturday–Friday), or fill open nights with suggestions. Meal purchase needs appear in **Shop** automatically. Tap usuals or add any item, then use store mode. **Meals** edits your actual meal library, ratings, favorites, shortlist, categories, and purchase needs.

On iPhone: Safari → Share → Add to Home Screen. Dark mode follows the device or can be chosen in settings. Offline shows the last saved week; shared writes require a connection. This avoids pretending unsynced edits reached your partner.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Public Supabase publishable key is intentionally in `src/db.js`; no service key is used. Data access is enforced by household membership RLS. All app tables/functions use the `family_table_` prefix; the private membership helper is in `family_table_internal`. Other personal apps are untouched.

## Data model

- `family_table_households`, `family_table_members`: shared access; no client membership writes.
- `family_table_meals`, `family_table_items`, `family_table_meal_items`: normalized meal library and things usually purchased.
- `family_table_plan`: one independently editable dinner per household/date; status planned/cooked/skipped provides history.
- `family_table_manual`: independent manual needs, by week, item, and unit.
- `family_table_shopping_state`: independent check, already-have, and total quantity override.
- `family_table_groceries`: security-invoker view, derived from active meal needs plus manual additions. Removes only absent generated needs; manual rows survive meal changes. Staples excluded only from automatic needs. Same item/unit merges; incompatible units stay separate. Missing quantities remain unknown rather than guessed. Numeric amounts scale by plan servings/base servings.

Realtime changes invalidate snapshots immediately; reconnect/focus refetch and a 30-second safety fallback recover missed events. Shared storage uses row writes, not one application JSON object. A user-scoped browser cache exists solely for offline reading. Same-row assignments are last-writer-wins. Shopping-state RPC patches only the changed column. Meal selection preserves the live servings value. Meal editing and its purchase links are one transaction.

## Migration and verification

`database/schema.sql`, `database/refinements.sql`, and `database/privileges.sql` record the applied additive migrations. **Do not rerun schema.sql on the configured project**; it has already been applied through the Supabase migration tool. All 90 meals, IDs, ratings, categories, groups, priorities, and 341 ingredient links were copied from `meals.*`. 85 inferred links keep their review flags. Originals remain unchanged. No quantities were invented. There was no legacy plan history to import.

`database/verify.sql` runs transactional integration assertions and rolls everything back: member access, unrelated-user isolation, grocery aggregation, serving scaling, staple exclusion, skipping, manual survival, and independent state updates. `tests/logic.test.mjs` checks the corresponding demo behavior and date boundaries.

QA: production build, 10 automated logic tests, live database integration assertions, authenticated-role checks for both existing members, and Safari desktop/390×844 phone-layout walkthrough of planning and shopping. Two actual authenticated phones and iOS installation must be checked by the household, since existing passwords were not provided. Supabase advisor reported no findings for the new app objects. Existing project advisories were outside this app's scope.
