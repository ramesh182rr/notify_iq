# Local model benchmark candidates

**Status:** Inputs pinned. The tested LiteRT configuration is rejected for classification quality; the ONNX candidate is deferred because only graph loading has been measured. Neither runtime is approved for production.
**Pinned:** 2026-11-21

This record freezes the current candidate artifacts and runtime baselines. Benchmark results must record exact device SKU, Android build, runtime/backend, prompt and decode lengths, thermal state, and repeated-run method. Do not add model weights to Git.

## Shared model provenance

| Item | Pin |
|---|---|
| Base model | [`Qwen/Qwen3-0.6B`](https://huggingface.co/Qwen/Qwen3-0.6B) |
| Base model revision | `c1899de289a04d12100db370d81485cdf75e47ca` |
| License | Apache-2.0; retain upstream notices with any redistributed model or derivative |

## LiteRT-LM Android candidate

| Item | Pin |
|---|---|
| Artifact | [`Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm`](https://huggingface.co/litert-community/Qwen3-0.6B/blob/8d42ab5f1db14cad987fac57aeb17d070f9e180d/Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm) |
| Repository revision | `8d42ab5f1db14cad987fac57aeb17d070f9e180d` |
| SHA-256 | `bf1aba9ce8d963124407353c6aa4cbf72eba78db21ae133de983eac672ce83e0` |
| Size / quantization / context | 343,490,560 bytes; dynamic INT4 block-32 weights, FP32 activations, float KV; 4,096-token default context |
| License | Apache-2.0 (artifact repository metadata; base model Apache-2.0) |
| Runtime | LiteRT-LM 0.19.0 minimum for Android GPU; CPU path requires 0.18.0+ |
| Important constraint | The artifact has external weights. Upstream documents Android GPU crashes on 0.18.0 and 0.18.1. Measure peak memory carefully: upstream reports around 1.9–2.1 GiB peak RSS on example phones for a 1,355-token prompt and 2,048-token cache. LiteRT 0.18.1 and 0.19.0 AARs expose Kotlin 2.4.0 metadata, incompatible with the production app's Kotlin 2.2.0 compiler; benchmark the runtime in the isolated Kotlin 2.4.0 project. |

The runtime version is a pinned minimum for this artifact, not a claim that all devices/backends work. Record the exact Maven/AAR or source build revision used in each run.

## ONNX Runtime Android candidate

Use Microsoft's [Qwen Android sample](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/mobile/examples/Qwen_QA/Android) as the integration reference. It documents local Qwen3-0.6B inference on Android using Kotlin, ONNX Runtime, tokenizer assets and past-KV caching. The benchmark pin below uses the standard ONNX Runtime Android Java API; it does not include the separate ONNX Runtime GenAI library.

| Item | Pin |
|---|---|
| Artifact repository | [`onnx-community/Qwen3-0.6B-ONNX`](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX) |
| Repository revision | `558750086ed49d78cb701ed6fa85af33fd16453f` |
| File | `onnx/model_q4f16.onnx` |
| File SHA-256 | `9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91` |
| File size | 570 MB (upstream display size) |
| License | Apache-2.0, inherited from the pinned Qwen3 base model; preserve upstream notices |
| Runtime | `com.microsoft.onnxruntime:onnxruntime-android:1.29.0` (MIT) |
| Integration reference | Microsoft's Qwen Android sample; freeze the exact sample commit if code is copied into NotifyIQ |

The ONNX Community model card is Transformers.js-oriented. The pinned artifact is used here as a static ONNX model candidate for the sample's standard ONNX Runtime inference path; compatibility, tokenizer parity, output behavior and runtime performance must be verified in the benchmark before adoption. This is not an ONNX Runtime GenAI model bundle.

**Current decision:** The isolated ONNX probe proves graph loading only. ONNX text generation is deferred until a compatible tokenizer and autoregressive cache loop are implemented and evaluated. The official ONNX Runtime GenAI Java documentation says package publication is pending, so it is not currently a drop-in Android dependency. See `MODEL_BENCHMARK_ONNX_EMULATOR.md`.

## Shared model provenance

The Qwen3 base model revision is `c1899de289a04d12100db370d81485cdf75e47ca` in both artifacts' upstream lineage. The LiteRT candidate repository provides its export provenance; the ONNX export revision above pins its complete model directory and tokenizer files. Model/runtime licenses are recorded separately in each candidate table.

## Benchmark contract

- Reuse `mobile/android/app/src/test/resources/notifyiq/notification-evaluation.tsv`; the set is synthetic and currently has 108 cases.
- Run deterministic baseline and candidate models on identical text and prompt templates. Record the template and generation settings with results.
- Report category accuracy and macro-F1, priority accuracy, urgent false positives and false negatives, and results by language.
- Report cold load, peak RSS, prefill/decode speed, battery/thermal behavior, and installed/download size on low-memory, mid-range, and flagship Android hardware where available.
- Keep output parsing strict. Invalid or incomplete JSON is a failed case; don't silently repair it before scoring.
- No production adoption until the measured gate in `DECISIONS_LOG.md` is met across supported devices. Deterministic analysis remains the fallback.

## Source notes

- The LiteRT artifact is a community conversion of the pinned Qwen base model. Upstream's model card documents the conversion, 0.19.0 GPU requirement, external-weight format, and device measurements.
- Runtime performance figures on upstream model cards are references only; they are not NotifyIQ app measurements.
- Recheck upstream license notices and Android runtime packaging before distributing any model or application build.
