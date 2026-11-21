# Qwen3-0.6B Local-First Model Strategy

## Decision
Qwen3-0.6B is the initial model candidate, not a guaranteed production dependency. The app must remain fully useful when the model is absent, disabled or too slow.

## Best first use cases
- Ambiguous notification category suggestion.
- Short intent extraction (status update, request, payment failure, delivery update, reminder).
- Short digest sentence generation from already-filtered records.
- Natural-language query parsing into a constrained search filter (later).

## Do not use the model for
- OTP detection as the only safeguard.
- Sensitive-data filtering as the only safeguard.
- Authoritative financial interpretation.
- Emergency/critical urgency guarantees.
- Arbitrary action execution.
- Processing every notification on arrival.

## Proposed pipeline
1. Deterministic privacy screen.
2. Deterministic parser and package-specific heuristics.
3. Lightweight classification rules.
4. If confidence is low and device policy permits, enqueue local model inference.
5. Request strict JSON output.
6. Parse and validate schema; reject invalid or unsupported labels.
7. Store model/version/confidence and fallback status.
8. Allow user correction.

## Model source and licence
Use the official Qwen model repository as the canonical source and record exact revision/hash in the model manifest. The official Qwen3-0.6B model card currently lists Apache-2.0; confirm exact artifact, tokenizer, quantisation conversion and redistribution terms before bundling. Prefer downloading from the official model publisher or a well-documented conversion repository.

## Runtime benchmark candidates
- ONNX Runtime Android: Microsoft provides a Qwen Android sample demonstrating Qwen3-0.6B on-device. This is a concrete initial integration candidate.
- LiteRT-LM: investigate available Qwen3-0.6B artifacts and minimum runtime version. Community artifact memory use can be substantial; benchmark before recommending minimum device specs.
- llama.cpp / GGUF: optional third path if a maintained Android integration can be validated and packaging size is acceptable.

## Quantisation candidates
Compare available FP16/BF16 where device memory allows, dynamic INT8, and 4-bit formats (Q4 variants or runtime-supported INT4). Quantisation labels are not interchangeable across runtimes. Record actual artifact file size, peak RSS, context length and output quality.

## Benchmark matrix
Test at least:
- One mid-range Android device with 6 GB RAM if available.
- One lower-memory device (4 GB if available).
- One recent flagship.

Record:
- Cold model load time.
- Peak memory/RSS.
- Prompt prefill latency.
- Decode tokens/second.
- Battery drain for a fixed workload.
- Thermal throttling after repeated runs.
- App size vs model download size.
- JSON schema validity across 100–300 representative synthetic notifications.
- Classification accuracy and false-positive high-priority rate.
- Hindi/English and code-mixed performance if India is a target market.

## Suggested first benchmark prompts
Use synthetic, non-personal fixtures only. Build a gold-labelled dataset covering promotions, personal message previews, transaction alerts, delivery status, travel changes, calendar reminders, system alerts, OTP-like content (which must be filtered before model), ambiguous cases and malicious prompt-injection-like notification text.

## Fallback
If the model cannot load, is unsupported, exceeds memory budget, runs too slowly or returns invalid JSON, use deterministic rules and mark `analysis_method=rules_fallback`.
