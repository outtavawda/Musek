 "use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("display_name") || "").trim();
  const accountType = String(formData.get("account_type") || "fan");

  if (!email || password.length < 8 || !displayName) {
    redirect("/signup?error=Enter%20your%20name%2C%20email%2C%20and%20a%20password%20of%20at%20least%208%20characters.");
  }
  if (!["fan", "artist", "label"].includes(accountType)) {
    redirect("/signup?error=Choose%20a%20valid%20account%20type.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, account_type: accountType },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/callback`
    }
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/signup?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  if (!displayName) redirect("/profile?error=Display%20name%20is%20required.");

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, display_name: displayName, bio, updated_at: new Date().toISOString() });

  if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  redirect("/profile?message=Profile%20saved.");
}
