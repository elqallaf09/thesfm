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

## Model transport

`src/lib/server/aiProvider.ts` is shared by intelligence chat and economic-advisor chat. Existing `OPENAI_API_KEY` configuration is tried first. Optional Vercel Gateway configuration is an alternate transport, using an OpenAI model by default. These routes no longer read or require `ANTHROPIC_API_KEY`; they do not change or delete stored secrets. An old Anthropic Gateway model setting is ignored in favor of the OpenAI default.

A Gateway route to the same upstream vendor is not independent model-provider redundancy. No claim of live Gateway availability is made by configuration alone. Each request is bounded and cancelled before fallback; failures return truthful service errors rather than manufactured replies. Auth, owner-scoped grounding, rate limits and usage accounting remain enforced. Other unrelated application modules are outside this migration.

## Validation

Route/provider/quote tests and guest browser tests accompany these changes. Guest fixtures are browser-only and contain no personal records or live market claims. The focused workflow covers Arabic, English and French on desktop Chromium, mobile Chromium and WebKit; it does not replace full repository CI. The existing authenticated live-check workflow verifies a real Arabic response for the exact deployed SHA without publishing its transcript or account secrets. Passing code tests does not establish production or Gateway availability; check the specific workflow and deployment results before release.
