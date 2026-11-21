# Qwen Runtime and Quantisation Benchmark Plan

## Goal
Choose the smallest reliable local runtime/artifact combination for Qwen3-0.6B on supported Android hardware.

## Candidate matrix
| Candidate | Format/runtime | Why test | Main risk |
|---|---|---|---|
| A | ONNX Runtime Android + Qwen3-0.6B ONNX | Public Android example exists | App integration and model memory |
| B | LiteRT-LM + Qwen3-0.6B LiteRT artifact | Android-focused runtime/artifacts | Runtime/artifact compatibility and RAM |
| C | llama.cpp + Qwen3-0.6B GGUF Q4 | Broad GGUF ecosystem | Native build/ABI and app integration effort |

## Benchmark steps
1. Freeze exact model revision and artifact checksum.
2. Run vendor sample unmodified on physical device.
3. Record load time, memory, speed, battery and temperature.
4. Run 100–300 synthetic notification classification fixtures.
5. Measure schema validity and category/priority accuracy.
6. Repeat after 10 consecutive inferences to detect thermal degradation.
7. Test offline and after app process recreation.
8. Compare APK/AAB size when weights are bundled vs downloaded on demand.
9. Document minimum RAM and supported chipsets based on evidence.
10. Select one runtime for MVP; keep adapter boundary so it can be swapped.

## Initial recommendation
Start with the ONNX Runtime Android example as the reference spike because a Qwen3-0.6B Android sample is available. Benchmark LiteRT-LM as a second candidate. Do not assume the model can run on all Android devices or that a 0.6B model is automatically lightweight in practice.

## Model distribution
Do not ship model weights in the Git repository. Store a manifest containing model id, exact revision, quantisation, runtime compatibility, file size, SHA-256, licence URL and download URL. If hosted in R2, use a public read-only model asset only if licence permits, or short-lived signed URLs. Verify hashes after download and offer Wi-Fi-only download.
