# Feature Catalogue and Release Classification

| Feature | Description | Release |
|---|---|---|
| Notification capture | Receive supported Android notification events | MVP |
| App exclusions | Prevent selected apps from being retained | MVP |
| Sensitive-data gate | Detect/redact OTP and sensitive patterns before persistence | MVP |
| Unified inbox | Chronological notification list | MVP |
| Categories | Rule-based initial categorisation | MVP |
| Priority hints | Conservative importance classification | MVP |
| Search | Keyword, app and date filters | MVP |
| Saved/archive | User-controlled retention state | MVP |
| Daily overview | Deterministic summary cards | MVP |
| Basic insights | Volume, app and category counts | MVP |
| Daily digest | Source-linked generated summary | V1.1 |
| Duplicate grouping | Collapse repeated updates without deleting source events | V1.1 |
| Qwen local classification | Local inference for uncertain records | V1.1 after benchmark |
| Custom rules | User-defined conditions and actions | V1.2 |
| Natural-language search | Convert natural queries into safe filters/search terms | V1.2 |
| Related event grouping | Link multi-app delivery/travel/payment events | V1.3 |
| Ask NotifyIQ | Conversational questions over local permitted data | V2 |
| Cloud AI | Opt-in advanced summarisation | V2 |
| Optional sync | Sync selected settings/metadata, not raw content by default | V2 |
| Financial insights | Notification-derived amounts only; clearly labelled estimates | Later |
| Delivery/travel timeline | Infer status from notification events | Later |
| Task conversion | User-selected notification to reminder/task | Later |

## Non-negotiable safeguards
- No OTP retention.
- No raw-content cloud upload by default.
- No automatic dismissal of important system alerts.
- No claim that financial values are authoritative.
- Every inference can be corrected or ignored.
