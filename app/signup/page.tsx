import Link from "next/link";
import { signUp } from "../auth-actions";

export default function SignupPage({ searchParams }: { searchParams?: { error?: string; message?: string } }) {
  return (
    <main className="authWrap">
      <section className="authCard">
        <Link className="brand" href="/">MUSEK<span>.</span></Link>
        <p className="eyebrow">JOIN THE COMMUNITY</p>
        <h1>Create your account</h1>
        <p className="muted">Sign up as a fan, artist or record label.</p>
        {searchParams?.error && <p className="notice error">{searchParams.error}</p>}
        {searchParams?.message && <p className="notice">{searchParams.message}</p>}
        <form action={signUp} className="form">
          <label>Display name<input name="display_name" autoComplete="name" required /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <label>Account type
            <select name="account_type" defaultValue="fan">
              <option value="fan">Fan</option>
              <option value="artist">Artist</option>
              <option value="label">Record label</option>
            </select>
          </label>
          <button className="primaryButton" type="submit">Create account</button>
        </form>
        <p className="muted small">Already registered? <Link href="/login">Log in</Link></p>
      </section>
    </main>
  );
}
