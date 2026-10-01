// 관리 의견 AI 초안 — index.html의 createSampleShim()이 호출하는 Edge Function.
// 요청: { prompt: string, modelTier?: string }  →  응답: { text: string }
// API 키는 Supabase 비밀값(ANTHROPIC_API_KEY)에만 있고 브라우저에는 절대 노출되지 않는다.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "https://h9239021-ops.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const MAX_PROMPT_CHARS = 60_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // 편집 권한(editor) 계정만 허용 — 비용이 드는 호출이라 열람 전용 계정은 막는다
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return json({ error: "로그인이 필요합니다" }, 401);
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "editor") return json({ error: "편집 권한 계정만 사용할 수 있습니다" }, 403);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY 미설정" }, 503);

  let prompt = "";
  try {
    ({ prompt } = await req.json());
  } catch { /* fallthrough */ }
  if (typeof prompt !== "string" || !prompt.trim()) return json({ error: "prompt가 비어 있습니다" }, 400);
  if (prompt.length > MAX_PROMPT_CHARS) return json({ error: "prompt가 너무 깁니다" }, 413);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic API error", res.status, detail);
    return json({ error: `Anthropic API 오류 (${res.status})` }, 502);
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
  return json({ text });
});
