# Official and primary technical references

Links checked while preparing this kit (16 Nov 2026). Provider limits and SDK support change; re-check before implementation and deployment.

## Android and React Native
- Android `NotificationListenerService`: https://developer.android.com/reference/android/service/notification/NotificationListenerService
- React Native native platform / native modules: https://reactnative.dev/docs/native-platform
- React Native environment setup: https://reactnative.dev/docs/set-up-your-environment
- Android notification access settings: https://developer.android.com/reference/android/provider/Settings#ACTION_NOTIFICATION_LISTENER_SETTINGS

## Qwen and on-device inference
- Official Qwen3-0.6B model: https://huggingface.co/Qwen/Qwen3-0.6B
- Official Qwen3-0.6B GGUF: https://huggingface.co/Qwen/Qwen3-0.6B-GGUF
- Microsoft ONNX Runtime Android Qwen sample: https://github.com/microsoft/onnxruntime-inference-examples/tree/main/mobile/examples/Qwen_QA/Android
- ONNX Runtime Android: https://onnxruntime.ai/docs/get-started/with-java.html
- LiteRT-LM Qwen3-0.6B community artifacts: https://huggingface.co/litert-community/Qwen3-0.6B
- LiteRT-LM: https://ai.google.dev/edge/litert-lm

## Hosting and storage
- Render free services and limitations: https://render.com/docs/free
- Render FastAPI deployment: https://render.com/docs/deploy-fastapi
- Neon plans: https://neon.com/docs/introduction/plans
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 S3 API: https://developers.cloudflare.com/r2/api/s3/api/

## Important notes from current provider documentation
- Render free web services spin down after 15 minutes without inbound traffic; wake-up can take about a minute. The free filesystem is ephemeral. Do not rely on it for durable storage or latency-sensitive AI.
- Neon free plan allowances are usage-limited and can change. The current documentation lists per-project compute/storage/branch/egress limits and scale-to-zero behaviour. Monitor usage.
- Cloudflare R2 currently lists a monthly Standard storage and operations free allowance and no egress fees; check current pricing before launch.
- Android listener callbacks require a properly declared service and the listener should wait for `onListenerConnected()` before operating. Low-RAM devices on Android Q and below and work profiles have documented limitations.
- Qwen3-0.6B is Apache-2.0 in the official model card. Check the exact model revision, tokenizer, quantised artifact and runtime redistribution terms before shipping.
