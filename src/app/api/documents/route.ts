import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractEventsFromText } from "@/lib/mimo";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Documents GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Documents GET exception:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle JSON request (for client-side OCR results)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { file_name, file_type, ocr_text } = body;

      if (!file_name || !ocr_text) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Process with AI
      let processedText = "";
      let eventsCount = 0;

      try {
        const events = await extractEventsFromText(ocr_text);
        eventsCount = events.length;

        processedText = `Extracted ${eventsCount} events from ${file_name}.\n\n`;
        events.forEach((e) => {
          processedText += `• ${e.title} (${e.type}) - ${e.date}${e.time ? ` @ ${e.time}` : ""}\n`;
        });
      } catch (e) {
        console.error("AI extraction error:", e);
        processedText = `Text extracted from ${file_name} but AI processing failed.`;
      }

      // Save to database
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          file_name,
          file_type: file_type || "image",
          ocr_text,
          processed_text: processedText || null,
          events_count: eventsCount,
        })
        .select()
        .single();

      if (docError) {
        console.error("Document save error:", docError);
        return NextResponse.json({ error: docError.message }, { status: 500 });
      }

      // Get extracted events
      let events: any[] = [];
      try {
        events = await extractEventsFromText(ocr_text);
      } catch (e) {
        // Ignore
      }

      return NextResponse.json({
        document: doc,
        events,
      });
    }

    // Handle FormData request (for PDF/DOC/TXT files)
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 3) {
      return NextResponse.json({ error: "Maximum 3 files allowed" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      let fileType: "image" | "pdf" | "doc" | "txt" = "txt";
      let extractedText = "";

      // Determine file type and extract text
      if (mimeType.startsWith("image/")) {
        // Images should be processed client-side, skip here
        continue;
      } else if (mimeType === "application/pdf") {
        fileType = "pdf";
        try {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: buffer });
          const result = await parser.getText();
          extractedText = result.text;
        } catch (e) {
          console.error("PDF parse error:", e);
          extractedText = "";
        }
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        fileType = "doc";
        try {
          const mammothModule = await import("mammoth");
          const mammoth = mammothModule.default || mammothModule;
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } catch (e) {
          console.error("DOC parse error:", e);
          extractedText = "";
        }
      } else if (mimeType.startsWith("text/")) {
        fileType = "txt";
        extractedText = buffer.toString("utf-8");
      } else {
        continue;
      }

      // Process with AI
      let processedText = "";
      let eventsCount = 0;

      if (extractedText.trim()) {
        try {
          const events = await extractEventsFromText(extractedText);
          eventsCount = events.length;

          processedText = `Extracted ${eventsCount} events from ${file.name}.\n\n`;
          events.forEach((e) => {
            processedText += `• ${e.title} (${e.type}) - ${e.date}${e.time ? ` @ ${e.time}` : ""}\n`;
          });
        } catch (e) {
          console.error("AI extraction error:", e);
          processedText = `Text extracted from ${file.name} but AI processing failed.`;
        }
      }

      // Save to database
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          file_name: file.name,
          file_type: fileType,
          ocr_text: extractedText || null,
          processed_text: processedText || null,
          events_count: eventsCount,
        })
        .select()
        .single();

      if (docError) {
        console.error("Document save error:", docError);
        continue;
      }

      results.push({
        document: doc,
        events: extractedText.trim() ? await extractEventsFromText(extractedText).catch(() => []) : [],
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Documents POST exception:", error);
    return NextResponse.json({ error: "Failed to process documents" }, { status: 500 });
  }
}
