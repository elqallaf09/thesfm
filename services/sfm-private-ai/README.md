# SFM Private AI

This directory runs user-controlled AI services for THE SFM. They do not call OpenAI or Anthropic. THE SFM speaks a standard chat-completions HTTP protocol to model servers you control; vLLM is used here because it can serve many open-weight text and vision-language models efficiently on NVIDIA GPUs.

## 1. GPU host

Install Docker, the NVIDIA container runtime and Caddy (or another HTTPS reverse proxy) on a GPU server you control. Copy `.env.example` to `.env`, choose models that fit the available VRAM and their licenses, and replace the example API keys with long random secrets. Pin `SFM_VLLM_IMAGE` to a tested version or digest before production.

Run the text/reasoning node:

```bash
docker compose up -d sfm-ai
```

Optionally run the dedicated vision node for receipt/document images:

```bash
docker compose --profile vision up -d sfm-vision
```

The raw model ports are deliberately published only on loopback (`127.0.0.1`). Put HTTPS in front of them with the supplied `Caddyfile.example`; do not expose raw vLLM ports to the internet.

## 2. THE SFM server variables

Configure these server-only variables in Vercel for Preview/Production as appropriate:

```text
SFM_AI_BASE_URL=https://ai.your-domain.example/v1
SFM_AI_MODEL=sfm-primary
SFM_AI_API_KEY=<same private API key used by the text node>
SFM_AI_TIMEOUT_MS=22000
```

For independent text-model failover, run a second node (ideally a different host or region) and add:

```text
SFM_AI_FALLBACK_BASE_URL=https://ai-backup.your-domain.example/v1
SFM_AI_FALLBACK_MODEL=sfm-backup
SFM_AI_FALLBACK_API_KEY=<backup node key>
```

For image/receipt understanding, configure a vision-language model. It may share the same HTTPS host/key as the text service while using a different served model, or use the optional `/vision/v1` node from the supplied Caddy example:

```text
SFM_AI_VISION_BASE_URL=https://ai.your-domain.example/vision/v1
SFM_AI_VISION_MODEL=sfm-vision
SFM_AI_VISION_API_KEY=<vision node key>
```

Optional independent vision failover:

```text
SFM_AI_VISION_FALLBACK_BASE_URL=https://ai-backup.your-domain.example/vision/v1
SFM_AI_VISION_FALLBACK_MODEL=sfm-vision-backup
SFM_AI_VISION_FALLBACK_API_KEY=<backup vision key>
```

If `SFM_AI_VISION_BASE_URL` or `SFM_AI_VISION_API_KEY` is omitted, the application can reuse `SFM_AI_BASE_URL` / `SFM_AI_API_KEY`, but `SFM_AI_VISION_MODEL` is still required. This prevents a normal text model from being silently treated as image-capable.

The shared SFM transport ignores `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY` and `AI_GATEWAY_TOKEN`. A production private endpoint must be HTTPS and authenticated.

## 3. Automatic behavior

`src/lib/server/aiProvider.ts` sends text requests to the primary SFM node. A timeout, rejected credential, HTTP failure or empty answer aborts that transport and moves to the fallback node when configured. Vision requests use the same failover contract but a separate vision-model configuration. Provider errors are logged without response bodies, image contents or API keys.

Finance grounding, user authentication, rate limits and AI allowance remain enforced by their existing routes. Market AI Insight and the market-agent explanation are also being routed through this shared private transport so they no longer need an OpenAI key.

`GET /api/ai/private-health` is an authenticated, no-store status check for configured text nodes. It verifies `/v1/models` without generating a chat answer or exposing credentials. Vision transport has unit-level configuration/failover checks; deployment readiness still requires a real vision node before enabling receipt fallback in production.

## Model choice

`Qwen/Qwen3-32B` in `.env.example` is only an example. Text and vision models are configurable so THE SFM is not coupled to one vendor or model family. Before production, test Arabic/English/French quality, finance instruction following, structured JSON reliability, context length, latency, GPU memory, licensing and quantization on the exact hardware you plan to use.

For vision, select a vLLM-compatible multimodal model that can accept `image_url` content in the OpenAI-compatible chat-completions API. Do not assume a text-only checkpoint can read images.
