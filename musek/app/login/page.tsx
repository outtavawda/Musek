import Link from "next/link";
import { signIn } from "../auth-actions";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; message?: string } }) {
  return (
    <main className="authWrap">
      <div className="authGlow authGlowOne" aria-hidden="true" />
      <div className="authGlow authGlowTwo" aria-hidden="true" />
      <section className="authCard" aria-labelledby="login-heading">
        <Link className="authBrand" href="/" aria-label="MUSEK home">MUSEK<span>.</span></Link>
        <div className="authIntro">
          <p className="authEyebrow"><span className="authEyebrowDot" /> YOUR MUSIC. YOUR PEOPLE.</p>
          <h1 id="login-heading">Welcome <span>back.</span></h1>
          <p className="authDescription">Log in to your MUSEK account and get back to the music, creators and community you love.</p>
        </div>

        {searchParams?.message && <div className="authMessage" role="status">{searchParams.message}</div>}

        {searchParams?.error && (
          <div className="authError" role="alert">
            <strong>We couldn't log you in.</strong>
            <span>{searchParams.error}</span>
          </div>
        )}

        <form action={signIn} className="authForm">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" inputMode="email" required />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
          <div className="authForgot"><Link href="/forgot-password">Forgot password?</Link></div>
          <button className="authSubmit" type="submit">Log in <span aria-hidden="true">→</span></button>
        </form>

        <div className="authDivider"><span>NEW TO MUSEK?</span></div>
        <Link className="authSignup" href="/signup">Create an account <span aria-hidden="true">→</span></Link>
        <p className="authFooter"><Link href="/">← Back to MUSEK</Link><span>Music brings us together.</span></p>
      </section>
    </main>
  );
}
