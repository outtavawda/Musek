import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import webpush from "web-push";
import { deliverNativePush } from "@/lib/native-push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = createClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
      return NextResponse.json({ error: "A valid live room is required." }, { status: 400 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!publicKey || !privateKey || !subject || !url || !serviceKey) {
      return NextResponse.json({ delivered: 0, configured: false });
    }

    const admin = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: room, error: roomError } = await admin.from("social_live_rooms")
      .select("id,host_id,host_name,title,status").eq("id", roomId).maybeSingle();
    if (roomError) throw roomError;
    if (!room || room.host_id !== user.id || room.status !== "live") {
      return NextResponse.json({ error: "Live room not found or not owned by this account." }, { status: 403 });
    }

    const { data: follows, error: followsError } = await admin.from("artist_follows")
      .select("fan_id").eq("artist_id", user.id).neq("fan_id", user.id);
    if (followsError) throw followsError;
    const followerIds = Array.from(new Set((follows || []).map(row => row.fan_id)));
    if (!followerIds.length) return NextResponse.json({ delivered: 0, targeted: 0, configured: true });

    const { data: subscriptions, error: subscriptionError } = await admin.from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth").in("user_id", followerIds);
    if (subscriptionError) throw subscriptionError;
    const { data: nativeTokens, error: nativeTokenError } = await admin.from("native_push_tokens")
      .select("id,user_id,token,platform").in("user_id", followerIds);
    if (nativeTokenError) throw nativeTokenError;

    const message = {
      title: "An artist you follow is LIVE",
      body: `${room.host_name} just started a live room: ${room.title}`,
      url: `/social?room=${room.id}`
    };
    const payload = JSON.stringify(message);
    const webResultsPromise = (subscriptions || []).map(async subscription => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        }, payload, { TTL: 3600, urgency: "high" });
        return true;
      } catch (deliveryError: unknown) {
        const statusCode = typeof deliveryError === "object" && deliveryError && "statusCode" in deliveryError
          ? Number((deliveryError as { statusCode?: unknown }).statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        }
        return false;
      }
    });
    const nativeResultsPromise = (nativeTokens || []).map(async token => {
      try {
        const result = await deliverNativePush(token.platform, token.token, message);
        if (result.expired) {
          await admin.from("native_push_tokens").delete().eq("id", token.id);
        }
        return result.delivered;
      } catch (deliveryError) {
        console.error("MUSEK native push delivery failed:", deliveryError);
        return false;
      }
    });
    const [webResults, nativeResults] = await Promise.all([
      Promise.all(webResultsPromise),
      Promise.all(nativeResultsPromise)
    ]);
    const results = [...webResults, ...nativeResults];
    return NextResponse.json({
      targeted: results.length,
      delivered: results.filter(Boolean).length,
      webTargeted: webResults.length,
      nativeTargeted: nativeResults.length,
      configured: true
    });
  } catch (error) {
    console.error("MUSEK live push notification failed:", error);
    return NextResponse.json({ error: "Could not send live notifications." }, { status: 500 });
  }
}
