import { NextResponse } from "next/server";
import { getAuthUrl, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export async function GET() {
  try {
    const configured = await isGoogleCalendarConfigured();
    
    if (configured) {
      return NextResponse.json({ 
        configured: true,
        message: "Google Calendar is already connected" 
      });
    }

    const authUrl = getAuthUrl();
    
    return NextResponse.json({ 
      configured: false,
      authUrl,
      message: "Redirect user to authUrl to connect Google Calendar" 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
