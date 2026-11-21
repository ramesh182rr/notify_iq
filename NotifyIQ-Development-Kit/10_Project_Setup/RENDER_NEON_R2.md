# Render + Neon + Cloudflare R2 Setup

## Render (FastAPI prototype)
1. Push repository to a private GitHub repository.
2. Create a Render Web Service and connect the repo.
3. Set root directory to `06_Backend` if using the included `render.yaml` layout.
4. Build: `pip install -r requirements.txt`.
5. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add secrets through Render environment settings.
7. Configure `/health` as health check.
8. Monitor logs and monthly usage.

Free Render web services spin down after 15 minutes without inbound traffic and can take around a minute to wake. Their local filesystem is ephemeral. Therefore: no persistent uploads, SQLite, model weights or critical scheduled jobs on the free service. Core app functionality must remain local.

## Neon PostgreSQL
1. Create a Neon project and database.
2. Copy pooled connection string if using serverless/concurrent API connections; keep credentials server-side.
3. Add `DATABASE_URL` to Render secrets and local `.env`.
4. Apply `06_Backend/sql/neon_schema.sql` through a migration process.
5. Monitor compute, storage, branches and egress; free quotas are limited and may change.
6. Keep raw notification content out of cloud DB by default.

## Cloudflare R2
1. Create private R2 bucket.
2. Create scoped API token with only required bucket permissions.
3. Configure endpoint URL and access keys as backend secrets.
4. Use S3-compatible API from backend (boto3 endpoint URL).
5. Use short-lived presigned URLs and validate export ownership before issuing them.
6. Encrypt export archive client-side or with a reviewed server-side envelope scheme before upload.
7. Add object lifecycle/expiry policy for temporary exports.
8. Verify checksum on upload/download.

## Cost and reliability notes
- Free tier limits are not guarantees of always-on service.
- Render cold start makes cloud AI interactive latency unpredictable.
- Neon scale-to-zero may introduce initial DB latency.
- R2 has a monthly free allowance for standard storage/operations, but monitor usage and current pricing.
- Never store credentials in app source or Git.
