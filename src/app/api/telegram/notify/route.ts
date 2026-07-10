import { NextResponse } from "next/server";
import { sendDailySummary, testTelegramConnection } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "test") {
      const result = await testTelegramConnection();
      if (result.success) {
        return NextResponse.json({ success: true, message: "Telegram connection successful!" });
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
    }

    const result = await sendDailySummary();

    if (result.success) {
      return NextResponse.json({ success: true, message: "Daily summary sent" });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
