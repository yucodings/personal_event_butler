import { NextResponse } from "next/server";
import { sendDailySummary } from "@/lib/telegram";

export async function POST() {
  try {
    const success = await sendDailySummary();

    if (success) {
      return NextResponse.json({ success: true, message: "Daily summary sent" });
    } else {
      return NextResponse.json(
        { error: "Failed to send. Check Telegram configuration." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
