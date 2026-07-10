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

const SYSTEM_PROMPT = `You are a deadline and due date extraction assistant. Focus on extracting dates that need action or attention.

PRIMARY TARGETS (always extract these):
- Due dates, deadlines (DDL)
- Submission dates
- Exam dates and times
- Assignment deadlines
- Competition dates
- Event dates that require attendance or action

Return a JSON object with "events" array. Each event has:
- title (string): Short, clear name of what is due
- type (string): "assignment" for submissions/homework, "exam" for tests/quizzes, "competition" for contests, "task" for other deadlines, "event" for meetings/classes
- date (string): YYYY-MM-DD format
- time (string|null): HH:MM format if specified
- priority (string): "high" for exams/deadlines, "medium" for assignments, "low" for optional
- description (string|null): ALL other related info (requirements, location, instructions, topics covered, weightage, notes, etc.)

Rules:
1. Extract ALL dates that need action - every due date, deadline, exam
2. If time not specified for exams, use null
3. For academic: include subject in title (e.g., "Math - Assignment 1 due")
4. Put ALL extra details in description (not in title)
5. Return ONLY the JSON object

Example:
{
  "events": [
    {
      "title": "Math - Assignment 1",
      "type": "assignment",
      "date": "2026-07-15",
      "time": "23:59",
      "priority": "high",
      "description": "Submit via LMS. Covers Chapter 1-5. Weightage: 10%. Late submissions not accepted."
    },
    {
      "title": "CS101 - Midterm",
      "type": "exam",
      "date": "2026-07-20",
      "time": "10:00",
      "priority": "high",
      "description": "Location: Hall A. Duration: 2 hours. Covers lectures 1-8. Open book allowed."
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
