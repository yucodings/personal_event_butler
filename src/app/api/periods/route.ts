import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("periods")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch periods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, start_date, end_date, color } = body;

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Name, start_date, and end_date are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("periods")
      .insert({
        name,
        start_date,
        end_date,
        color: color || "#3b82f6",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create period" }, { status: 500 });
  }
}
