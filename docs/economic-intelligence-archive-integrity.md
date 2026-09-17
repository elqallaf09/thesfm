# Economic archive failure integrity

## Confirmed defects and repair

The released daily-brief API converted failed confirmation reads into an empty list and failed historical reads into successful empty history with `changed: false`. Separately, the archive page converted failed HTTP/JSON requests into the same message as a genuinely empty archive.

The API now uses its existing private 502 `DAILY_BRIEF_UNAVAILABLE` contract when either required read fails. No database diagnostics are returned. This deliberately favors an explicit unavailable brief over conclusions based on missing confirmations or invented empty history; partial-result support would require a separately designed availability contract.

The archive now separates loading, successful data/empty, failed, and signed-out states. It validates the success envelope, provides an AR/EN/FR retry surface, bounds its request to 15 seconds, cancels obsolete requests, and hides records from a previous owner or locale before effects run. Snapshot/drift rendering and its non-causal disclaimer are retained.

## Verification scope

Added 12 executable route tests using controlled dependencies and three explicitly labelled UI source-contract tests. They cover authentication, ownership scoping, throttling, source/confirmation/history failures, a genuinely empty result, preserved historical snapshots, and locale normalization. They do not claim hosted storage or browser execution. Published CI and Vercel results must be checked on the exact commit.

This follow-up contains no migration, production row write, secret change, provider call, or test-budget change. PR #150 remains a separate privilege-repair release. Full signed-in production browser acceptance, including a safe confirmation lifecycle, remains outstanding; source inspection is not that acceptance test.
