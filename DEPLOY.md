# Deploying TransmogVault

Production stack:
- **Frontend** → Vercel (free, auto-deploys from `main`)
- **Backend**  → Fly.io (free tier, doesn't sleep)
- **Database** → Supabase (already deployed)

## 1. Prerequisites

```bash
# Install CLIs (one-time)
brew install flyctl                  # Fly.io CLI
npm install -g vercel                # Vercel CLI

# Sign in
fly auth signup                      # or: fly auth login
vercel login
```

## 2. Deploy the backend (Fly.io)

```bash
cd backend

# First time only — creates the app (pick a name; defaults to transmogvault-api)
fly launch --no-deploy

# Set runtime secrets (won't be in git, only on Fly.io's vault)
fly secrets set \
  BLIZZARD_CLIENT_ID="your_blizzard_id" \
  BLIZZARD_CLIENT_SECRET="your_blizzard_secret" \
  FRONTEND_URL="https://transmogvault.vercel.app" \
  SKIP_HYDRATE="true"

# Deploy
fly deploy

# Smoke test
curl https://transmogvault-api.fly.dev/             # → {"status":"ok",…}
curl 'https://transmogvault-api.fly.dev/api/transmogs?limit=1'
```

After deploy succeeds, **note the exact Fly.io URL** (e.g. `transmogvault-api.fly.dev`) — you'll need it for the Vercel rewrite.

If your Fly app name isn't `transmogvault-api`, edit `frontend/vercel.json` and change the `destination` URL.

## 3. Deploy the frontend (Vercel)

```bash
cd frontend

# First-time link to a Vercel project
vercel link

# Set production env vars in the Vercel dashboard
# (Settings → Environment Variables → Production):
#   REACT_APP_SUPABASE_URL      = https://xxx.supabase.co
#   REACT_APP_SUPABASE_ANON_KEY = eyJ...

# Push to production
vercel --prod
```

Vercel detects CRA automatically (`react-scripts build`).
`vercel.json` rewrites all `/api/*` requests to the Fly.io backend, so the
frontend keeps using relative paths like `/api/transmogs/...` unchanged.

## 4. Update `FRONTEND_URL` once you have the Vercel URL

```bash
cd backend
fly secrets set FRONTEND_URL="https://your-exact-vercel-domain.vercel.app"
# Fly auto-redeploys after secret change.
```

This wires the CORS allowlist on the backend to your real production domain.

## 5. Verify

- Open `https://your-app.vercel.app/`
- Open DevTools → Network. `/api/transmogs?...` should return 200.
- No CORS errors in the console.

## After deploy

- Domains: hook a custom domain in **Vercel → Domains** (free) or **Fly → Certificates**. Both auto-issue Let's Encrypt certs.
- Logs: `fly logs` for backend; Vercel dashboard → Deployments → Functions/Logs for frontend.
- Re-hydrate cache later: `fly secrets unset SKIP_HYDRATE && fly apps restart`. After it finishes, `fly secrets set SKIP_HYDRATE=true` again to avoid rehydrating on every restart.

## Cost estimate

- Vercel: $0/mo on hobby tier (100 GB bandwidth)
- Fly.io: $0/mo (3 shared-cpu-1x machines @ 256MB free)
- Supabase: $0/mo (free tier — 500MB db, 1GB storage)

Total: **$0/mo** until traffic grows past free limits.
