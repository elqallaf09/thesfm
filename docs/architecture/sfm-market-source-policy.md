# SFM market source policy

THE SFM separates **source authority** from **redistribution permission**.

- `aggregator`: useful transitional evidence, but stored as `internal_only`.
- `primary_exchange`, `regulator`, `issuer`, `licensed_feed`: stronger/direct provenance, but remain `rights_review_required` until legal/contract terms explicitly permit redistribution.
- `derived`: SFM-computed analytics from cited evidence; raw upstream facts retain their original provenance.

No source class is automatically marked `redistributable`. That decision requires an explicit rights record in a future licensing layer.
