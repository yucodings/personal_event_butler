import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("document_id", id)
      .order("date", { ascending: true });

    if (eventsError) {
      console.error("Events fetch error:", eventsError);
    }

    return NextResponse.json({
      ...document,
      events: events || [],
    });
  } catch (error) {
    console.error("Document GET exception:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete linked events first
    await supabase.from("events").delete().eq("document_id", id);

    // Delete document
    const { error } = await supabase.from("documents").delete().eq("id", id);

    if (error) {
      console.error("Document delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document DELETE exception:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
