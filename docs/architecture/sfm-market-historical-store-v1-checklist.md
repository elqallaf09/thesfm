# SFM historical store v1 rollout checklist

- [x] Append-only observation schema
- [x] Browser-role access revoked
- [x] Service-role update/delete/truncate revoked
- [x] Provenance and quality stored per observation
- [x] Redistribution policy stored per observation
- [x] Deterministic evidence deduplication hash
- [x] Guarded bounded ingestion endpoint
- [x] Hourly Vercel Cron entry
- [x] Yahoo absent from the SFM ingestion route
- [ ] Apply migration to production Supabase after merge
- [ ] Verify first production observations before considering the store operational
