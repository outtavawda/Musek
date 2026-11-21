
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message || "Unable to sign in.")}`);
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_type")
    .eq("id", data.user.id)
    .maybeSingle();

  const accountType = String(
    profile?.account_type || data.user.user_metadata?.account_type || "fan"
  ).trim().toLowerCase();

  if (accountType === "artist") redirect("/dashboard");
  if (accountType === "label") redirect("/label-dashboard");
  redirect("/fan-dashboard");
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

export async function uploadProfilePhoto(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/profile?error=Please%20choose%20a%20photo.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    redirect("/profile?error=Use%20a%20JPG%2C%20PNG%20or%20WebP%20image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    redirect("/profile?error=Your%20photo%20must%20be%205MB%20or%20less.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

  const filePath = `${user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-images")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    redirect(`/profile?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data } = supabase.storage
    .from("profile-images")
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("user_profiles")
    .upsert({
      id: user.id,
      avatar_url: data.publicUrl,
      updated_at: new Date().toISOString()
    });

  if (updateError) {
    redirect(`/profile?error=${encodeURIComponent(updateError.message)}`);
  }

  redirect("/profile?message=Profile%20photo%20uploaded%20successfully.");
}
