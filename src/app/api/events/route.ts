import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const sortBy = searchParams.get("sortBy") || "date";
    const order = searchParams.get("order") || "asc";

    let query = supabase.from("events").select("*");

    if (status) {
      query = query.eq("status", status);
    }
    if (type) {
      query = query.eq("type", type);
    }

    const validSortFields = ["date", "title", "priority", "created_at"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "date";
    query = query.order(sortField, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      console.error("Events GET error:", error);
      return NextResponse.json({ error: error.message, hint: "Make sure the events table exists in Supabase. Run supabase-setup.sql" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Events GET exception:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, type, date, time, priority } = body;

    if (!title || !type || !date) {
      return NextResponse.json({ error: "Title, type, and date are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        description: description || null,
        type,
        date,
        time: time || null,
        priority: priority || "medium",
        status: "ongoing",
      })
      .select()
      .single();

    if (error) {
      console.error("Events POST error:", error);
      return NextResponse.json({
        error: `Database error: ${error.message}`,
        hint: "Make sure the events table exists in Supabase. Run supabase-setup.sql",
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Events POST exception:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
