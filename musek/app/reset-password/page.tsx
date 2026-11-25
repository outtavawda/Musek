import Link from "next/link";
import { updatePassword } from "../auth-actions";

export default function ResetPasswordPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <main className="authWrap">
      <div className="authGlow authGlowOne" aria-hidden="true" />
      <div className="authGlow authGlowTwo" aria-hidden="true" />
      <section className="authCard" aria-labelledby="reset-heading">
        <Link className="authBrand" href="/" aria-label="YASUH home">YASUH<span>.</span></Link>
        <div className="authIntro">
          <p className="authEyebrow"><span className="authEyebrowDot" /> SECURE YOUR ACCOUNT</p>
          <h1 id="reset-heading">Create a new <span>password.</span></h1>
          <p className="authDescription">Choose a new password for your YASUH account. Use at least 8 characters.</p>
        </div>
        {searchParams?.error && <div className="authError" role="alert">{searchParams.error}</div>}
        <form action={updatePassword} className="authForm">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" name="password" type="password" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" name="confirm_password" type="password" placeholder="Enter it again" minLength={8} autoComplete="new-password" required />
          <button className="authSubmit" type="submit">Update password <span aria-hidden="true">→</span></button>
        </form>
        <p className="authFooter"><Link href="/login">← Back to log in</Link><span>Music brings us together.</span></p>
      </section>
    </main>
  );
}
