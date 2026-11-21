import Link from "next/link";
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
    user.user_metadata?.display_name || "MUSEK Member";

  return (
    <main className="min-h-screen bg-[#080811] text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-5 py-5">
        <Link href="/" className="text-2xl font-black tracking-tight">MUSEK<span className="text-purple-400">.</span></Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/feed" className="text-gray-400 hover:text-white">Music feed</Link>
          <Link href="/profile" className="rounded-xl border border-white/10 px-4 py-2">Profile</Link>
        </div>
      </nav>
      <SocialClient userId={user.id} displayName={displayName} accountType={profile?.account_type || "fan"} />
    </main>
  );
}
