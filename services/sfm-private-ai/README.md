# SFM Private AI

This directory runs a user-controlled language-model service for THE SFM. It does not call OpenAI or Anthropic. The app speaks a standard chat-completions HTTP protocol to a model server you control; vLLM is used here because it can serve many open-weight models efficiently on NVIDIA GPUs.

## 1. GPU host

Install Docker, the NVIDIA container runtime and Caddy (or another HTTPS reverse proxy) on a GPU server you control. Copy `.env.example` to `.env`, choose a model that fits the available VRAM and its license, and replace `SFM_AI_API_KEY` with a long random secret. Pin `SFM_VLLM_IMAGE` to a tested version or digest before production.

Run:

```bash
docker compose up -d
```

The model is deliberately published only on `127.0.0.1:8000`. Put HTTPS in front of it with the supplied `Caddyfile.example`; do not expose the raw vLLM port to the internet.

## 2. THE SFM server variables

Configure these server-only variables in Vercel for Preview/Production as appropriate:

```text
SFM_AI_BASE_URL=https://ai.your-domain.example/v1
SFM_AI_MODEL=sfm-primary
SFM_AI_API_KEY=<same private API key used by vLLM>
SFM_AI_TIMEOUT_MS=22000
```

For independent failover, run a second model node (ideally a different host or region) and add:

```text
SFM_AI_FALLBACK_BASE_URL=https://ai-backup.your-domain.example/v1
SFM_AI_FALLBACK_MODEL=sfm-backup
SFM_AI_FALLBACK_API_KEY=<backup node key>
```

The application ignores `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY` and `AI_GATEWAY_TOKEN` for the shared intelligence/advisor transport. A production endpoint must be HTTPS and authenticated.

## 3. Automatic behavior

`src/lib/server/aiProvider.ts` sends each request to the primary SFM node. A timeout, rejected credential, HTTP failure or empty answer aborts that transport and moves to the fallback node when configured. Provider errors are logged without response bodies or API keys. Finance grounding, user authentication, rate limits and AI allowance remain enforced by their existing routes.

`GET /api/ai/private-health` is an authenticated, no-store status check. It verifies the configured model nodes through their `/v1/models` endpoint without generating a chat answer or exposing credentials.

## Model choice

`Qwen/Qwen3-32B` in `.env.example` is only an example. The model is configurable so THE SFM is not coupled to one vendor or model family. Before production, test Arabic/English/French quality, finance instruction following, context length, latency, GPU memory, licensing and quantization on the exact hardware you plan to use.
