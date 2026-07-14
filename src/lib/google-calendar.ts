import { google } from "googleapis";
import { supabase } from "./supabase";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

export function getGoogleAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getGoogleAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getGoogleAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getStoredTokens() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "google_tokens")
    .single();

  if (error || !data) return null;

  try {
    return JSON.parse(data.value);
  } catch {
    return null;
  }
}

export async function storeTokens(tokens: any) {
  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "google_tokens", value: JSON.stringify(tokens) },
      { onConflict: "key" }
    );

  if (error) {
    console.error("Failed to store Google tokens:", error);
    throw error;
  }
}

export async function getCalendarEvents() {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new Error("Google Calendar not authenticated");
  }

  const oauth2Client = getGoogleAuthClient();
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // Get events from now to 3 months ahead
  const now = new Date();
  const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: threeMonthsLater.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items || [];
}

export function isHolidayEvent(event: any): boolean {
  const summary = (event.summary || "").toLowerCase();
  const description = (event.description || "").toLowerCase();

  // Keywords that indicate holidays
  const holidayKeywords = [
    "holiday",
    "public holiday",
    "national holiday",
    "christmas",
    "new year",
    "eid",
    "hari raya",
    "deepavali",
    "diwali",
    "chinese new year",
    "vesak",
    "thai pongal",
    "good friday",
    "easter",
    "merdeka",
    "national day",
    "labour day",
    "workers day",
    "independence day",
    "republic day",
  ];

  return holidayKeywords.some(
    (keyword) => summary.includes(keyword) || description.includes(keyword)
  );
}

export function mapGoogleEventToSkylerEvent(googleEvent: any) {
  const start = googleEvent.start?.dateTime || googleEvent.start?.date;
  const end = googleEvent.end?.dateTime || googleEvent.end?.date;

  // Parse date and time
  let date = "";
  let time = null;

  if (start) {
    const startDate = new Date(start);
    date = startDate.toISOString().split("T")[0];

    // If it has time (not all-day event)
    if (googleEvent.start?.dateTime) {
      time = startDate.toTimeString().split(" ")[0].substring(0, 5);
    }
  }

  // Determine priority based on whether it's an all-day event or has specific time
  let priority: "low" | "medium" | "high" = "medium";
  if (googleEvent.start?.dateTime) {
    priority = "medium"; // Has specific time
  } else {
    priority = "low"; // All-day event
  }

  return {
    title: googleEvent.summary || "Untitled Event",
    description: googleEvent.description || null,
    type: "event" as const,
    date,
    time,
    priority,
    status: "ongoing" as const,
  };
}

export async function isGoogleCalendarConfigured(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null;
}

export async function getLastSyncTime(): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "google_last_sync")
    .single();

  return data?.value || null;
}

export async function setLastSyncTime() {
  const now = new Date().toISOString();
  await supabase
    .from("settings")
    .upsert(
      { key: "google_last_sync", value: now },
      { onConflict: "key" }
    );
}
