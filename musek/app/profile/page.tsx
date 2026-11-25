import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, uploadProfilePhoto, signOut } from "../auth-actions";
import PushNotificationSettings from "@/components/push-notification-settings";

const fieldStyle = {
  width: "100%",
  marginTop: "9px",
  padding: "14px 15px",
  borderRadius: "12px",
  border: "1px solid rgba(196, 160, 255, .17)",
  background: "rgba(8, 7, 14, .78)",
  color: "#f8f4ff",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block",
  color: "#d8cce9",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: ".04em",
  marginBottom: "19px",
};

const panelStyle = {
  border: "1px solid rgba(190, 140, 255, .18)",
  borderRadius: "22px",
  background: "linear-gradient(145deg, rgba(27, 19, 42, .94), rgba(12, 10, 18, .97))",
  boxShadow: "0 22px 70px rgba(0,0,0,.28)",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, bio, account_type, avatar_url, artist_name, genres, label_name, website_url, location, is_public")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) console.error("Profile loading error:", profileError.message);

  const accountType = profile?.account_type || user.user_metadata?.account_type || "fan";
  const displayName = profile?.display_name || user.user_metadata?.display_name || "Your name";
  const identity = accountType === "artist"
    ? profile?.artist_name || displayName
    : accountType === "label"
      ? profile?.label_name || displayName
      : displayName;

  return (
    <main style={{ minHeight: "100vh", padding: "0 24px 80px", color: "#fbf8ff", background: "radial-gradient(ellipse at 18% 0%, rgba(111, 38, 169, .28), transparent 34%), radial-gradient(ellipse at 90% 25%, rgba(82, 32, 125, .17), transparent 30%), #08070d" }}>
      <nav style={{ maxWidth: "1180px", height: "82px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(204, 173, 255, .12)" }}>
        <Link href="/" style={{ fontSize: "25px", fontWeight: 950, letterSpacing: "-1.5px", color: "#fff" }}>YASUH<span style={{ color: "#c084fc" }}>.</span></Link>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <Link href="/dashboard" style={{ color: "#c9bdd8", fontSize: "13px" }}>Dashboard</Link>
          <form action={signOut}><button type="submit" style={{ border: "1px solid rgba(216,180,254,.3)", background: "rgba(255,255,255,.04)", color: "#eee4fa", borderRadius: "999px", padding: "10px 17px", cursor: "pointer" }}>Log out</button></form>
        </div>
      </nav>

      <header style={{ maxWidth: "1180px", margin: "48px auto 30px" }}>
        <p style={{ color: "#c084fc", letterSpacing: ".24em", fontSize: "10px", fontWeight: 900, marginBottom: "13px" }}>THE CREATOR IDENTITY SUITE</p>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "clamp(36px, 6vw, 62px)", lineHeight: .98, letterSpacing: "-.055em", margin: 0, fontWeight: 900 }}>Make your mark<span style={{ color: "#c084fc" }}>.</span></h1>
            <p style={{ color: "#a99bb8", fontSize: "15px", lineHeight: 1.7, maxWidth: "560px", marginTop: "16px" }}>Shape how the YASUH community sees you. Build a profile that feels unmistakably yours.</p>
          </div>
          <div style={{ border: "1px solid rgba(192,132,252,.3)", background: "rgba(147,51,234,.1)", color: "#dfc2ff", borderRadius: "999px", padding: "9px 15px", fontSize: "11px", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>{accountType} account</div>
        </div>
      </header>

      {searchParams?.error && <div role="alert" style={{ maxWidth: "1180px", margin: "0 auto 20px", padding: "14px 18px", borderRadius: "12px", border: "1px solid rgba(248,113,113,.35)", background: "rgba(127,29,29,.18)", color: "#fecaca" }}>{searchParams.error}</div>}
      {searchParams?.message && <div role="status" style={{ maxWidth: "1180px", margin: "0 auto 20px", padding: "14px 18px", borderRadius: "12px", border: "1px solid rgba(74,222,128,.3)", background: "rgba(20,83,45,.18)", color: "#bbf7d0" }}>{searchParams.message}</div>}

      <div style={{ maxWidth: "1180px", margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(260px, .72fr) minmax(0, 1.6fr)", gap: "22px", alignItems: "start" }}>
        <aside style={{ ...panelStyle, padding: "26px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: "210px", height: "210px", borderRadius: "50%", background: "rgba(168,85,247,.16)", filter: "blur(55px)", top: "-90px", left: "20px", pointerEvents: "none" }} />
          <p style={{ color: "#b98ae8", fontSize: "10px", letterSpacing: ".2em", fontWeight: 900, margin: "0 0 22px", position: "relative" }}>PROFILE PREVIEW</p>
          <div style={{ position: "relative", width: "142px", height: "142px", margin: "0 auto 19px", borderRadius: "50%", padding: "4px", background: "linear-gradient(135deg, #e9b7ff, #7c3aed 55%, #32104f)", boxShadow: "0 0 38px rgba(168,85,247,.28)" }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Your profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block", border: "3px solid #171020" }} /> : <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center", background: "#1a1423", color: "#d8b4fe", fontSize: "48px", border: "3px solid #171020" }}>✦</div>}
          </div>
          <div style={{ textAlign: "center", position: "relative" }}>
            <h2 style={{ fontSize: "23px", letterSpacing: "-.03em", margin: "0 0 6px" }}>{identity}</h2>
            <p style={{ color: "#a99bb8", fontSize: "12px", margin: 0 }}>{profile?.location || "Add your location"}</p>
            <div style={{ display: "inline-flex", marginTop: "16px", borderRadius: "999px", padding: "7px 12px", background: profile?.is_public ? "rgba(74,222,128,.1)" : "rgba(255,255,255,.06)", border: profile?.is_public ? "1px solid rgba(74,222,128,.24)" : "1px solid rgba(255,255,255,.12)", color: profile?.is_public ? "#86efac" : "#b9afc5", fontSize: "10px", letterSpacing: ".12em", fontWeight: 800 }}>{profile?.is_public ? "● PUBLIC PROFILE" : "○ PRIVATE PROFILE"}</div>
          </div>
          <div style={{ height: "1px", background: "rgba(216,180,254,.12)", margin: "25px 0" }} />
          <h3 style={{ fontSize: "13px", margin: "0 0 8px", color: "#f0e5ff" }}>Your profile image</h3>
          <p style={{ fontSize: "12px", color: "#9d91aa", lineHeight: 1.6, margin: "0 0 16px" }}>Use a clear image that represents your sound, identity or label.</p>
          <form action={uploadProfilePhoto} encType="multipart/form-data">
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required style={{ width: "100%", color: "#b9abc9", fontSize: "11px", marginBottom: "13px" }} />
            <p style={{ color: "#82778e", fontSize: "10px", margin: "0 0 14px" }}>JPG, PNG or WebP · Maximum 5 MB</p>
            <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "11px", border: "1px solid rgba(192,132,252,.35)", background: "rgba(147,51,234,.13)", color: "#e9d5ff", fontWeight: 800, cursor: "pointer" }}>Upload new image</button>
          </form>
        </aside>

        <section style={{ ...panelStyle, padding: "clamp(22px, 4vw, 38px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "26px", flexWrap: "wrap" }}>
            <div><p style={{ color: "#b98ae8", fontSize: "10px", letterSpacing: ".2em", fontWeight: 900, margin: "0 0 8px" }}>PERSONAL DETAILS</p><h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-.03em" }}>Profile information</h2></div>
            <span style={{ color: "#8d819b", fontSize: "11px" }}>Changes save to your account</span>
          </div>
          <form action={updateProfile}>
            <label style={labelStyle}>Display name<input name="display_name" defaultValue={profile?.display_name || user.user_metadata?.display_name || ""} required style={fieldStyle} /></label>
            <label style={labelStyle}>About you<textarea name="bio" rows={5} maxLength={500} defaultValue={profile?.bio || ""} placeholder="Tell the YASUH community a little about yourself..." style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.65 }} /></label>
            <label style={labelStyle}>Account type<input value={accountType} readOnly style={{ ...fieldStyle, color: "#a99bb8", textTransform: "capitalize", cursor: "not-allowed" }} /></label>

            {accountType === "artist" && <div style={{ borderTop: "1px solid rgba(216,180,254,.13)", paddingTop: "24px", marginTop: "8px" }}>
              <p style={{ color: "#c084fc", fontSize: "10px", letterSpacing: ".2em", fontWeight: 900, margin: "0 0 17px" }}>ARTIST BRANDING</p>
              <label style={labelStyle}>Artist name<input name="artist_name" defaultValue={profile?.artist_name || ""} placeholder="Your artist name" style={fieldStyle} /></label>
              <label style={labelStyle}>Music genres<input name="genres" defaultValue={(profile?.genres || []).join(", ")} placeholder="Reggae, Dancehall, Hip-Hop" style={fieldStyle} /></label>
            </div>}

            {accountType === "label" && <div style={{ borderTop: "1px solid rgba(216,180,254,.13)", paddingTop: "24px", marginTop: "8px" }}>
              <p style={{ color: "#c084fc", fontSize: "10px", letterSpacing: ".2em", fontWeight: 900, margin: "0 0 17px" }}>LABEL BRANDING</p>
              <label style={labelStyle}>Record label name<input name="label_name" defaultValue={profile?.label_name || ""} placeholder="Your label name" style={fieldStyle} /></label>
            </div>}

            <div style={{ borderTop: "1px solid rgba(216,180,254,.13)", paddingTop: "24px", marginTop: "8px" }}>
              <p style={{ color: "#c084fc", fontSize: "10px", letterSpacing: ".2em", fontWeight: 900, margin: "0 0 17px" }}>PUBLIC PRESENCE</p>
              <label style={labelStyle}>Location<input name="location" defaultValue={profile?.location || ""} placeholder="City, Country" style={fieldStyle} /></label>
              {(accountType === "artist" || accountType === "label") && <label style={labelStyle}>Website<input name="website_url" type="url" defaultValue={profile?.website_url || ""} placeholder="https://yourwebsite.com" style={fieldStyle} /></label>}
              <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "13px", border: "1px solid rgba(192,132,252,.18)", background: "rgba(147,51,234,.07)", color: "#e5d7f4", fontSize: "13px", cursor: "pointer" }}>
                <input name="is_public" type="checkbox" value="true" defaultChecked={profile?.is_public || false} style={{ width: "17px", height: "17px", accentColor: "#a855f7" }} />
                <span><strong style={{ display: "block", marginBottom: "3px" }}>Make my profile public</strong><span style={{ color: "#9e91ad", fontSize: "11px" }}>Allow people to discover and view your profile on YASUH.</span></span>
              </label>
            </div>
            <button type="submit" style={{ width: "100%", marginTop: "24px", padding: "16px 20px", border: 0, borderRadius: "13px", background: "linear-gradient(100deg, #7e22ce, #a855f7 55%, #c026d3)", color: "white", fontWeight: 900, fontSize: "14px", letterSpacing: ".03em", cursor: "pointer", boxShadow: "0 10px 34px rgba(147,51,234,.3)" }}>Save profile changes <span aria-hidden="true">→</span></button>
          </form>
        </section>
      </div>
      <div style={{ maxWidth: "1180px", margin: "22px auto 0" }}><PushNotificationSettings /></div>
      <p style={{ maxWidth: "1180px", margin: "25px auto 0", color: "#8d819b", fontSize: "12px" }}><Link href="/dashboard" style={{ color: "#c4a4e8" }}>← Back to dashboard</Link></p>
      <style>{`@media (max-width: 760px) { main > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}
