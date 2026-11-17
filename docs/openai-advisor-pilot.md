# SFM advisor pilot with OpenAI API credits

The existing private model transport remains the default. This opt-in adds
OpenAI only to `/api/intelligence/chat` and
`/api/economic-intelligence/advisor-chat`. Receipt scanning, translations,
project generation and other private-model surfaces are unchanged.

## Activation

1. Claim the subscription credit benefit in ChatGPT Billing and verify the
   receiving OpenAI organization, current grant, and expiration date in API
   billing. Code configuration does not claim or verify these credits.
2. Create or select an SFM API project in that organization. Use a dedicated
   project key, separate from BeanMora's project, so OpenAI usage can be grouped
   per application. Keep secrets in the server deployment environment.
3. Set `SFM_OPENAI_API_KEY`, `SFM_OPENAI_ORGANIZATION`,
   `SFM_OPENAI_PROJECT` and `SFM_OPENAI_MODEL`. A pre-existing `OPENAI_API_KEY`
   is a server-only fallback when the dedicated key is absent; confirm it
   belongs to the intended organization before reusing it.
4. Set `SFM_OPENAI_PILOT_USER_IDS` to the authenticated Supabase IDs approved
   for the initial trial, then set `SFM_ADVISOR_PROVIDER=openai`. Empty pilot
   lists send no users to OpenAI. Users outside the list continue using the
   private transport. `*` is an explicit later expansion to all authenticated
   users; do not use it as an initial launch default.
5. Verify an actual authenticated Arabic request on the deployed commit,
   ownership of financial grounding, the returned `provider: openai`, and the
   completed usage record. A healthy model list or successful build alone does
   not establish that generation works.

The example model is `gpt-6.1-sol` using low reasoning effort. Other configured
models omit that model-specific reasoning setting and need their own reply,
latency and output-limit verification. The integration uses the Responses API
with `store: false`; it does not enable provider tools, scheduled background
requests, automatic provider retries, or a second provider after an OpenAI
failure. Final output is capped at 2,000 tokens including reasoning (routes
normally request 900–1,200). Combined instructions and conversation input are
capped at 48,000 characters; an oversized request is rejected before inference.
HTTP headers and body consumption share a 22-second deadline.

## Measurement and privacy

The existing per-user daily allowance in `ai_usage_limits` is still enforced.
`consumeAiUsage` creates the existing `ai_usage_events` record before model
access. OpenAI then writes `metadata.openaiUsage` with `outcome: pending` and
requires that durable write to succeed before issuing a provider request.

After the request, the same event records the application, selected/returned
model, organization/project IDs, provider request/response IDs, status,
latency and provider-reported token counts. Input, output, total, cached-input,
cache-write and reasoning tokens are separate fields. Cached and reasoning
counts are subsets, not extra tokens to add to the total.

Missing or invalid usage is `null`, not zero. Failed and incomplete responses
retain any returned usage because unsuccessful output can still incur cost.
If the final database update fails, a bounded after-response retry writes the
same event; a remaining `pending` record represents an observation gap.
Neither prompts, answers nor credentials are added to these metering records.
Existing authentication, owner-scoped grounding and RLS remain in force.

The admin-only existing endpoint
`GET /api/admin/ai-usage-limits?userId=<authenticated-user-id>` now includes
`openaiUsage` for the current Kuwait day. It reports measured, pending and
unmeasured request counts and observed token totals; each token counter also
includes the number of measured requests. It is not an invoice, a remaining
credit balance, or an aggregate across every application in the organization.
`billedUsd` and `remainingCreditUsd` remain null. Use the OpenAI Usage and
Billing dashboards for actual project costs and the credit balance. The
subscription billing cycle is not assumed to equal a calendar month.

Daily request limits are not a dollar spending cap. Keep paid auto-recharge
disabled during a credit-only trial unless separately intended, and reconcile
observed SFM tokens with OpenAI project costs before widening the pilot.

## Rollback

Set `SFM_ADVISOR_PROVIDER=private` and redeploy, or remove the pilot IDs. This
restores the prior private-model selection without deleting usage evidence.
Do not disable the existing authentication or quota checks to address an API
configuration problem.

## Sources

- [API credits for ChatGPT subscribers](https://developers.openai.com/api/docs/guides/chatgpt-api-credits)
- [API authentication and project attribution](https://developers.openai.com/api/reference/overview)
- [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
