import Link from "next/link";
import { signIn } from "../auth-actions";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <main className="authWrap">
      <section className="authCard">
        <Link className="brand" href="/">MUSEK<span>.</span></Link>
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Log in</h1>
        <p className="muted">Sign in to continue to MUSEK.</p>
        {searchParams?.error && <p className="notice error">{searchParams.error}</p>}
        <form action={signIn} className="form">
          <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="primaryButton" type="submit">Log in</button>
        </form>
        <p className="muted small">New to MUSEK? <Link href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
