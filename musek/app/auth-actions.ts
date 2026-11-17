
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
      data: {
        display_name: displayName,
        account_type: accountType
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/callback`
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/signup?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

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

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType =
    existingProfile?.account_type ||
    user.user_metadata?.account_type ||
    "fan";

  const displayName = String(formData.get("display_name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const avatarUrl = String(formData.get("avatar_url") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const websiteUrl = String(formData.get("website_url") || "").trim();
  const artistName = String(formData.get("artist_name") || "").trim();
  const labelName = String(formData.get("label_name") || "").trim();

  const genres = String(formData.get("genres") || "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 10);

  const isPublic = formData.get("is_public") === "true";

  if (!displayName) {
    redirect("/profile?error=Display%20name%20is%20required.");
  }

  if (bio.length > 500) {
    redirect("/profile?error=Your%20bio%20must%20be%20500%20characters%20or%20less.");
  }

  const profileData: Record<string, unknown> = {
    id: user.id,
    display_name: displayName,
    bio,
    avatar_url: avatarUrl || null,
    location,
    is_public: isPublic,
    updated_at: new Date().toISOString()
  };

  if (accountType === "artist") {
    profileData.artist_name = artistName;
    profileData.genres = genres;
    profileData.website_url = websiteUrl || null;
  }

  if (accountType === "label") {
    profileData.label_name = labelName;
    profileData.website_url = websiteUrl || null;
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert(profileData);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?message=Profile%20saved%20successfully.");
}
