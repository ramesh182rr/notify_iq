# NotifyIQ local model benchmark run

Copy this file for each runtime/device pair. Use the model and runtime pins in `MODEL_BENCHMARK_CANDIDATES.md`. Keep one result file per device, runtime, and artifact hash.

## Run metadata

- Run ID:
- Date/time (local and UTC):
- Operator:
- Device manufacturer/model/SKU:
- RAM/storage tier:
- Android version/build/API:
- SoC/GPU:
- Battery level / charging state:
- Ambient temperature:
- Thermal status before/after:
- Display state / power saver:
- Runtime and exact build/package hash:
- Backend/provider:
- Artifact name/revision/SHA-256:
- App commit and build variant:
- Test corpus revision:

## Workload and settings

- Corpus rows and language split:
- Prompt template/revision:
- Input length policy:
- Generation cap:
- Decode settings (greedy/temperature/top-p):
- Warm-up count:
- Cold-load trials:
- Per-case trials:
- Idle interval between trials:
- Offline mode confirmed:
- Any failed, skipped, or interrupted cases:

## Quality results

| Metric | Result |
|---|---:|
| Cases scored | |
| Valid JSON | |
| Category accuracy | |
| Category macro-F1 | |
| Priority accuracy | |
| Urgent false positives | |
| Urgent false negatives | |
| English category accuracy | |
| Hindi category accuracy | |
| Code-mixed category accuracy | |
| Parse failures / incomplete output | |

## Performance results

| Measurement | p50 | p95 | Notes |
|---|---:|---:|---|
| First launch to model ready (cold) | | | |
| Subsequent model load | | | |
| Prompt prefill tokens/second | | | |
| Decode tokens/second | | | |
| End-to-end classification latency | | | |
| Peak process RSS | | | |
| Battery change over run | | | |
| Thermal throttling / state change | | | |
| Download bytes | | | |
| Installed model bytes | | | |
| App package delta | | | |

## Failures and observations

- Crashes / ANRs:
- Unsupported ops / backend fallback:
- Output/template defects:
- Memory pressure / OS kills:
- Battery or thermal issues:
- Reproduction notes:

## Interpretation

- Compared with deterministic baseline:
- Device support conclusion:
- Acceptance gate met:
- Decision: adopt / defer / reject:
- Follow-up owner and task:
