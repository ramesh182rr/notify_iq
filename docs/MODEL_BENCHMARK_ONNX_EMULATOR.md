# ONNX Runtime emulator trial

**Dates:** 2026-11-21 (graph-load probe), 2026-11-22 (tokenizer, generation and corpus trial)  
**Result:** All 108 synthetic cases completed on the emulator. Strict JSON validity was 15/108, category accuracy 0.065 and macro-F1 0.097, far below the deterministic baseline (0.954 / 0.955). **Rejected** for classification under the D-012 gate. This is an emulator-only trial, not device-support evidence.

## Environment and artifact

- AVD: Pixel_8 / `sdk_gphone64_arm64`, Android 15 / API 35, 6 GiB guest-memory override, 4 vCPUs reported; host: 16 GiB RAM.
- Runtime: `com.microsoft.onnxruntime:onnxruntime-android:1.29.0`, CPU execution provider, default session options and thread count, in the isolated benchmark app (`mobile/model-benchmark/`). The earlier `1.29.1` pin was not published; Maven Central lists `1.29.0`.
- Model: `onnx/model_q4f16.onnx`, ONNX Community revision `558750086ed49d78cb701ed6fa85af33fd16453f`, 569,789,750 bytes, SHA-256 `9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91`.
- Tokenizer: `tokenizer.json` from the same revision, 9,117,040 bytes, SHA-256 `e7a95fce95bf5b0946d0ddb3f9d7caa030b7e850bbe92b0edb26bcf563e9f3d5`. Chat template from `tokenizer_config.json` (SHA-256 `b0a8115cf05a7002cbe2575058c0139c1dee3f06f221c05717c3444947d78b9f`).
- Model and tokenizer files were copied only to emulator app-specific storage. No weights or tokenizer files are in Git or the production APK.

## Implementation

- **Tokenizer:** `QwenBpeTokenizer` is a dependency-free Kotlin byte-level BPE built for the pinned file: NFC normalization, the Qwen2 split regex with `\s` expanded to Unicode White_Space for Java/ICU parity, the GPT-2 byte map, rank-ordered merges and byte-level decoding. Text encoding never matches added tokens, so notification text cannot inject chat-control tokens. Special tokens are composed explicitly by id.
- **Prompt:** Qwen3 chat template with `enable_thinking=false` (`<think>\n\n</think>\n\n` appended to the assistant turn). System and user strings are byte-identical to the LiteRT trial so the runtimes are compared on the same input. Both trials wrap the notification as a JSON-quoted string. That differs from the `<notification>` wrapper in `MODEL_BENCHMARK_PROMPT.md`; neither trial used that wrapper.
- **Generation:** greedy argmax, 64-token cap, stops on `<|im_end|>` or `<|endoftext|>`. Full-prompt prefill, then one token per step with float16 past/present key/value tensors fed back (28 layers × 8 KV heads × 128). Empty initial cache tensors have shape `[1, 8, 0, 128]`.
- **Logits read:** ORT 1.29.0's public `getFloatBuffer()` copies the whole `[1, n, 151936]` float tensor to the Java heap (about 130 MB for a 220-token prefill). The benchmark reads only the last row through the tensor's private zero-copy native view via reflection, and falls back to the public copy if that view is unavailable. This shortcut is for the benchmark only and is not production-grade.

## Validation against a host reference

`mobile/model-benchmark/tools/qwen_onnx_host_reference.py` renders the pinned Jinja chat template, tokenizes with Hugging Face `tokenizers`, and runs the same greedy loop with ONNX Runtime 1.29.0 (Python, macOS arm64 CPU). Its prompt ids and generated ids are checked in as test assets under `app/src/androidTest/assets/qwen3-reference/`.

- `QwenTokenizerParityTest`: **108/108 prompts token-identical** to Hugging Face, and **108/108 host outputs decode identically**. Tokenizer load took 1,068 ms; encoding all 108 prompts took 60 ms. Prompts are 211–240 tokens.
- Generated tokens: **84/108 emulator outputs are token-identical** to the host run. The 24 divergences are consistent with float16 kernel differences between host and emulator CPUs. 10 of them flip from a fenced to a bare JSON answer, and 8 parse to the same labels. The fence decision sits near a greedy tie for this model. Aggregate scores agree closely (see the diagnostic row).

