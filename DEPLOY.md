# Sardoba PMS — Deployment Guide (Supabase + Railway)

## Architecture

```
┌──────────────────────────────────────────────┐
│  Supabase (data — lives forever)             │
│  ┌─────────────┐  ┌───────────────────────┐  │
│  │ PostgreSQL   │  │ Auto-backups (7 days) │  │
│  │ sardoba_prod │  │ Point-in-time restore │  │
│  └─────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────┘
           ▲ DATABASE_URL (SSL)
           │
┌──────────┴───────────────────────────────────┐
│  Railway (app — can be recreated anytime)     │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ API     │  │ Web      │  │ Redis       │ │
│  │ :3001   │  │ :3000    │  │ (plugin)    │ │
│  └─────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────────────────────────┘
```

**Key principle:** Data lives in Supabase. App server (Railway) can be redeployed, scaled, or recreated without losing any data.

---

## Step 1: Supabase Setup (Database)

### 1.1 Create Project

1. Go to https://supabase.com/dashboard → **New Project**
2. Name: `sardoba-pms`
3. Database Password: **save securely** (needed for `DATABASE_URL`)
4. Region: **EU Central** (closest to Uzbekistan)
5. Plan: **Pro** ($25/mo) — includes daily backups, 8GB storage

### 1.2 Get Connection String

Go to **Settings → Database → Connection string → URI**

```
postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

> **Important:** Use port `6543` (connection pooler), not `5432` (direct).

### 1.3 Enable Backups

- **Pro plan** has automatic daily backups (7-day retention)
- Go to **Database → Backups** to verify
- For manual backups: `./scripts/backup-db.sh`

---

## Step 2: Railway Setup (Application)

### 2.1 Create Project

1. Go to https://railway.com → **New Project**
2. Select **Deploy from GitHub repo**
3. Connect your `sardoba-agents` repository

### 2.2 Add Redis Plugin

1. In Railway project → **+ New** → **Database** → **Redis**
2. Railway provides `REDIS_URL` automatically

### 2.3 Create API Service

1. **+ New** → **GitHub Repo** → select `sardoba-agents`
2. Settings:
   - **Root Directory:** `/` (monorepo root)
   - **Dockerfile Path:** `apps/api/Dockerfile.railway`
   - **Port:** `3001`
3. Add environment variables (see Section 3)

### 2.4 Create Web Service

1. **+ New** → **GitHub Repo** → select `sardoba-agents`
2. Settings:
   - **Root Directory:** `/` (monorepo root)
   - **Dockerfile Path:** `apps/web/Dockerfile.railway`
   - **Port:** `3000`
3. Add build args:
   - `NEXT_PUBLIC_API_URL` = `https://[api-service].railway.app/v1`
4. Add env: `NODE_ENV=production`

### 2.5 Custom Domains (optional)

- API: `api.sardoba.uz` → Railway API service
- Web: `app.sardoba.uz` → Railway Web service
- Or use Railway's auto-generated `*.railway.app` domains for demo

---

## Step 3: Environment Variables

### API Service (required)

```env
# Database (from Supabase)
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis (from Railway plugin — auto-injected)
# REDIS_URL=redis://... (auto-set by Railway)
REDIS_PASSWORD=<from-railway-redis>

# Core
NODE_ENV=production
PORT=3001
APP_URL=https://[api-service].railway.app
FRONTEND_URL=https://[web-service].railway.app

# JWT (generate: openssl rand -hex 32)
JWT_SECRET=<32-char-random-string>
JWT_EXPIRES_IN=86400
JWT_REFRESH_SECRET=<32-char-random-string>
JWT_REFRESH_EXPIRES_IN=604800

# Encryption (generate: openssl rand -hex 32)
ENCRYPTION_KEY=<64-hex-chars>
```

### API Service (optional — enable as needed)

```env
# Email (Resend — for booking confirmations)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@sardoba.uz

# Error tracking
SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0

# Cloudinary (room photos)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Telegram notifications
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_BOT_WEBHOOK_SECRET=xxx

# Feature flags
FEATURE_CHANNEL_MANAGER=false
FEATURE_ONLINE_PAYMENTS=false
FEATURE_ANALYTICS=true
```

### Web Service

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://[api-service].railway.app/v1
```

---

## Step 4: Initial Data Setup

### 4.1 Run Migrations

Migrations run automatically on API startup (via `railway-start.sh`).

### 4.2 Seed Demo Data

From your local machine:

```bash
# Set Supabase connection URL
export DATABASE_URL='postgresql://postgres.[ref]:[pass]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

# Build API
npm run build --workspace=@sardoba/api

# Run demo seed
cd apps/api
npx ts-node src/database/seeds/seed-demo.ts
```

### 4.3 Verify

Open `https://[web-service].railway.app` and login:

| Role | Email | Password |
|------|-------|----------|
| Owner | demo@sardoba.uz | Demo123! |
| Manager | manager@sardoba.uz | Manager123! |
| Reception | reception@demo.uz | Reception123! |

Public booking page: `https://[web-service].railway.app/book/sardoba-boutique`

---

## Step 5: For Real Hotel Beta

When onboarding a real hotel:

### 5.1 Clean Data

Run the standard seed (not demo) or let them start with empty property:

```bash
export DATABASE_URL='...'
cd apps/api
npx ts-node src/database/seeds/seed.ts
```

### 5.2 Update Hotel Details

Login as owner → Settings → update:
- Hotel name, address, phone
- Room configuration (names, prices, types)
- Booking page settings (photos, description)
- Notification recipients (Telegram chat IDs)

### 5.3 Change Default Passwords

**Critical:** Change all default passwords before giving access to hotel staff.

---

## Backup & Restore

### Manual Backup (local)

```bash
export SUPABASE_DB_URL='postgresql://...'
./scripts/backup-db.sh
# Creates: backups/sardoba_20260314_120000.sql.gz
```

### Restore from Backup

```bash
export SUPABASE_DB_URL='postgresql://...'
./scripts/restore-db.sh backups/sardoba_20260314_120000.sql.gz
```

### Supabase Auto-Backups

- Dashboard → Database → Backups
- Pro plan: daily backups, 7-day retention
- Point-in-time recovery available

---

## Server Migration

If you need to move to a different server (e.g., new Railway project):

1. Data stays in Supabase — nothing to migrate
2. Create new Railway project
3. Copy environment variables
4. Deploy — done

If switching from Supabase to another provider:

```bash
# Backup from Supabase
export SUPABASE_DB_URL='postgresql://old-supabase-url'
./scripts/backup-db.sh

# Restore to new provider
export SUPABASE_DB_URL='postgresql://new-db-url'
./scripts/restore-db.sh backups/sardoba_latest.sql.gz
```

---

## Monitoring

| What | Where |
|------|-------|
| App logs | Railway → Service → Logs |
| DB dashboard | Supabase → Table Editor |
| Error tracking | Sentry (if SENTRY_DSN set) |
| DB performance | Supabase → Database → Performance |
| API health | `GET /v1/health` |

---

## Cost Estimate

| Service | Plan | Cost/mo |
|---------|------|---------|
| Supabase | Pro | $25 |
| Railway | Starter | $5 + usage (~$10-15) |
| **Total** | | **~$40-45/mo** |

For demo/beta testing, Railway's hobby plan ($5/mo) is sufficient.
