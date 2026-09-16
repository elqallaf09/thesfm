# Economic Intelligence Domain

This package contains deterministic, reusable economic-intelligence primitives for The SFM.

- `types.ts`: shared contracts
- `digitalTwin.ts`: normalized financial snapshot and scenario projections
- `decisionEngine.ts`: decision-risk and affordability assessment
- `index.ts`: public exports

Keep React, Supabase queries, and model-provider calls outside this domain package so calculations remain portable and testable.
