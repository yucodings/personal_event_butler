import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isApiKeyConfigured } from "@/lib/mimo";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("key, value");

    if (error) throw error;

    const settings: Record<string, string> = {};
    data?.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({
      settings,
      mimoApiKeyConfigured: isApiKeyConfigured(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
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

    if (error) throw error;

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
