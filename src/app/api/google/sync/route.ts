import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getCalendarEvents,
  isHolidayEvent,
  mapGoogleEventToSkylerEvent,
  isGoogleCalendarConfigured,
  setLastSyncTime,
} from "@/lib/google-calendar";

export async function POST() {
  try {
    const configured = await isGoogleCalendarConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      );
    }

    // Fetch events from Google Calendar
    const googleEvents = await getCalendarEvents();

    // Filter out holidays
    const filteredEvents = googleEvents.filter((event) => !isHolidayEvent(event));

    // Get existing Google Calendar events in database
    const { data: existingEvents } = await supabase
      .from("events")
      .select("title, date")
      .like("description", "%[Google Calendar]%");

    const existingSet = new Set(
      (existingEvents || []).map((e) => `${e.title}-${e.date}`)
    );

    // Map and filter new events
    const newEvents = filteredEvents
      .map(mapGoogleEventToSkylerEvent)
      .filter((event) => {
        const key = `${event.title}-${event.date}`;
        return !existingSet.has(key);
      });

    // Insert new events
    let insertedCount = 0;
    for (const event of newEvents) {
      const { error } = await supabase.from("events").insert({
        ...event,
        description: event.description
          ? `${event.description}\n\n[Google Calendar]`
          : "[Google Calendar]",
      });

      if (!error) {
        insertedCount++;
      }
    }

    // Update last sync time
    await setLastSyncTime();

    return NextResponse.json({
      success: true,
      totalFromGoogle: googleEvents.length,
      holidaysFiltered: googleEvents.length - filteredEvents.length,
      newEventsAdded: insertedCount,
      message: `Synced ${insertedCount} new events from Google Calendar`,
    });
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
