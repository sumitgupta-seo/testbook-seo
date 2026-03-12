# Testbook Seasonal SEO — Automation Dashboard

---

## Quick start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Step 1 — Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in the values below.

---

## Step 2 — OpenAI API key (for AI content briefs)

1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy it into `.env.local`:
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxx
```

---

## Step 3 — Google Search Console API (OAuth)

### 3a. Create Google Cloud project

1. Go to https://console.cloud.google.com
2. Click **Select a project → New Project**
3. Name it `testbook-seo` → **Create**

### 3b. Enable Search Console API

1. Go to **APIs & Services → Enable APIs and Services**
2. Search for **Google Search Console API** → **Enable**

### 3c. Create OAuth credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. If prompted, configure **OAuth consent screen** first:
   - User type: **Internal** (for team use)
   - App name: `Testbook SEO Dashboard`
   - Add your email → Save
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Testbook SEO`
   - Authorized redirect URIs — add both:
     ```
     http://localhost:3000/api/search-console/callback
     https://YOUR-APP.vercel.app/api/search-console/callback
     ```
5. Click **Create** → copy **Client ID** and **Client Secret**

### 3d. Add to `.env.local`

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GSC_SITE=https://testbook.com/
```

### 3e. Connect in the dashboard

1. Run `npm run dev`
2. Go to **Import Data → Live API tab**
3. Click **Sign in with Google**
4. Approve access → you'll be redirected back
5. Click **Sync now** to pull your real GSC data

---

## Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "Testbook SEO dashboard v1"
```

1. Go to https://github.com/new
2. Create repo named `testbook-seo` (private)
3. Copy the remote URL, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/testbook-seo.git
git branch -M main
git push -u origin main
```

---

## Step 5 — Deploy to Vercel

1. Go to https://vercel.com → **Add New Project**
2. Import your `testbook-seo` GitHub repo
3. Add **Environment Variables**:
   ```
   OPENAI_API_KEY          = sk-proj-...
   GOOGLE_CLIENT_ID        = xxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET    = GOCSPX-...
   NEXT_PUBLIC_APP_URL     = https://testbook-seo.vercel.app
   NEXT_PUBLIC_GSC_SITE    = https://testbook.com/
   ```
4. Click **Deploy** — live in ~2 minutes

5. After deploy, go back to Google Cloud → Credentials → your OAuth client
   → add your Vercel URL to **Authorized redirect URIs**:
   ```
   https://testbook-seo.vercel.app/api/search-console/callback
   ```

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/                    # CSV/XLSX file parsing
│   │   ├── analyze-keywords/          # OpenAI brief generation
│   │   └── search-console/
│   │       ├── auth/                  # OAuth redirect to Google
│   │       ├── callback/              # OAuth token exchange
│   │       ├── data/                  # Fetch GSC data
│   │       └── status/                # Check connection + logout
│   └── ...
├── components/
│   ├── SearchConsolePanel.tsx         # Connect + sync UI
│   └── tabs/
│       └── UploadTab.tsx              # Live API + CSV upload
└── ...
```
