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

`src/lib/server/aiProvider.ts` is the shared model transport for THE SFM. It uses only user-controlled model nodes configured through `SFM_AI_BASE_URL`, `SFM_AI_MODEL` and `SFM_AI_API_KEY`. A second private node can be configured with the corresponding `SFM_AI_FALLBACK_*` variables for automatic failover.

The application no longer carries the OpenAI or Anthropic SDK dependencies for these migrated product AI surfaces. Runtime model calls use a standard chat-completions protocol against infrastructure controlled by THE SFM, so vLLM or another compatible self-hosted layer can be used without coupling product code to a model vendor.

Each request is bounded and cancelled before private-node failover. HTTP failures, rejected credentials, timeouts and empty replies never become fabricated successful responses. Auth, owner-scoped grounding, rate limits and usage accounting remain enforced. A production private endpoint must be HTTPS and authenticated.

### Text-model surfaces using SFM Private AI

The shared private text transport now covers:

- intelligence assistant and economic-intelligence advisors;
- market AI insight and the market-agent explanation layer;
- project chat, project AI advisor and project expense analysis;
- pitch-deck generation/improvement and pitch-deck export enhancement;
- daily financial-education tips;
- financial/news translation before optional non-LLM translation fallbacks.

Rule-based market/project calculations remain authoritative where already designed that way. A private model may explain or improve wording but must not invent missing evidence or silently replace deterministic calculations.

## SFM Private Vision

Receipt and invoice image understanding can use a separate self-hosted multimodal model configured through `SFM_AI_VISION_*`. The vision transport has independent primary/fallback configuration and never silently treats a text-only model as image-capable.

Google Document AI remains an independent OCR/document-extraction option where configured; the previous OpenAI Vision fallback has been replaced by SFM Private Vision. Unknown receipt fields remain unavailable rather than guessed. PDF handling stays on document extraction unless a verified private multimodal PDF path is added later.

`services/sfm-private-ai/` contains text and optional vision GPU service templates using vLLM. `GET /api/ai/private-health` is an authenticated no-store reachability check for configured private text nodes and exposes no model-node credentials.

## Server configuration

The application-side private variables are documented in `.env.example` and the GPU-host variables in `services/sfm-private-ai/.env.example`. Production should configure long random API keys and HTTPS endpoints. The application supports independent text and vision fallback nodes so a single GPU or host failure does not have to take down all AI features.

## Validation and release boundary

The migration has dedicated provider, health, receipt, quote, navigation and browser regressions. Guarded migration jobs also require TypeScript, lint, translations, production build and focused project/private-AI tests before committing transformed files.

A code/build pass does **not** establish that a private model is live. Before production rollout, the exact deployed SHA must receive a real authenticated Arabic reply from `sfm-private-primary` or `sfm-private-fallback`, and the private health check must report a reachable configured node. Receipt vision should likewise remain disabled until a real private vision model is provisioned and verified.

Do not merge this migration to production while the private GPU node and `SFM_AI_*` deployment variables are absent or the exact-SHA live private-provider verification is failing.
