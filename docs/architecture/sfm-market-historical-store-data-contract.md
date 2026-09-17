# Stored SFM observation contract

Stored raw observations carry symbol/asset metadata, session fields (price/change/OHLC/previous close/volume), SFM quality state, upstream provider provenance, observed/received timestamps and licensing posture. Null is preserved when a field was not supplied by evidence.

Derived analytics are intentionally not written into this raw table. They will use a separate derived-snapshot store so calculations can be recomputed without mutating historical facts.
