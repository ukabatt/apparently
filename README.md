# Apparently Daily

A news feed that looks like someone's texting you the headlines. Black-outlined
message bubbles, timestamps, typing indicator animation — and a private admin
page where you can update the stories anytime, live.

## How it works

- **`/`** — the public feed. Anyone who visits sees the latest published stories.
- **`/admin`** — password-protected. Only you can log in and edit/publish stories.
- Stories are stored in a free Supabase database, so updates you publish from
  `/admin` show up for visitors instantly (no redeploy needed).

## One-time setup

### 1. Create a Supabase project (free)
1. Go to [supabase.com](https://supabase.com) → sign up → **New project**.
2. Once it's created, go to **Project Settings → API**. Copy:
   - **Project URL**
   - **anon public key**

### 2. Create the database table
1. In Supabase, go to **SQL Editor → New query**.
2. Paste the contents of `supabase-setup.sql` (included in this repo) and click **Run**.
   This creates the `stories` table and locks it down so only logged-in users
   (you) can edit it, while anyone can view it.

### 3. Create your admin login
1. In Supabase, go to **Authentication → Users → Add user**.
2. Create a user with your email + a password. This is what you'll use to log
   into `/admin` — nobody else will have these credentials.
   (You can turn off public sign-ups under **Authentication → Providers** so
   no one else can create an account.)

### 4. Connect your local project
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste in your Project URL and anon key from step 1.

### 5. Install and run locally
```bash
npm install
npm run dev
```
Visit `http://localhost:5173` for the feed, `http://localhost:5173/admin` to log in and edit.

## Editing stories

Go to `/admin`, log in, and edit the text box — one message per line. Add a
timestamp after a `|` if you want one to show:

```
apparently the Fed held rates steady | 8:02 AM
third meeting in a row, markets shrugged | 8:02 AM
```

Click **Save & publish** — the public feed updates immediately for everyone
viewing it.

## Deploying so it's live on the internet

1. Push this repo to GitHub (see below).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.
3. In Vercel's project settings, add the same two environment variables from
   your `.env` file (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy. You'll get a live URL — share `yoursite.com` publicly, and keep
   `yoursite.com/admin` for yourself.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apparently-daily.git
git push -u origin main
```

Your `.env` file is already excluded via `.gitignore`, so your Supabase keys
won't be pushed to GitHub. The anon key is safe to expose publicly anyway
(it's designed for client-side use), but your login password never leaves
Supabase.
