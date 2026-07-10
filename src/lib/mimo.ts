import { ExtractedEvent } from "@/types";

function getBaseUrl(): string {
  const apiKey = process.env.MIMO_API_KEY || "";
  if (apiKey.startsWith("tp-")) {
    return "https://token-plan-cn.xiaomimimo.com/v1";
  }
  return "https://api.xiaomimimo.com/v1";
}

const MIMO_MODEL = "mimo-v2.5-pro";

function getApiKey(): string {
  return process.env.MIMO_API_KEY || "";
}

export function isApiKeyConfigured(): boolean {
  return !!process.env.MIMO_API_KEY;
}

export async function extractEventFromText(text: string): Promise<ExtractedEvent> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MiMo API key not configured");

  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an event extraction assistant. Extract event details from the given text and return ONLY a JSON object with these fields:
- title (string): event title
- type (string): one of "event", "assignment", "exam", "competition", "task"
- date (string): in YYYY-MM-DD format
- time (string or null): in HH:MM format, null if not specified
- priority (string): one of "low", "medium", "high"
- description (string or null): brief description

If a date cannot be determined, use today's date. If priority is unclear, use "medium".
Return ONLY the JSON object, no other text.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`MiMo API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) throw new Error("No response from MiMo");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");

  return JSON.parse(jsonMatch[0]) as ExtractedEvent;
}
