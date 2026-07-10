import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isApiKeyConfigured, testApiKey } from "@/lib/mimo";

async function ensureTablesExist() {
  try {
    // Try to create tables if they don't exist
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK (type IN ('event', 'assignment', 'exam', 'competition', 'task')),
          date DATE NOT NULL,
          time TIME,
          priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
          status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'done')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS periods (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL
        );
      `
    });
    return !error;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // Test MiMo API
    const mimoStatus = await testApiKey();

    // First check if tables exist by trying a simple query
    const { data, error } = await supabase
      .from("settings")
      .select("key, value");

    if (error) {
      console.error("Settings fetch error:", error);
      // Try to create tables
      await ensureTablesExist();

      return NextResponse.json({
        settings: {},
        mimoApiKeyConfigured: mimoStatus.configured,
        mimoApiValid: mimoStatus.valid,
        mimoApiError: mimoStatus.error,
        dbError: error.message,
        needsSetup: true,
      });
    }

    const settings: Record<string, string> = {};
    data?.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({
      settings,
      mimoApiKeyConfigured: mimoStatus.configured,
      mimoApiValid: mimoStatus.valid,
      mimoApiError: mimoStatus.error,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({
      settings: {},
      mimoApiKeyConfigured: false,
      error: "Failed to fetch settings",
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("settings")
      .upsert({ key, value }, { onConflict: "key" })
      .select()
      .single();

    if (error) {
      console.error("Settings save error:", error);
      return NextResponse.json({
        error: `Database error: ${error.message}`,
        hint: "Make sure you ran the supabase-setup.sql in your Supabase SQL Editor."
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
