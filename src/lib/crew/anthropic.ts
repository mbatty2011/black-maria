import Anthropic from "@anthropic-ai/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Claude client for the crew. The crew never makes the creative call — it
// proposes; the director locks. When ANTHROPIC_API_KEY is absent, callers use a
// deterministic offline fallback so the whole loop works with no keys.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = "claude-opus-4-8";

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Ask Claude for a JSON object matching the caller's shape. Returns parsed
 *  JSON, or null on any failure so callers fall back to the offline path. */
export async function askJSON<T>(
  system: string,
  user: string,
  maxTokens = 2000,
): Promise<T | null> {
  if (!hasClaude()) return null;
  try {
    const res = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch (err) {
    console.error("[crew] Claude call failed, using offline fallback:", err);
    return null;
  }
}
