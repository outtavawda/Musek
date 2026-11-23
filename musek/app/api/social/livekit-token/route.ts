import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase configuration is incomplete." }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values: { name: string; value: string; options: CookieOptions }[]) {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to join a MUSEK live room." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
      return NextResponse.json({ error: "A valid live room is required." }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from("social_live_rooms")
      .select("id,status,host_id")
      .eq("id", roomId)
      .eq("status", "live")
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: "This live room is no longer available." }, { status: 404 });
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const missingSettings = [
      ["LIVEKIT_URL", livekitUrl],
      ["LIVEKIT_API_KEY", apiKey],
      ["LIVEKIT_API_SECRET", apiSecret],
    ]
      .filter(([, value]) => !value?.trim())
      .map(([name]) => name);

    if (missingSettings.length > 0) {
      const deploymentEnvironment = process.env.VERCEL_ENV || "unknown";
      const deploymentBranch = process.env.VERCEL_GIT_COMMIT_REF || "unknown";
      const deploymentCommit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown";
      const settingStatus = {
        LIVEKIT_URL: Boolean(livekitUrl?.trim()),
        LIVEKIT_API_KEY: Boolean(apiKey?.trim()),
        LIVEKIT_API_SECRET: Boolean(apiSecret?.trim()),
      };
      console.warn("MUSEK LiveKit configuration diagnostic:", {
        deploymentEnvironment,
        deploymentBranch,
        deploymentCommit,
        settingStatus,
      });

      return NextResponse.json({
        error: `Live video configuration is incomplete. Missing deployment setting(s): ${missingSettings.join(", ")}. Deployment: ${deploymentEnvironment}; branch: ${deploymentBranch}; commit: ${deploymentCommit}.`,
        missingSettings,
        diagnostic: { deploymentEnvironment, deploymentBranch, deploymentCommit, settingStatus },
      }, { status: 503 });
    }

    let canPublish = room.host_id === user.id;
    if (!canPublish) {
      const { data: invitation } = await supabase
        .from("social_live_invites")
        .select("id")
        .eq("room_id", room.id)
        .eq("invitee_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      canPublish = Boolean(invitation);
      if (!canPublish) {
        const { data: joinRequest } = await supabase
          .from("social_live_join_requests")
          .select("id")
          .eq("room_id", room.id)
          .eq("requester_id", user.id)
          .eq("status", "accepted")
          .maybeSingle();
        canPublish = Boolean(joinRequest);
      }
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name,artist_name")
      .eq("id", user.id)
      .maybeSingle();

    const displayName = profile?.artist_name || profile?.display_name ||
      user.user_metadata?.display_name || "MUSEK Member";

    const token = new AccessToken(apiKey!, apiSecret!, {
      identity: user.id,
      name: String(displayName).slice(0, 100),
      ttl: "2h",
    });

    token.addGrant({
      roomJoin: true,
      room: `musek-${room.id}`,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({ token: await token.toJwt(), serverUrl: livekitUrl, canPublish });
  } catch (error) {
    console.error("MUSEK live video token error:", error);
    return NextResponse.json({ error: "Could not prepare your live video connection." }, { status: 500 });
  }
}
