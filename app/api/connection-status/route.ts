import { NextResponse } from "next/server";

// Checks public Supabase Auth configuration without exposing credentials.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ connected: false, reason: "Supabase configuration missing" }, { status: 503 });
  }
  try {
    const response = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json({ connected: response.ok }, { status: response.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ connected: false }, { status: 503 });
  }
}
