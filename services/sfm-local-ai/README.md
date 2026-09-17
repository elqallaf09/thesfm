# SFM Local AI — Windows + NVIDIA

This is the zero-cloud-cost starting path for THE SFM. It runs the language model on the owner's Windows PC and exposes only an authenticated OpenAI-compatible gateway for the application. Ollama itself remains loopback-only and is never exposed directly.

## Recommended baseline for RTX 4070 Ti 12 GB

Start with `qwen3:8b-q4_K_M`. The quantized model is small enough to leave useful VRAM headroom on a 12 GB card while retaining materially better quality than tiny 1–4B models. The local gateway starts with an 8K context window, one request at a time through the application, and caps generated output to keep latency predictable.

The actual model is configurable through `.env.local`; THE SFM only sees the stable served name `sfm-local-primary`. Upgrading the local model later therefore does not require changing application routes.

## 1. Install prerequisites

- Current NVIDIA driver (`nvidia-smi` must work).
- Node.js 20 or newer.
- Ollama for Windows.

After Ollama is installed, open PowerShell in the repository and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\services\sfm-local-ai\start.ps1
```

On first run the script:

1. checks NVIDIA, Node and Ollama;
2. starts Ollama if needed;
3. downloads `qwen3:8b-q4_K_M`;
4. creates `services/sfm-local-ai/.env.local` with a random private gateway key;
5. starts the authenticated gateway at `http://127.0.0.1:8787/v1`.

Keep that terminal open while the PC is acting as the AI node.

## 2. Test locally

In a second PowerShell window:

```powershell
powershell -ExecutionPolicy Bypass -File .\services\sfm-local-ai\test.ps1
```

The test checks `/v1/models` and then asks for a short Arabic response. It never sends the gateway key to a third-party model provider.

## 3. Use with a local THE SFM dev server

Copy the values from `.env.local` into the server-only development environment:

```text
SFM_AI_BASE_URL=http://127.0.0.1:8787/v1
SFM_AI_MODEL=sfm-local-primary
SFM_AI_API_KEY=<SFM_LOCAL_API_KEY from services/sfm-local-ai/.env.local>
SFM_AI_TIMEOUT_MS=22000
```

Do not put the API key in any `NEXT_PUBLIC_*` variable.

## 4. Connect Vercel without paying for a GPU

Vercel cannot call `localhost` on your PC. For Preview testing, expose only port `8787` through an HTTPS tunnel. A quick Cloudflare Tunnel can be used for a temporary test:

```powershell
cloudflared tunnel --url http://127.0.0.1:8787
```

Use the resulting HTTPS hostname as:

```text
SFM_AI_BASE_URL=https://<temporary-hostname>/v1
SFM_AI_MODEL=sfm-local-primary
SFM_AI_API_KEY=<same private local gateway key>
```

The random tunnel URL changes when the tunnel restarts. A stable hostname can be added later without changing the SFM AI protocol. Keep Ollama on `127.0.0.1:11434`; never tunnel or port-forward Ollama directly.

## Security boundary

The gateway:

- binds to loopback by default;
- requires a long bearer key;
- exposes only `GET /v1/models` and `POST /v1/chat/completions`;
- caps request/body/message sizes;
- rejects streaming and unknown model names;
- calls Ollama only on loopback;
- disables Qwen thinking output at the Ollama boundary and returns only final answer content;
- does not log prompts, replies or API keys.

## Capacity expectations

This is an economical owner-operated node, not an unlimited public inference cluster. It is appropriate for development, early users and controlled traffic. If user volume grows, retain this PC as a private/fallback node and add a paid GPU only after subscription revenue justifies it.

Receipt/image understanding stays disabled on this text node until a separate local multimodal model is deliberately tested for VRAM and latency.
