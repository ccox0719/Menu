import { getTonightsDinner } from "./ha-tonights-dinner.mjs";

export const config = { schedule: "* * * * *" };

export default async () => {
  const webhookUrl = process.env.HA_MEAL_WEBHOOK_URL;
  if (!webhookUrl?.startsWith("https://")) {
    throw new Error("HA_MEAL_WEBHOOK_URL is not configured");
  }

  const dinner = await getTonightsDinner();
  const payload = {
    date: dinner.date,
    planned: dinner.planned,
    status: dinner.status,
    meal_name: dinner.meal?.name ?? "",
  };
  const result = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  if (!result.ok) throw new Error(`Home Assistant webhook failed (${result.status})`);
};

