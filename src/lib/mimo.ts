import { ExtractedEvent } from "@/types";

function getBaseUrl(): string {
  const customBase = process.env.MIMO_BASE_URL;
  if (customBase) return customBase;

  const apiKey = process.env.MIMO_API_KEY || "";
  if (apiKey.startsWith("tp-")) {
    return "https://token-plan-sgp.xiaomimimo.com/v1";
  }
  return "https://api.xiaomimimo.com/v1";
}

const MIMO_MODEL = "mimo-v2.5";

function getApiKey(): string {
  return process.env.MIMO_API_KEY || "";
}

export function isApiKeyConfigured(): boolean {
  const key = process.env.MIMO_API_KEY;
  return !!key && key.length > 5;
}

export async function testApiKey(): Promise<{ configured: boolean; valid?: boolean; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.length <= 5) {
    return { configured: false };
  }

  try {
    const response = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [{ role: "user", content: "hi" }],
        max_completion_tokens: 5,
      }),
    });

    if (response.ok) {
      return { configured: true, valid: true };
    } else {
      const errorText = await response.text().catch(() => "");
      return { configured: true, valid: false, error: `API returned ${response.status}: ${errorText}` };
    }
  } catch (error) {
    return {
      configured: true,
      valid: false,
      error: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

const SYSTEM_PROMPT = `Extract ALL events/deadlines from text. Return JSON:
{"events":[{"title":"...","type":"event|assignment|exam|competition|task","date":"YYYY-MM-DD","time":"HH:MM|null","priority":"low|medium|high","description":"...|null"}]}

Rules:
- Extract EVERY event, deadline, due date found
- Use today's date if unclear
- Default priority: medium
- Separate events with different times
- For academic: include subject name in title (e.g. "Math - Assignment 1 due")
- Only return JSON, nothing else`;

export async function extractEventsFromText(text: string): Promise<ExtractedEvent[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MiMo API key not configured");

  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_completion_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`MiMo API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) throw new Error("No response from MiMo");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");

  const parsed = JSON.parse(jsonMatch[0]);

  if (Array.isArray(parsed.events)) {
    return parsed.events as ExtractedEvent[];
  } else if (parsed.title) {
    return [parsed as ExtractedEvent];
  } else {
    throw new Error("Invalid response format");
  }
}
