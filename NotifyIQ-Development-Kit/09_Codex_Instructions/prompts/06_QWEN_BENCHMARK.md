# Prompt 06 — Qwen runtime benchmark spike

Read `QWEN_MODEL_STRATEGY.md`, `RUNTIME_BENCHMARK_PLAN.md` and `STRUCTURED_OUTPUT_CONTRACT.md`. Build a separate benchmark spike, not production integration. Evaluate Qwen3-0.6B with ONNX Runtime Android and LiteRT-LM; consider llama.cpp only if time permits. Use synthetic data. Record exact model revision, artifact hash, quantisation, runtime version, device, cold start, peak memory, tokens/sec, battery/thermal observations, JSON validity and classification metrics. Recommend a runtime only after measured results. Never bundle model weights in Git.