## Results (strict scoring, emulator)

| Metric | ONNX Q4F16 (emulator) | Host reference | Deterministic baseline |
|---|---:|---:|---:|
| Session create (cold, this run) | 8,212 ms | — | — |
| Valid strict JSON | 15/108 | 6/108 | n/a |
| Category accuracy | 0.065 | 0.028 | 0.954 |
| Category macro-F1 | 0.097 | 0.048 | 0.955 |
| Priority accuracy | 0.111 | 0.037 | 1.000 |
| Urgent false positives / false negatives | 0 / 1 | 0 / 1 | 0 / 0 |
| Category accuracy en / hi / mix | 0.139 / 0.000 / 0.056 | 0.056 / 0.000 / 0.028 | — |
| End-to-end latency p50 / p95 | 3,746 / 4,086 ms | p50 2,420 ms | — |
| Prefill p50 / p95 | 2,867 / 3,148 ms | — | — |
| Decode throughput p50 | 22.5 tokens/s | — | — |
| Process high-water RSS | 1,512,908 KiB (~1.44 GiB) | — | — |
| Battery / thermal | Not measured | — | — |

Most failures are Markdown-fenced JSON (```` ```json … ``` ````), counted as parse failures without repair as the prompt contract requires. Two host outputs (`E099`, `E107`) used `"category":"urgent"`, which is an invalid enum value.

The 8.2 s session-creation time is much higher than the 1.44 s in the 2026-11-21 graph-load probe. It was measured once, immediately after APK reinstall, and likely includes cold page-cache reads of the 570 MB file. Treat it as a single cold sample, not a load-time estimate.

**Diagnostic only (not a gate metric):** if the code fence is stripped before parsing, 105/108 outputs are valid. Category accuracy is then 0.315 and macro-F1 0.216 (host: 0.306 / 0.208), with priority accuracy 0.667 and 3 urgent false positives (host: 5). The model assigns `personal` to most cases (61/108 on the host). The fences are not the only problem: the underlying labels are also far below the deterministic baseline.

## Gate evaluation (D-012)

| Gate | Requirement | Emulator result | Outcome |
|---|---|---|---|
| Structured output validity | ≥ 99% | 13.9% | Fail |
| Macro-F1 improvement | ≥ +5 pp over 0.955 | 0.097 | Fail |
| p95 latency after load | < 2 s | 4.1 s (emulator) | Fail (emulator) |
| Peak memory for inference | < 600 MiB on 4 GB device | ~1.44 GiB process HWM (6 GiB AVD) | Fail (emulator) |
| No safety/priority regression | none | priority accuracy 0.111 vs 1.000 | Fail |

**Decision:** reject this ONNX model/runtime/prompt configuration for classification. Production remains deterministic and carries no model runtime or weights. Latency and memory are emulator measurements and say nothing about phones, but the quality failure alone is decisive and does not depend on the device.

## Reproduction

1. Host reference (optional; outputs are already checked in):

   ```sh
   uv run --no-project --with onnxruntime==1.29.0 --with tokenizers --with jinja2 --with numpy \
     python -I mobile/model-benchmark/tools/qwen_onnx_host_reference.py <hf_dir> <model_q4f16.onnx> \
     mobile/android/app/src/test/resources/notifyiq/notification-evaluation.tsv <out_dir>
   ```

   `<hf_dir>` holds `tokenizer.json` and `tokenizer_config.json` from the pinned revision.
2. From `mobile/android/`: `./gradlew -p ../model-benchmark :app:installDebug :app:installDebugAndroidTest`.
3. Copy `model_q4f16.onnx`, `tokenizer.json` and `notification-evaluation.tsv` to `/sdcard/Android/data/com.notifyiq.modelbenchmark/files/`.
4. Run `adb shell am instrument -w -e class com.notifyiq.modelbenchmark.QwenTokenizerParityTest com.notifyiq.modelbenchmark.test/androidx.test.runner.AndroidJUnitRunner`, then the same with `OnnxCorpusBenchmarkTest`. Metrics print to logcat (`System.out`). Per-case raw outputs are written to `onnx-outputs.tsv` in the same directory.
