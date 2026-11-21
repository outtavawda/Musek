import Link from "next/link";
import { requestPasswordReset } from "../auth-actions";

export default function ForgotPasswordPage({ searchParams }: { searchParams?: { error?: string; message?: string } }) {
  return (
    <main className="authWrap">
      <div className="authGlow authGlowOne" aria-hidden="true" />
      <div className="authGlow authGlowTwo" aria-hidden="true" />
      <section className="authCard" aria-labelledby="forgot-heading">
        <Link className="authBrand" href="/" aria-label="MUSEK home">MUSEK<span>.</span></Link>
        <div className="authIntro">
          <p className="authEyebrow"><span className="authEyebrowDot" /> ACCOUNT RECOVERY</p>
          <h1 id="forgot-heading">Forgot your <span>password?</span></h1>
          <p className="authDescription">Enter the email address linked to your MUSEK account. If an account exists, we'll send you a secure reset link.</p>
        </div>
        {searchParams?.error && <div className="authError" role="alert">{searchParams.error}</div>}
        {searchParams?.message && <div className="authMessage" role="status">{searchParams.message}</div>}
        <form action={requestPasswordReset} className="authForm">
          <label htmlFor="recovery-email">Email address</label>
          <input id="recovery-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          <button className="authSubmit" type="submit">Send reset link <span aria-hidden="true">→</span></button>
        </form>
        <div className="authDivider"><span>REMEMBERED YOUR PASSWORD?</span></div>
        <Link className="authSignup" href="/login">Back to log in <span aria-hidden="true">→</span></Link>
        <p className="authFooter"><Link href="/">← Back to MUSEK</Link><span>Music brings us together.</span></p>
      </section>
    </main>
  );
}
