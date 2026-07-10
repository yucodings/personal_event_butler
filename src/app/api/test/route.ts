import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Check if events table exists
  try {
    const { data, error } = await supabase.from("events").select("count").limit(1);
    results.eventsTable = {
      exists: !error,
      error: error?.message || null,
      code: error?.code || null,
    };
  } catch (e) {
    results.eventsTable = {
      exists: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  // Test 2: Check if settings table exists
  try {
    const { data, error } = await supabase.from("settings").select("count").limit(1);
    results.settingsTable = {
      exists: !error,
      error: error?.message || null,
      code: error?.code || null,
    };
  } catch (e) {
    results.settingsTable = {
      exists: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  // Test 3: Check if periods table exists
  try {
    const { data, error } = await supabase.from("periods").select("count").limit(1);
    results.periodsTable = {
      exists: !error,
      error: error?.message || null,
      code: error?.code || null,
    };
  } catch (e) {
    results.periodsTable = {
      exists: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  // Test 4: Try to insert a test event
  try {
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: "Test Event",
        type: "event",
        date: new Date().toISOString().split("T")[0],
        priority: "low",
        status: "ongoing",
      })
      .select();

    results.insertTest = {
      success: !error,
      error: error?.message || null,
      code: error?.code || null,
      data: data,
    };

    // Clean up test data
    if (data && data[0]) {
      await supabase.from("events").delete().eq("id", data[0].id);
    }
  } catch (e) {
    results.insertTest = {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  // Test 5: Check environment variables
  results.env = {
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY),
  };

  return NextResponse.json(results);
}
