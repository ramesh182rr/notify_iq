# QA and Release Checklist

## Functional
- [ ] Listener permission onboarding and recovery.
- [ ] App exclusions enforced before persistence.
- [ ] Sensitive test fixtures redacted/discarded.
- [ ] Capture while RN UI is backgrounded/closed.
- [ ] Listener disconnect/reconnect and process recreation.
- [ ] Search and FTS index stay consistent after delete.
- [ ] Grouping never loses original records.
- [ ] Rules execute deterministically and can be paused.
- [ ] Daily digest references source records.

## Privacy/security
- [ ] No raw content in logs, analytics or crash reports.
- [ ] Cloud AI off by default.
- [ ] Cloud consent and payload minimisation tested.
- [ ] Secrets are not in Git or app bundle.
- [ ] R2 bucket is private; signed URLs expire.
- [ ] User can delete local history and cloud account data.
- [ ] Privacy policy and data safety disclosures reviewed.

## Device testing
- [ ] Pixel/AOSP-like device.
- [ ] Samsung device.
- [ ] One additional OEM (Xiaomi/OnePlus/Motorola etc.).
- [ ] Low-memory device if target supports it.
- [ ] Battery saver and background restrictions.
- [ ] Reboot and permission revocation.

## Release
- [ ] Production signing keys secured outside repo.
- [ ] Version and changelog updated.
- [ ] Crash-free beta review.
- [ ] Model download/consent disclosures.
- [ ] Store screenshots and privacy listing prepared.
- [ ] Rollback plan documented.
