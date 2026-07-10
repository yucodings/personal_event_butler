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

const SYSTEM_PROMPT = `You are an event extraction assistant. Your job is to extract ALL events, assignments, exams, competitions, and tasks from the given text.

Return a JSON object with a single field "events" containing an array of event objects. Each event object must have these fields:
- title (string): event title
- type (string): one of "event", "assignment", "exam", "competition", "task"
- date (string): in YYYY-MM-DD format
- time (string or null): in HH:MM format, null if not specified
- priority (string): one of "low", "medium", "high"
- description (string or null): brief description

Rules:
1. Extract ALL events found in the text, not just one
2. If a date cannot be determined, use today's date
3. If priority is unclear, use "medium"
4. If multiple events share the same date but different times, create separate entries
5. For academic events, include the subject name in the title (e.g., "Math - Assignment 1 due")
6. Return ONLY the JSON object, no other text

Example output format:
{
  "events": [
    {
      "title": "Math - Assignment 1",
      "type": "assignment",
      "date": "2026-07-15",
      "time": "23:59",
      "priority": "high",
      "description": "Chapter 1-5"
    },
    {
      "title": "CS101 - Midterm Exam",
      "type": "exam",
      "date": "2026-07-20",
      "time": "10:00",
      "priority": "high",
      "description": "Covers all lectures"
    }
  ]
}`;

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
