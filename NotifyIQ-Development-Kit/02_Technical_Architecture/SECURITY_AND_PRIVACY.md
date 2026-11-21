# Security and Privacy Architecture

## Threat model
Notification text may contain private conversations, authentication codes, financial data, health details, travel plans and personal identifiers. Treat the notification store as sensitive personal data.

## Data minimisation
- Do not capture excluded packages.
- Extract only the fields needed for the feature.
- Screen for OTPs, one-time codes, passwords, card numbers and other high-risk patterns before persistence.
- Make retention configurable; default to a conservative period and explain it.
- Keep local processing as default.
- Do not send raw content to telemetry or crash reporting.

## Storage
- Use Android Keystore-backed encryption for encryption keys where feasible.
- Encrypt sensitive database content or use a vetted encrypted SQLite implementation after compatibility testing; do not invent cryptography.
- Exclude DB, WAL, SHM and export files from public backups.
- Protect export archives with authenticated encryption and user-controlled access.
- Use secure deletion semantics where technically possible and explain limitations of flash storage.

## Network
- TLS only.
- Store secrets in Render/Neon/R2 provider secret stores, never in mobile bundle or Git.
- Use short-lived signed URLs for R2 uploads/downloads.
- Validate account ownership on every API request.
- Rate-limit AI and export endpoints.
- Do not accept arbitrary R2 object keys from clients without authorization.

## Cloud AI consent
- Off by default.
- Show what fields will be sent and why.
- Minimise/redact before sending.
- Provide a per-request preview or clear consent settings.
- Never send excluded app content or OTP-like data.
- Do not retain request payloads in API logs.

## User controls
- Per-app exclusion.
- Sensitive categories exclusion.
- Retention duration.
- Clear one item / clear category / clear all.
- Export selected data.
- Disable cloud AI.
- Delete account and cloud metadata.

## Compliance work before public launch
Create privacy policy, data safety disclosures, consent screens, retention policy, account deletion procedure, incident response plan and Play Console review. Have legal/privacy language reviewed for the target markets.
