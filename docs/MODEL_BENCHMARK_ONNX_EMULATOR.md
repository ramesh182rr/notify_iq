# ONNX Runtime emulator probe

**Date:** 2026-11-21  
**Result:** The pinned Q4F16 ONNX graph loaded successfully. Text generation and corpus scoring remain unimplemented for this candidate.

## Environment and artifact

- AVD: Pixel_8 / `sdk_gphone64_arm64`, Android 15 / API 35, temporary 6 GiB guest-memory override.
- Runtime: `com.microsoft.onnxruntime:onnxruntime-android:1.29.0` in the isolated model benchmark app. The earlier `1.29.1` pin was not published; Maven Central lists `1.29.0`.
- Model: `onnx/model_q4f16.onnx`, pinned ONNX Community revision `558750086ed49d78cb701ed6fa85af33fd16453f`, 569,789,750 bytes, SHA-256 `9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91`.
- Model bytes were downloaded to `/private/tmp` and copied only to emulator app-specific storage. No weights are in Git or the production APK.

## Graph-load result

- Session creation: 1,440 ms.
- Process high-water RSS: 1,343,044 KiB (~1.28 GiB).
- Inputs: `input_ids`, `attention_mask`, `position_ids`, and 28 `past_key_values.{layer}.{key,value}` cache pairs.
- Outputs: `logits` and 28 `present.{layer}.{key,value}` cache pairs.
- No tensor inference, tokenizer integration, token generation, classification score, latency distribution, battery, or thermal result was measured.

The graph-load probe confirms that ORT 1.29.0 can open this pinned ONNX file on the emulator. Completing an ONNX quality benchmark still requires a compatible Qwen tokenizer and an autoregressive key/value-cache generation loop; graph loading alone is not an inference benchmark.

## Reproduction

Build the isolated app with:

```sh
./gradlew -p ../model-benchmark :app:assembleDebug :app:assembleDebugAndroidTest
```

Copy `model_q4f16.onnx` into the benchmark app's external files directory, then run:

```sh
adb shell am instrument -w -e class com.notifyiq.modelbenchmark.OnnxModelLoadTest com.notifyiq.modelbenchmark.test/androidx.test.runner.AndroidJUnitRunner
```

