# Sardoba PMS — Deployment Guide

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Vercel      │────▶│  Railway     │────▶│ PostgreSQL   │
│  (Web App)   │     │  (API)       │     │ (Railway DB) │
│  Next.js     │     │  NestJS      │     └──────────────┘
│  Port 3000   │     │  Port 3001   │            │
└─────────────┘     └─────────────┘     ┌──────────────┐
                                         │ Redis        │
                                         │ (Railway)    │
                                         └──────────────┘
```

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- Railway account (API + Database + Redis)
- Vercel account (Web App)
- Domain name (e.g., sardoba.uz)

## Quick Start (Railway + Vercel)

### 1. Set up Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Create a new project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Add Redis
railway add --plugin redis

# Deploy API
cd sardoba-agents/apps/api
railway up
```

### 2. Configure Railway Environment

Set the following variables in Railway dashboard:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=<auto-from-postgresql-plugin>
REDIS_URL=<auto-from-redis-plugin>
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
FRONTEND_URL=https://app.sardoba.uz
RESEND_API_KEY=<from-resend.com>
EMAIL_FROM=noreply@sardoba.uz
```

See `.env.production.example` for the full list.

### 3. Deploy Web to Vercel

```bash
# Install Vercel CLI
npm install -g vercel
vercel login

# Deploy
cd sardoba-agents/apps/web
vercel --prod
```

### 4. Configure Vercel Environment

In Vercel dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://api.sardoba.uz/v1
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-vapid-key>
NEXT_PUBLIC_WIDGET_URL=https://app.sardoba.uz/book
```

### 5. Run Database Migrations

```bash
# Railway CLI
railway run npm run start:prod
# Migrations run automatically on startup (synchronize is off, migrations auto-run)
```

### 6. Seed Demo Data

```bash
DATABASE_URL=<production-db-url> npx ts-node -r tsconfig-paths/register src/database/seeds/demo-seed.ts
```

Demo credentials:
- Email: `demo@sardoba.uz`
- Password: `Demo2025!`

## Domain Setup

### API Domain (Railway)

1. Railway Dashboard → Settings → Domains
2. Add custom domain: `api.sardoba.uz`
3. Add DNS CNAME record pointing to Railway's domain
4. SSL is automatic

### Web Domain (Vercel)

1. Vercel Dashboard → Settings → Domains
2. Add custom domain: `app.sardoba.uz`
3. Add DNS records as instructed by Vercel
4. SSL is automatic

## CI/CD (GitHub Actions)

Deployments are automated via `.github/workflows/deploy.yml`:

- **Push to `master`** → auto-deploy API to Railway + Web to Vercel
- **Pull requests** → CI runs lint + tests (`.github/workflows/ci.yml`)

### Required GitHub Secrets

```
RAILWAY_TOKEN       — Railway API token
VERCEL_TOKEN        — Vercel API token
VERCEL_ORG_ID       — Vercel organization ID
VERCEL_PROJECT_ID   — Vercel project ID
```

## Health Checks

- API: `GET /health` — returns `200 OK` with DB/Redis status
- API Docs: `GET /docs` — Swagger UI

## Monitoring

- **Sentry** — Error tracking for API and Web
- **Railway Logs** — API server logs
- **Vercel Analytics** — Web performance

## Troubleshooting

### API won't start
1. Check `DATABASE_URL` is correct and accessible
2. Check `REDIS_URL` is correct
3. Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are at least 32 chars
4. Check Railway logs: `railway logs`

### Database connection errors
1. Ensure SSL is enabled in production (`?sslmode=require`)
2. Check connection pool settings (`DATABASE_POOL_MAX`)
3. Verify the database is in the same region as the API

### Web app shows "Нет подключения к серверу"
1. Verify `NEXT_PUBLIC_API_URL` points to the correct API URL
2. Check CORS settings in the API allow the web domain
3. Test API directly: `curl https://api.sardoba.uz/health`
