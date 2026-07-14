import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, storeTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?google_error=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?google_error=no_code", request.url)
      );
    }

    const tokens = await getTokensFromCode(code);
    await storeTokens(tokens);

    return NextResponse.redirect(
      new URL("/settings?google_success=true", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?google_error=token_exchange_failed", request.url)
    );
  }
}
