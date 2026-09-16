# Unified research workspace

The canonical entry is `/ai-analyst/analyze`; selected assets use `/ai-analyst/analyze/[symbol]`.
Asset details, explicit research execution, the canonical analysis ledger, and the rules panel share one selection and one result. The old `/ai-analyst/assets` and `/ai-analyst/agent` bookmarks redirect here, preserving validated asset/horizon/investment context but never forwarding autorun or credentials.

## Request and evidence boundaries

- Entry and section navigation are read-only. Quote retrieval uses `/api/intelligence/asset-details`; saved analyses use `/api/intelligence/latest`.
- A missing saved result is an empty state, not permission to start an analysis. Only an explicit run/retry/refresh action calls the existing analysis engine.
- The investment summary receives the same result as the ledger; it does not poll for a second result in this workspace.
- Unknown prices, missing measurements and unknown quote observation dates remain unavailable. The details endpoint neither calls an LLM nor consumes AI allowance.
- Private investment context never causes a public-asset quote lookup. Unsupported private-asset analysis remains explicitly unavailable.
- Rules and model versions shown are from the actual result, never a hardcoded availability claim. The rules card spans the complete grid.

## SFM Private AI transport

`src/lib/server/aiProvider.ts` is shared by intelligence chat and economic-advisor chat. These paths now use only user-controlled model nodes configured through `SFM_AI_BASE_URL`, `SFM_AI_MODEL` and `SFM_AI_API_KEY`. A second private node can be configured with the corresponding `SFM_AI_FALLBACK_*` variables for automatic failover.

The transport does not read or require `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY` or `AI_GATEWAY_TOKEN`. It sends a standard chat-completions request to a model server controlled by THE SFM, so vLLM, a compatible LocalAI deployment or another user-controlled compatibility layer can be used without coupling application code to a model vendor.

Each request is bounded and cancelled before private-node failover. HTTP failures, rejected credentials, timeouts and empty replies never become fabricated successful responses. Auth, owner-scoped grounding, rate limits and usage accounting remain enforced. A production private endpoint must be HTTPS and authenticated.

`services/sfm-private-ai/` contains the GPU service template. `GET /api/ai/private-health` is an authenticated no-store reachability check that calls the configured model nodes' `/models` endpoint and exposes no credentials.

## Validation

Route/provider/quote tests and guest browser tests accompany these changes. Guest fixtures are browser-only and contain no personal records or live market claims. The focused workflow covers Arabic, English and French on desktop Chromium, mobile Chromium and WebKit; it does not replace full repository CI. The authenticated live-check workflow must eventually verify a real Arabic response for the exact deployed SHA from `sfm-private-primary` or `sfm-private-fallback` before production rollout. Passing code tests alone does not establish that a GPU node has been provisioned or connected.
