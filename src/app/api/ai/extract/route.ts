import { NextRequest, NextResponse } from "next/server";
import { extractEventFromText, isApiKeyConfigured } from "@/lib/mimo";

export async function POST(request: NextRequest) {
  try {
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        { error: "MiMo API key not configured" },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;

      if (mimeType.startsWith("image/")) {
        return NextResponse.json(
          { error: "Image upload is not supported. Please describe the event details in text instead, or upload a PDF/document." },
          { status: 400 }
        );
      }

      let text = "";

      if (mimeType === "application/pdf") {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        text = result.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const mammothModule = await import("mammoth");
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        mimeType === "application/vnd.ms-powerpoint"
      ) {
        text = buffer.toString("utf-8");
        if (text.length < 50) {
          return NextResponse.json(
            { error: "PPT parsing has limited support. Please describe the content manually." },
            { status: 400 }
          );
        }
      } else if (mimeType.startsWith("text/")) {
        text = buffer.toString("utf-8");
      } else {
        return NextResponse.json(
          { error: "Unsupported file type" },
          { status: 400 }
        );
      }

      const result = await extractEventFromText(text);
      return NextResponse.json(result);
    }

    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const result = await extractEventFromText(text);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
