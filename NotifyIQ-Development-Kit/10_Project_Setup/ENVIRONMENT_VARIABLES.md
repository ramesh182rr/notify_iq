# Environment Variables

## Mobile app
Only public configuration belongs in the mobile app (e.g. API base URL). Never put DB credentials, R2 secrets, model-provider API keys or signing secrets in the mobile bundle.

## Backend
See `06_Backend/.env.example`.
- `DATABASE_URL`: Neon pooled Postgres connection string.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT_URL`: R2 service credentials.
- `JWT_SECRET`: only after selecting and implementing a reviewed auth design.
- `CLOUD_AI_ENABLED`: feature flag; default false.
- `CLOUD_AI_PROVIDER`, `CLOUD_AI_API_KEY`: optional provider config; store only in Render secret settings.

Never commit `.env`, private keys, signing configs or provider credentials. Rotate credentials immediately if exposed.
