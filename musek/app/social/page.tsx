import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialClient from "./social-client";

export default async function SocialPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, artist_name, account_type, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.artist_name || profile?.display_name ||
    user.user_metadata?.display_name || "YASUH Member";

  return (
    <SocialClient userId={user.id} displayName={displayName} accountType={profile?.account_type || "fan"} avatarUrl={profile?.avatar_url || null} />
  );
}
