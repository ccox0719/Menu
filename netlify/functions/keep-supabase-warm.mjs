const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://sggxzlhpdkqjlepbwdqf.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNnZ3h6bGhwZGtxamxlcGJ3ZHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NTUwMzMsImV4cCI6MjA1ODMzMTAzM30.qJ3KaJbiV7MAD_wHQhix3EJCJPWAEMYktAyqVocthwI";
const HOUSE_CODE = process.env.SUPABASE_KEEPALIVE_CODE ?? "public-meals";

export const config = { schedule: "@daily" };

export default async () => {
  const url = new URL("/rest/v1/households", SUPABASE_URL);
  url.searchParams.set("select", "code");
  url.searchParams.set("code", `eq.${HOUSE_CODE}`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const body = await response.text();
  if (!response.ok) {
    console.error("Supabase keepalive failed", response.status, body);
    return new Response(JSON.stringify({ok:false,status:response.status,body}), {
      status:500, headers:{"content-type":"application/json"},
    });
  }
  console.log("Supabase keepalive ok", body);
  return new Response(JSON.stringify({ok:true,status:response.status}), {
    status:200, headers:{"content-type":"application/json"},
  });
};
