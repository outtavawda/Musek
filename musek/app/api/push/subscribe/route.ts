import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Push subscription storage is not configured.");
  return createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signedInUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: Request) {
  try {
    const user = await signedInUser();
    if (!user) return NextResponse.json({ error: "Sign in to enable notifications." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
    if (!endpoint.startsWith("https://") || endpoint.length > 2048 || !p256dh || !auth || p256dh.length > 256 || auth.length > 256) {
      return NextResponse.json({ error: "A valid push subscription is required." }, { status: 400 });
    }
    const expirationTime = Number.isFinite(body.expirationTime) ? Math.floor(body.expirationTime) : null;
    const admin = adminClient();
    const { error } = await admin.from("push_subscriptions").upsert({
      user_id: user.id, endpoint, p256dh, auth, expiration_time: expirationTime,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MUSEK push subscription save failed:", error);
    return NextResponse.json({ error: "Could not save notification settings." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await signedInUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage notifications." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint.startsWith("https://") || endpoint.length > 2048) {
      return NextResponse.json({ error: "A valid push endpoint is required." }, { status: 400 });
    }
    const admin = adminClient();
    const { error } = await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MUSEK push subscription removal failed:", error);
    return NextResponse.json({ error: "Could not update notification settings." }, { status: 500 });
  }
}
