import test from "node:test";
import assert from "node:assert/strict";
import syncDinner from "../netlify/functions/ha-sync-dinner.mjs";

test("scheduled sync sends only the minimal current dinner snapshot", async () => {
  const originalFetch = global.fetch;
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  process.env.HA_MEAL_WEBHOOK_URL = "https://home-assistant.test/api/webhook/secret";
  let posted;

  global.fetch = async (url, options = {}) => {
    if (String(url).includes("meal_app_households")) {
      return new Response(JSON.stringify([{ data: { plans: {} }, updated: "2026-11-10T12:00:00Z" }]), { status: 200 });
    }
    if (String(url) === process.env.HA_MEAL_WEBHOOK_URL) {
      posted = JSON.parse(options.body);
      return new Response(null, { status: 200 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    await syncDinner();
  } finally {
    global.fetch = originalFetch;
  }

  assert.deepEqual(Object.keys(posted).sort(), ["date", "meal_name", "planned", "status"]);
  assert.equal(posted.planned, false);
  assert.equal(posted.status, "unplanned");
  assert.equal(posted.meal_name, "");
});

