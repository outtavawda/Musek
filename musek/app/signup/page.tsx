import Link from "next/link";
import { signUp } from "../auth-actions";

export default function SignupPage({ searchParams }: { searchParams?: { error?: string; message?: string } }) {
  return (
    <main className="authWrap">
      <div className="authGlow authGlowOne" aria-hidden="true" />
      <div className="authGlow authGlowTwo" aria-hidden="true" />
      <section className="authCard" aria-labelledby="signup-heading">
        <Link className="authBrand" href="/" aria-label="MUSEK home">MUSEK<span>.</span></Link>

        <div className="authIntro">
          <p className="authEyebrow"><span className="authEyebrowDot" /> JOIN THE COMMUNITY</p>
          <h1 id="signup-heading">Create your <span>account.</span></h1>
          <p className="authDescription">Join MUSEK as a fan, artist or record label and connect with the music community.</p>
        </div>

        {searchParams?.error && (
          <div className="authError" role="alert">
            <strong>We couldn't create your account.</strong>
            <span>{searchParams.error}</span>
          </div>
        )}
        {searchParams?.message && (
          <div className="authMessage" role="status">{searchParams.message}</div>
        )}

        <form action={signUp} className="authForm">
          <label htmlFor="signup-display-name">Display name</label>
          <input id="signup-display-name" name="display_name" type="text" placeholder="Your name" autoComplete="name" required />
          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" inputMode="email" required />
          <label htmlFor="signup-password">Password</label>
          <input id="signup-password" name="password" type="password" placeholder="Create a password (8+ characters)" minLength={8} autoComplete="new-password" required />
          <label htmlFor="signup-account-type">Account type</label>
          <select id="signup-account-type" name="account_type" defaultValue="fan">
            <option value="fan">Fan</option>
            <option value="artist">Artist</option>
            <option value="label">Record Label</option>
          </select>
          <button className="authSubmit" type="submit">Create account <span aria-hidden="true">→</span></button>
        </form>

        <div className="authDivider"><span>ALREADY ON MUSEK?</span></div>
        <Link className="authSignup" href="/login">Log in to your account <span aria-hidden="true">→</span></Link>
        <p className="authFooter"><Link href="/">← Back to MUSEK</Link><span>Music brings us together.</span></p>
      </section>
    </main>
  );
}
