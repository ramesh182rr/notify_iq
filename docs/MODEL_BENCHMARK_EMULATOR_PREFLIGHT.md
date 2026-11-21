# Emulator benchmark preflight

**Date:** 2026-11-21  
**Status:** The original 2 GiB AVD was too small for model inference. On a temporary 6 GiB override, LiteRT completed the 108-case CPU trial and ONNX Runtime loaded the pinned graph; ONNX text generation remains unrun.

## Device and app checks

- ADB device: `emulator-5554`, Android emulator image `sdk_gphone64_arm64`.
- Android: API 35 / Android 15.
- Reported guest memory: 2,022,068 KiB total; 900,688 KiB available at the 2026-11-21 follow-up snapshot.
- The same Pixel_8 AVD was restarted with `-memory 6144` for the LiteRT trial; guest reported 6,069,180 KiB total, with about 3.1 GiB available while the model process was active.
- `/data` free storage: about 3.5 GiB.
- Graphics property: `emulation`; this is not a phone GPU backend result.
- Battery: 100%, not charging; emulator reported 25°C at the snapshot.
- Debug APK installed and the React Native home screen rendered when Metro was running.
- Android debug build and unit tests passed; all 14 Android instrumentation tests passed on the Pixel_8 AVD, including reminder validation/preview and explicit rule re-evaluation.
- `npm run typecheck` and `npm test -- --runInBand --watchman=false` — passed; four JS suites / eight tests.
- `:app:testDebugUnitTest --tests com.notifyiq.NotificationEvaluationTest` — passed; baseline quality metrics are recorded in `MODEL_BENCHMARK_DETERMINISTIC_BASELINE.md` (local JVM, not emulator inference).

The native notification-access status and user-rules storage/preview calls now resolve through `NativeModules` legacy interop. The module is intentionally not advertised as a TurboModule because this RN 0.88.1 bridgeless runtime exposed no `global.__turboModuleProxy`. Emulator smoke check queried access-off, granted listener access with Android's shell command, confirmed service connection, captured a synthetic “Payment/payment” notification as Finance, cleared NotifyIQ history, then restored access-off. This did not exercise the Settings permission UI, UI-closed capture, sensitive/exclusion behavior, or physical-device lifecycle.

## Model benchmark disposition

The LiteRT-LM 0.19.0 CPU trial completed on the 6 GiB AVD. Full results and limitations are in `MODEL_BENCHMARK_LITERT_EMULATOR.md`. ONNX Runtime 1.29.0 also loaded the pinned Q4F16 graph; the tokenizer and autoregressive cache loop have not yet been added. See `MODEL_BENCHMARK_ONNX_EMULATOR.md`. The initial 2 GiB AVD had only 0.86 GiB available, below the LiteRT candidate's upstream reference peak of approximately 1.9–2.1 GiB. Microsoft's Qwen Android sample states a 4 GB RAM minimum for quantized models and positions emulators for UI checks. The larger-memory trial enabled graph loading and LiteRT inference but does not make emulator results representative of phone performance.

The recorded artifact SHA and size were corrected from the pinned Hugging Face revision's LFS metadata. The downloaded file matched the upstream hash. The model was stored only under `/private/tmp` and emulator app-specific storage, never in the repository.

The 0.86 GiB available-memory reading came from the AVD's original 2 GiB configuration. Both the LiteRT run and ONNX graph-load probe used a temporary 6 GiB override and software/emulated graphics; neither result stands in for representative low-memory, mid-range, or flagship phones.

## Next steps

1. Add a compatible Qwen tokenizer and autoregressive KV-cache loop to the isolated ONNX harness; then run the 108-case corpus on the same 6 GiB AVD.
2. Keep physical-device performance, battery/thermal, and device-support claims open until representative phones are available.
3. Complete Settings-flow and UI-closed capture verification, plus the remaining sensitive-content, exclusion, removal and reconnect checks, before release readiness.
