import { NextResponse } from "next/server";
import { sendDailySummary, sendTelegramMessage } from "@/lib/telegram";

// Force dynamic rendering for cron
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

async function handleRequest(request: Request) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[Telegram Notify] Called at ${timestamp}`);
  
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "test") {
      console.log("[Telegram Notify] Test action requested");
      const { testTelegramConnection } = await import("@/lib/telegram");
      const result = await testTelegramConnection();
      
      console.log(`[Telegram Notify] Test result: ${JSON.stringify(result)}`);
      
      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          message: "Telegram connection successful!",
          timestamp 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: result.error,
          timestamp 
        }, { status: 400 });
      }
    }

    // Default: send daily summary
    console.log("[Telegram Notify] Sending daily summary...");
    const result = await sendDailySummary();
    
    const duration = Date.now() - startTime;
    console.log(`[Telegram Notify] Completed in ${duration}ms. Result: ${JSON.stringify(result)}`);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "Daily summary sent",
        timestamp,
        duration: `${duration}ms`
      });
    } else {
      console.error(`[Telegram Notify] Failed: ${result.error}`);
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        timestamp 
      }, { status: 400 });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Telegram Notify] Error after ${duration}ms: ${errorMessage}`);
    
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${errorMessage}`,
      timestamp 
    }, { status: 500 });
  }
}
