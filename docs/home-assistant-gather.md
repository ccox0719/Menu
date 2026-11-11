# Home Assistant dinner arrival bridge

Gather sends a minimal, read-only dinner snapshot to Home Assistant once per minute. The bridge does not use a Supabase service-role key and does not change database policies or app data.

## Netlify functions

- `ha-sync-dinner`: production scheduled function. Reads only the `public-meals` household's current Saturday–Friday slot and, when needed, the referenced active meal name. It posts `{date, planned, status, meal_name}` to a secret Home Assistant webhook.
- `ha-tonights-dinner`: authenticated diagnostic endpoint. It returns the same current dinner result and requires `Authorization: Bearer <HA_MEAL_BRIDGE_TOKEN>`.

Production-only function environment variables:

- `HA_MEAL_WEBHOOK_URL` (secret)
- `HA_MEAL_BRIDGE_TOKEN` (secret)
- `SUPABASE_ANON_KEY` (publishable key; never a service-role key)

## Home Assistant entities

- People: `person.chris_cox`, `person.annie_cox`
- Kitchen Sonos: `media_player.kitchen_kitchen`
- Phones: `notify.mobile_app_chriss_iphone`, `notify.mobile_app_iphone_ac`
- Mode guards: `input_boolean.dinner_mode`, `input_boolean.family_gathering_mode`
- Preserved separately: `input_boolean.cooking_mode`
- Bridge state: `input_text.coxfam_gather_dinner_state`
- Per-person daily memory: `input_text.coxfam_gather_arrival_memory`
- Automations: `automation.coxfam_gather_dinner_sync`, `automation.coxfam_gather_arrival_dinner`

The arrival automation runs from 3:30 PM until 7:00 PM, queues simultaneous arrivals, waits 75 seconds for the next bridge refresh, and announces/notifies each adult at most once per local date. It does not turn Cooking Mode on or off. A missing, skipped, inactive, or stale meal reference becomes “Nothing is planned for dinner tonight.”

## Rollback

1. Disable `automation.coxfam_gather_arrival_dinner` and `automation.coxfam_gather_dinner_sync` in Home Assistant.
2. Remove the two `input_text.coxfam_gather_*` helpers if their stored state is no longer needed.
3. Remove the three production Netlify environment variables listed above.
4. Revert the commit that added the two Netlify functions and deploy the reverted site.

No database rollback is needed because this integration creates or changes no database objects, policies, grants, or rows.

