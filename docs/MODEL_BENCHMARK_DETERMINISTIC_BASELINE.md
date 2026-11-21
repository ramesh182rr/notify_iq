# Deterministic classifier baseline

**Date:** 2026-11-21  
**Corpus:** 108 synthetic English, Hindi and code-mixed cases in `mobile/android/app/src/test/resources/notifyiq/notification-evaluation.tsv`  
**Implementation:** `NotificationAnalyzer` rules; no model runtime or network access  
**Execution:** Local JVM unit test, not an Android device benchmark

## Results

| Metric | Result |
|---|---:|
| Category accuracy | 0.954 (103/108) |
| Category macro-F1 | 0.955 |
| Priority accuracy | 1.000 (108/108) |
| Urgent false positives | 0 |
| Urgent false negatives | 0 |
| English category accuracy | 1.000 (36/36) |
| Hindi category accuracy | 0.944 (34/36) |
| Code-mixed category accuracy | 0.917 (33/36) |

The test reports rounded metrics; the case counts are the directly observed totals. This hand-authored corpus is a regression smoke set, not evidence of broad real-world accuracy. No latency, RSS, battery, thermal, model output validity, or model-vs-rules comparison was measured.

## Reproduction

```sh
fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:testDebugUnitTest --tests com.notifyiq.NotificationEvaluationTest
```

Gradle XML output: `mobile/android/app/build/test-results/testDebugUnitTest/TEST-com.notifyiq.NotificationEvaluationTest.xml`.

