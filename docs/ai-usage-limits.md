# AI Usage Limits

THE SFM tracks paid AI usage per Supabase account so OpenAI / AI Gateway calls do not run without a daily cap.

## Tables

- `ai_usage_limits`: optional per-user overrides.
- `ai_usage_events`: server-recorded AI usage events for the current Kuwait day.

If a user has no row in `ai_usage_limits`, the server uses the defaults from `.env`:

- `AI_DAILY_LIMIT_DEFAULT`
- `AI_RECEIPT_SCAN_DAILY_LIMIT`
- `AI_MARKET_INSIGHT_DAILY_LIMIT`
- `AI_MARKET_AGENT_DAILY_LIMIT`
- `AI_PROJECT_ADVISOR_DAILY_LIMIT`
- `AI_PROJECT_EXPENSE_DAILY_LIMIT`
- `AI_PROJECT_PITCH_DECK_DAILY_LIMIT`
- `AI_PROJECT_PITCH_DECK_EXPORT_DAILY_LIMIT`
- `AI_PROJECTS_CHAT_DAILY_LIMIT`
- `AI_DAILY_TIP_DAILY_LIMIT`

## Features

- `all`: total daily AI calls across the account.
- `receipt_scan`: receipt / invoice image analysis.
- `market_ai_insight`: market analysis AI insight.
- `market_agent_explanation`: market agent Arabic explanation.
- `project_ai_advisor`: project AI advisor.
- `project_expense_analysis`: project expense AI analysis.
- `project_pitch_deck`: pitch deck generation / slide improvement.
- `project_pitch_deck_export`: pitch deck export when it needs AI improvement.
- `projects_chat`: project chat assistant.
- `daily_tip`: daily financial tip.

## Set a Limit by Email

Admin-only API:

```bash
curl -X POST https://www.the-sfm.com/api/admin/ai-usage-limits \
  -H "Content-Type: application/json" \
  -H "Cookie: sfm_access_token=YOUR_ADMIN_ACCESS_TOKEN; sfm_admin_session=YOUR_ADMIN_SESSION" \
  -d "{\"email\":\"elqalla4747@gmail.com\",\"feature\":\"all\",\"dailyLimit\":20,\"notes\":\"Beta launch allowance\"}"
```

Set a feature-specific limit:

```bash
curl -X POST https://www.the-sfm.com/api/admin/ai-usage-limits \
  -H "Content-Type: application/json" \
  -H "Cookie: sfm_access_token=YOUR_ADMIN_ACCESS_TOKEN; sfm_admin_session=YOUR_ADMIN_SESSION" \
  -d "{\"email\":\"elqalla4747@gmail.com\",\"feature\":\"receipt_scan\",\"dailyLimit\":5}"
```

Block AI for a user:

```bash
curl -X POST https://www.the-sfm.com/api/admin/ai-usage-limits \
  -H "Content-Type: application/json" \
  -H "Cookie: sfm_access_token=YOUR_ADMIN_ACCESS_TOKEN; sfm_admin_session=YOUR_ADMIN_SESSION" \
  -d "{\"email\":\"elqalla4747@gmail.com\",\"feature\":\"all\",\"dailyLimit\":0,\"isBlocked\":true}"
```

View today's usage:

```bash
curl "https://www.the-sfm.com/api/admin/ai-usage-limits?email=elqalla4747@gmail.com" \
  -H "Cookie: sfm_access_token=YOUR_ADMIN_ACCESS_TOKEN; sfm_admin_session=YOUR_ADMIN_SESSION"
```
