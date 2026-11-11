import test from "node:test";
import assert from "node:assert/strict";
import handler, { localMealContext } from "../netlify/functions/ha-tonights-dinner.mjs";

const token = "test-token-with-enough-entropy";
const originalFetch = global.fetch;
const originalNow = Date.now;

function request(auth = true, method = "GET") {
  return new Request("https://example.test/.netlify/functions/ha-tonights-dinner", {
    method,
    headers: auth ? { authorization: `Bearer ${token}` } : {},
  });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function body(result) {
  return { status: result.status, json: await result.json() };
}

test.beforeEach(() => {
  process.env.HA_MEAL_BRIDGE_TOKEN = token;
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
});

test.after(() => {
  global.fetch = originalFetch;
  Date.now = originalNow;
});

test("maps the America/Chicago meal week from Saturday through Friday", () => {
  assert.deepEqual(localMealContext(new Date("2026-11-07T18:00:00Z")), {
    localDate: "2026-11-07",
    weekKey: "2026-11-07",
    dayIndex: 0,
  });
  assert.deepEqual(localMealContext(new Date("2026-11-14T01:00:00Z")), {
    localDate: "2026-11-13",
    weekKey: "2026-11-07",
    dayIndex: 6,
  });
});

test("rejects missing credentials before querying Gather", async () => {
  let called = false;
  global.fetch = async () => { called = true; };
  const result = await body(await handler(request(false)));
  assert.equal(result.status, 401);
  assert.equal(called, false);
});

test("returns unplanned without looking up a meal name", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return jsonResponse([{ data: { plans: {} }, updated: "2026-11-10T12:00:00Z" }]);
  };
  const result = await body(await handler(request()));
  assert.equal(result.status, 200);
  assert.equal(result.json.planned, false);
  assert.equal(result.json.meal, null);
  assert.equal(calls, 1);
});

test("treats a not-made slot as no current dinner", async () => {
  const context = localMealContext();
  global.fetch = async () => jsonResponse([{ data: { plans: { [context.weekKey]: { [context.dayIndex]: { meal: "old-id", notMade: true } } } } }]);
  const result = await body(await handler(request()));
  assert.equal(result.json.status, "not_made");
  assert.equal(result.json.meal, null);
});

test("returns only the active meal attached to today's latest slot", async () => {
  const context = localMealContext();
  let calls = 0;
  global.fetch = async (url) => {
    calls += 1;
    if (String(url).includes("meal_app_households")) {
      return jsonResponse([{ data: { plans: { [context.weekKey]: { [context.dayIndex]: { meal: "meal-id", notMade: false } } } }, updated: "2026-11-10T12:00:00Z" }]);
    }
    assert.match(String(url), /is_active=eq.true/);
    return jsonResponse([{ id: "meal-id", name: "  Lasagna  ", updated_at: "2026-11-10T12:01:00Z" }]);
  };
  const result = await body(await handler(request()));
  assert.equal(result.json.planned, true);
  assert.equal(result.json.meal.name, "Lasagna");
  assert.equal(calls, 2);
});

test("does not reuse a stale name when the referenced meal is absent or inactive", async () => {
  const context = localMealContext();
  global.fetch = async (url) =>
    String(url).includes("meal_app_households")
      ? jsonResponse([{ data: { plans: { [context.weekKey]: { [context.dayIndex]: { meal: "missing-id" } } } } }])
      : jsonResponse([]);
  const result = await body(await handler(request()));
  assert.equal(result.json.planned, false);
  assert.equal(result.json.meal, null);
});

