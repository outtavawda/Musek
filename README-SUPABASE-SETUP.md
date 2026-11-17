# MUSEK authentication and profiles upgrade

This package adds Supabase email/password registration, login, logout, protected dashboard, profile editing, session refresh middleware, and a private-by-default profile table with Row Level Security (RLS).

## Before uploading

This is an upgrade to the existing MUSEK Next.js website. Extract the ZIP and merge its files into the root of the GitHub repository used by Vercel. Keep the existing landing page in `app/page.tsx` and existing `app/layout.tsx` and `app/globals.css`; replace `app/globals.css` with the supplied file only if you are comfortable merging styles. The supplied `app/globals.css` is a standalone replacement and may remove prior landing-page styles. Recommended: append the styles from this package to your existing `app/globals.css` instead.

Files to add/replace:
- `package.json` (adds Supabase packages)
- `middleware.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `app/auth-actions.ts`
- `app/auth/callback/route.ts`
- `app/signup/page.tsx`
- `app/login/page.tsx`
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `supabase/migrations/001_user_profiles.sql`

Do not delete the existing homepage (`app/page.tsx`).

## Step A — Run the database migration

1. Open your Supabase project.
2. Select **SQL Editor** in the left menu.
3. Choose **New query**.
4. Open `supabase/migrations/001_user_profiles.sql` from this package and copy all its contents into the SQL editor.
5. Click **Run**. Confirm it completes without an error.

The SQL enables RLS and limits profile reads/updates to the signed-in user who owns that profile.

## Step B — Check Vercel environment variables

Keep these in Vercel Project Settings → Environment Variables, at least for Production:
- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase publishable key (`sb_publishable_...` is accepted by Supabase client libraries)

Optional:
- `NEXT_PUBLIC_SITE_URL` = your deployed MUSEK website origin, e.g. `https://your-project.vercel.app` (no trailing slash). This is used for email confirmation redirects.

Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or browser code.

## Step C — Merge code and deploy

1. Download and extract this ZIP.
2. Upload/merge the listed files into the root of the existing GitHub repository connected to Vercel.
3. Preserve the existing `app/page.tsx` homepage.
4. Commit the changes to the production branch (often `main`).
5. Vercel should automatically build and deploy. If not, redeploy the latest commit.

## Step D — Configure email confirmation

In Supabase Dashboard → Authentication → URL Configuration:
- Set Site URL to your deployed MUSEK website origin.
- Add the same origin plus `/auth/callback` to Redirect URLs.

For a live production service, use a verified sending domain/SMTP provider before relying on large volumes of confirmation emails.

## Test

- Visit `/signup`, create a test account with an email you control.
- Confirm the email using the link.
- Visit `/login`, sign in.
- Visit `/dashboard` and `/profile`.
- Log out and verify `/dashboard` redirects to `/login`.

## Current scope and limitations

This upgrade covers email/password authentication and basic fan/artist/label profiles. It does not implement social login, password reset, public artist profile discovery, label team permissions, payments, coins, creator payouts, music upload/streaming, livestreaming or video calls. Artist/label account type is currently a profile label only; it is not a verified creator entitlement or a complete role/permission system.
