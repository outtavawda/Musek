import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { deliverNativePush } from "@/lib/native-push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.MUSEK_PUSH_API_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webPushConfigured = Boolean(publicKey && privateKey && subject);
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Push storage is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const title = typeof body?.title === "string" ? body.title.slice(0, 100) : "MUSEK";
  const message = typeof body?.body === "string" ? body.body.slice(0, 240) : "You have a new update.";
  const link = typeof body?.url === "string" && body.url.startsWith("/") && !body.url.startsWith("//") ? body.url : "/";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: "A valid recipient is required." }, { status: 400 });
  }

  try {
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [{ data: subscriptions, error: subscriptionError }, { data: nativeTokens, error: nativeTokenError }] = await Promise.all([
      webPushConfigured
        ? admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId)
        : Promise.resolve({ data: [], error: null }),
      admin.from("native_push_tokens").select("id, token, platform").eq("user_id", userId)
    ]);
    if (subscriptionError) throw subscriptionError;
    if (nativeTokenError) throw nativeTokenError;

    if (webPushConfigured) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    const payload = JSON.stringify({ title, body: message, url: link });
    const webResultsPromise = (subscriptions || []).map(async subscription => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        }, payload, { TTL: 60 * 60, urgency: "normal" });
        return { delivered: true, expired: false };
      } catch (deliveryError: unknown) {
        const statusCode = typeof deliveryError === "object" && deliveryError && "statusCode" in deliveryError
          ? Number((deliveryError as { statusCode?: unknown }).statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        }
        return { delivered: false, expired: statusCode === 404 || statusCode === 410 };
      }
    });
    const nativeResultsPromise = (nativeTokens || []).map(async token => {
      try {
        const result = await deliverNativePush(token.platform, token.token, { title, body: message, url: link });
        if (result.expired) await admin.from("native_push_tokens").delete().eq("id", token.id);
        return result;
      } catch (deliveryError) {
        console.error("MUSEK native push delivery failed:", deliveryError);
        return { delivered: false, expired: false };
      }
    });
    const [webResults, nativeResults] = await Promise.all([
      Promise.all(webResultsPromise),
      Promise.all(nativeResultsPromise)
    ]);
    const allResults = [...webResults, ...nativeResults];
    return NextResponse.json({
      targeted: allResults.length,
      delivered: allResults.filter(result => result.delivered).length,
      expiredRemoved: allResults.filter(result => result.expired).length,
      webTargeted: webResults.length,
      nativeTargeted: nativeResults.length
    });
  } catch (error) {
    console.error("MUSEK push delivery failed:", error);
    return NextResponse.json({ error: "Push delivery failed." }, { status: 500 });
  }
}
