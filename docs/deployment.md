# Deployment

Beginner-friendly first (managed platforms, free tiers), structured so it can move to
AWS later without code changes.

| Piece | Where | Why |
|---|---|---|
| PostgreSQL + pgvector | **Neon** | managed Postgres, pgvector supported, generous free tier, one connection string |
| Core API + Vision service | **Render** (Docker web services) | deploys straight from the `Dockerfile`s, free tier, easy env vars |
| Caregiver dashboard | **Vercel** or **Netlify** | static bundle from `npm run build`; set `VITE_API_URL` |
| Patient app | **Expo EAS** | `eas build` → store binaries or an internal-distribution link |

## 1. Database (Neon)

1. Create a project → copy the connection string.
2. Convert it to SQLAlchemy form:
   `postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require`
3. `CREATE EXTENSION vector;` runs automatically — migration `0001` does it on first deploy.

## 2. Core API + Vision service (Render)

Use the blueprint:

```bash
# from the repo root, with a Render account connected to the GitHub repo
render blueprint launch   # reads render.yaml
```

Or create two Docker web services by hand:

| | Core API | Vision service |
|---|---|---|
| Root directory | `backend` | `vision-service` |
| Dockerfile path | `backend/Dockerfile` | `vision-service/Dockerfile` |
| Health check | `/api/v1/health` | `/health` |

**Core API env vars**

```
APP_ENV=production
DATABASE_URL=<neon sqlalchemy url>
JWT_SECRET_KEY=<python -c "import secrets;print(secrets.token_urlsafe(64))">
LLM_PROVIDER=gemini
GEMINI_API_KEY=<key>
VISION_SERVICE_URL=<render URL of the vision service>
VISION_SERVICE_TOKEN=<shared secret, same on both>
ENABLE_SCHEDULER=true
CORS_ORIGINS_RAW=https://<your-dashboard-domain>
```

Migrations run on container start (`docker-entrypoint.sh` → `alembic upgrade head`).

## 3. Dashboard (Vercel)

- Framework preset: **Vite**. Root directory: `dashboard`.
- Build env var: `VITE_API_URL=https://<core-api-domain>`.
- `dashboard/vercel.json` already rewrites all paths to `index.html` for client routing.

## 4. Patient app (Expo EAS)

```bash
cd mobile
npx eas login
npx eas build:configure
# set the production API URL for the build
echo "EXPO_PUBLIC_API_URL=https://<core-api-domain>" > .env.production
npx eas build --profile production --platform android
```

Push notifications: with the managed Expo push service no extra key is needed for the
Android/iOS credentials Expo manages; set `EXPO_ACCESS_TOKEN` on the backend only if you
want authenticated sends.

## Moving to AWS later (no code change)

| Managed now | AWS equivalent |
|---|---|
| Neon | RDS for PostgreSQL (enable `pgvector`) |
| Render web services | ECS Fargate services (same Docker images) or App Runner |
| Vercel static | S3 + CloudFront |
| — | Secrets Manager for env vars; ALB for TLS |

The images and the `DATABASE_URL` / env-var contract are the same; only the platform
wiring changes.

## Pre-flight checklist

- [ ] `JWT_SECRET_KEY` is a fresh 64-byte random value, not the dev default
- [ ] `APP_ENV=production` (locks CORS to `CORS_ORIGINS_RAW`)
- [ ] `VISION_SERVICE_TOKEN` matches on the Core API and the Vision service
- [ ] HTTPS on every public URL (platform-provided)
- [ ] `.env` files are **not** in the image (`.dockerignore` covers them)
- [ ] Only one Core API instance runs the scheduler, or move it to a worker
