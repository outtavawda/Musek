import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const VISITOR_COOKIE = "musek_play_visitor";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hashIdentity(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Play counting is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const trackId = typeof body?.trackId === "string" ? body.trackId : "";
    const action = body?.action;

    if (!UUID_PATTERN.test(trackId) || !["start", "complete"].includes(action)) {
      return NextResponse.json(
        { error: "A valid track and playback action are required." },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
    let shouldSetCookie = false;

    if (!visitorId || !UUID_PATTERN.test(visitorId)) {
      visitorId = randomUUID();
      shouldSetCookie = true;
    }

    const visitorHash = hashIdentity(serviceKey, `visitor:${visitorId}`);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let data: unknown;
    let error: { message: string } | null = null;

    if (action === "start") {
      const result = await admin.rpc("start_track_play_session", {
        p_track_id: trackId,
        p_visitor_hash: visitorHash,
      });
      data = result.data;
      error = result.error;
    } else {
      const sessionId =
        typeof body?.sessionId === "string" ? body.sessionId : "";
      const playbackPositionSeconds = Number(body?.playbackPositionSeconds);

      if (
        !UUID_PATTERN.test(sessionId) ||
        !Number.isFinite(playbackPositionSeconds) ||
        playbackPositionSeconds < 30
      ) {
        return NextResponse.json(
          { error: "A valid completed playback session is required." },
          { status: 400 }
        );
      }

      const result = await admin.rpc("complete_track_play_session", {
        p_session_id: sessionId,
        p_visitor_hash: visitorHash,
        p_playback_position_seconds: Math.floor(playbackPositionSeconds),
      });
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("MUSEK playback session failed:", error.message);
      return NextResponse.json(
        { error: "Could not process this playback session." },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      action === "start" ? { sessionId: data } : { counted: data === true }
    );

    if (shouldSetCookie) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    console.error("MUSEK playback route error:", error);
    return NextResponse.json(
      { error: "Could not process this playback session." },
      { status: 500 }
    );
  }
}
