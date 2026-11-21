# LiteRT-LM emulator trial

**Date:** 2026-11-21  
**Result:** Runtime loaded and all 108 synthetic cases completed. This is an emulator-only trial, not device-support evidence.

## Environment

- AVD: Pixel_8 / `sdk_gphone64_arm64`, Android 15 / API 35.
- Guest memory override: 6 GiB (`-memory 6144`); host: 16 GiB RAM.
- Graphics: software rendered; inference backend: CPU.
- LiteRT-LM Android: 0.19.0, loaded from a separate benchmark app using Kotlin 2.4.0. The production app remains on Kotlin 2.2.0 and has no LiteRT dependency.
- Model: `Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm`, repository revision `8d42ab5f1db14cad987fac57aeb17d070f9e180d`, 343,490,560 bytes, SHA-256 `bf1aba9ce8d963124407353c6aa4cbf72eba78db21ae133de983eac672ce83e0`.
- Input: all 108 synthetic corpus rows. No personal content or network inference.
- Generation: CPU, greedy (`topK=1`, `topP=1.0`, `temperature=0.0`), thinking disabled, 64-token output cap.

## Results

| Metric | Result |
|---|---:|
| Model load | 1,308 ms |
| Valid strict JSON | 106/108 |
| Category accuracy | 0.139 |
| Category macro-F1 | 0.071 |
| Priority accuracy | 0.713 |
| Urgent false positives / false negatives | 3 / 3 |
| English category accuracy | 0.111 |
| Hindi category accuracy | 0.167 |
| Code-mixed category accuracy | 0.139 |
| End-to-end latency p50 / p95 | 2,266 ms / 2,453 ms |
| Process high-water RSS | 1,851,744 KiB (~1.77 GiB) |
| Battery / thermal / decoded tokens per second | Not measured |

The two invalid outputs (synthetic case IDs `E056` and `E069`) were wrapped in Markdown code fences and counted as parse failures without repair. The deterministic baseline on this corpus scored category accuracy 0.954, macro-F1 0.955, priority accuracy 1.000, and zero urgent false positives/negatives. The LiteRT result is far below that baseline; do not adopt it for classification based on this trial.

These scores are from a small, hand-authored corpus and a software-rendered emulator. They are useful for reproducing this candidate's failure modes, not for claims about phones or broader classification quality.

## Reproduction

1. Build the isolated benchmark app with `./gradlew -p ../model-benchmark :app:assembleDebug :app:assembleDebugAndroidTest`.
2. Place `model.litertlm` and `notification-evaluation.tsv` in the benchmark app's external files directory on the emulator.
3. Run `adb shell am instrument -w -e class com.notifyiq.modelbenchmark.LiteRtCorpusBenchmarkTest com.notifyiq.modelbenchmark.test/androidx.test.runner.AndroidJUnitRunner`.

The benchmark source is under `mobile/model-benchmark/`. Model weights are kept outside Git and outside the production APK.
