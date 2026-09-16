# SFM Private AI

This directory runs user-controlled AI services for THE SFM. They do not call OpenAI or Anthropic. THE SFM speaks a standard chat-completions HTTP protocol to model servers you control; vLLM is used here because it can serve open-weight text and vision-language models efficiently on NVIDIA GPUs.

## Production baseline

The default text baseline is `Qwen/Qwen3-32B-AWQ`, served as `sfm-primary`. The checkpoint is a 4-bit AWQ version of Qwen3-32B and supports vLLM's OpenAI-compatible serving flow. For a single-node production starting point, use a 48 GB-class NVIDIA GPU and begin with a 16K context window. Treat that as a deployment baseline, not a guaranteed capacity figure: concurrency, KV-cache size, driver/runtime versions and the exact GPU all affect headroom.

If the host has only 24 GB of VRAM, select a smaller quantized model instead of forcing the 32B baseline into marginal memory. If you use multiple GPUs, `SFM_GPU_COUNT` is used both for Docker GPU reservation and vLLM tensor parallelism; validate identical visibility/order on the host before starting the service.

The example pins vLLM to `v0.29.0` instead of using the mutable `latest` tag. Before a production rollout, validate the selected tag on the exact host and pin an image digest if your deployment process supports it. Upgrade deliberately after regression and security testing.

Qwen3 reasoning is configured with the `qwen3` reasoning parser. The application also removes any leading `<think>` / `<analysis>` blocks that a misconfigured compatible server might place in `message.content`, and rejects an unclosed reasoning block so the fallback node can be tried. If you change model families, set `SFM_REASONING_PARSER` to the parser required by that model and re-run the response tests.

## 1. GPU host

Install Docker, the NVIDIA container runtime and Caddy (or another HTTPS reverse proxy) on a GPU server you control. Copy `.env.example` to `.env`, replace the example API keys with long random secrets and adjust the model only if the available VRAM or license requires it.

Preflight the host before pulling multi-gigabyte model weights:

```bash
nvidia-smi
docker version
docker compose config
```

Run the text/reasoning node:

```bash
docker compose up -d sfm-ai
docker compose logs -f sfm-ai
```

Verify the loopback OpenAI-compatible model endpoint before exposing HTTPS:

```bash
curl -fsS http://127.0.0.1:8000/v1/models \
  -H "Authorization: Bearer $SFM_AI_API_KEY"
```

Optionally run the dedicated vision node for receipt/document images:

```bash
docker compose --profile vision up -d sfm-vision
```

Do not assume text and vision models fit safely on the same single GPU. On a one-GPU host, keep the vision profile disabled unless measured VRAM headroom proves both services can coexist; a separate GPU/node is the safer production design.

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

`src/lib/server/aiProvider.ts` sends text requests to the primary SFM node. A timeout, rejected credential, HTTP failure, empty answer or unsafe reasoning-only answer aborts that transport and moves to the fallback node when configured. Vision requests use the same failover contract but a separate vision-model configuration. Provider errors are logged without response bodies, image contents or API keys.

Finance grounding, user authentication, rate limits and AI allowance remain enforced by their existing routes. Market AI Insight and the market-agent explanation are routed through this shared private transport so they no longer require a third-party model key.

`GET /api/ai/private-health` is an authenticated, no-store status check for configured text nodes. It verifies `/v1/models` without generating a chat answer or exposing credentials. Vision transport has unit-level configuration/failover checks; deployment readiness still requires a real vision node before enabling receipt fallback in production.

## 4. Release gate

Do not merge the private-AI migration into production merely because the web build is green. Release only after all of the following are true for the exact commit being deployed:

1. The GPU text node is provisioned and the chosen weights start without OOM/restart loops.
2. HTTPS and the private API key are active; raw vLLM ports remain loopback-only.
3. Vercel `SFM_AI_*` variables point to that node and `/api/ai/private-health` reports it reachable.
4. An authenticated Arabic request receives a real answer from `sfm-private-primary` (or the explicitly configured private fallback), with no `<think>` / `<analysis>` leakage.
5. CI, production build and browser smoke tests are green for the same SHA.
6. Receipt/document vision stays disabled until a real private multimodal node passes its own live test.

## Model choice

The model is configurable so THE SFM is not permanently coupled to one model family. Before changing the baseline, compare Arabic/English/French quality, finance instruction following, structured JSON reliability, context length, latency, GPU memory, licensing and quantization on the exact hardware you plan to use.

For vision, select a vLLM-compatible multimodal model that accepts `image_url` content in the OpenAI-compatible chat-completions API. Do not assume a text-only checkpoint can read images.
