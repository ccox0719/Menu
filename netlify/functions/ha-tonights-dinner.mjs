import { timingSafeEqual } from "node:crypto";

const DEFAULT_SUPABASE_URL = "https://svaozzitkajgqzacldur.supabase.co";
const DEFAULT_HOUSEHOLD_CODE = "public-meals";
const DEFAULT_TIME_ZONE = "America/Chicago";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const response = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

function authorized(request, expectedToken) {
  const supplied = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!expectedToken || !supplied.startsWith(prefix)) return false;
  const actual = Buffer.from(supplied.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function localMealContext(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdays.indexOf(parts.weekday);
  if (weekday < 0) throw new Error("Unable to determine local weekday");

  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const dayIndex = (weekday + 1) % 7;
  const saturday = new Date(`${localDate}T12:00:00Z`);
  saturday.setUTCDate(saturday.getUTCDate() - dayIndex);

  return {
    localDate,
    weekKey: saturday.toISOString().slice(0, 10),
    dayIndex,
  };
}

async function supabaseJson(url, publishableKey) {
  const result = await fetch(url, {
    headers: { apikey: publishableKey },
    signal: AbortSignal.timeout(8_000),
  });
  if (!result.ok) throw new Error(`Supabase request failed (${result.status})`);
  return result.json();
}

export async function getTonightsDinner({ now = new Date(), env = process.env } = {}) {
    const supabaseUrl = env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
    const publishableKey = env.SUPABASE_ANON_KEY;
    const householdCode = env.SUPABASE_KEEPALIVE_CODE ?? DEFAULT_HOUSEHOLD_CODE;
    if (!publishableKey) throw new Error("Bridge is not configured");
    const context = localMealContext(now);
    const householdUrl = new URL("/rest/v1/meal_app_households", supabaseUrl);
    householdUrl.searchParams.set("select", "data,updated");
    householdUrl.searchParams.set("code", `eq.${householdCode}`);
    householdUrl.searchParams.set("limit", "1");
    const households = await supabaseJson(householdUrl, publishableKey);
    if (!Array.isArray(households) || households.length !== 1) {
      throw new Error("Gather household was not found");
    }

    const slot = households[0]?.data?.plans?.[context.weekKey]?.[context.dayIndex] ?? null;
    const base = {
      date: context.localDate,
      week: context.weekKey,
      day_index: context.dayIndex,
      source_updated_at: households[0].updated ?? null,
    };
    if (!slot?.meal || slot.notMade === true) {
      return {
        ...base,
        planned: false,
        status: slot?.notMade ? "not_made" : "unplanned",
        meal: null,
      };
    }

    const mealUrl = new URL("/rest/v1/meal_app_meals", supabaseUrl);
    mealUrl.searchParams.set("select", "id,name,updated_at");
    mealUrl.searchParams.set("id", `eq.${slot.meal}`);
    mealUrl.searchParams.set("household_code", `eq.${householdCode}`);
    mealUrl.searchParams.set("is_active", "eq.true");
    mealUrl.searchParams.set("limit", "1");
    const meals = await supabaseJson(mealUrl, publishableKey);
    const meal = Array.isArray(meals) && meals.length === 1 ? meals[0] : null;
    if (!meal?.name?.trim()) {
      return { ...base, planned: false, status: "unplanned", meal: null };
    }

    return {
      ...base,
      planned: true,
      status: "planned",
      meal: { id: meal.id, name: meal.name.trim(), updated_at: meal.updated_at ?? null },
    };
}

export default async (request) => {
  if (request.method !== "GET") return response(405, { error: "method_not_allowed" });
  if (!authorized(request, process.env.HA_MEAL_BRIDGE_TOKEN)) {
    return response(401, { error: "unauthorized" });
  }

  try {
    return response(200, await getTonightsDinner());
  } catch (error) {
    console.error("Home Assistant meal bridge failed", error);
    return response(502, { error: "meal_source_unavailable" });
  }
};


