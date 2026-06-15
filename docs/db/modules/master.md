# Master Module — Database Reference

Backend module: `server/master/`

## Tables

**This module owns no database tables.**

There is no `master.js` schema-initialization file. The module's only logic
(`masterService.getMenu`) computes the "Masters" navigation menu entirely in
memory from hardcoded label arrays, gated by Tally feature flags. It performs
**no SQL** of its own.

## Relationships

None owned by this module.

The service reads three feature flags — `enable_cost_centres`,
`enable_payment_request_qr`, and `maintain_inventory` — by calling
`tallyFeaturesService.get(company_id)`. Those columns live in the
**`tallyFeatures`** module's table(s), which carry the actual relationship to
the `company` table (via `company_id`). See the `tallyFeatures` module
documentation for those definitions.

## Notes

- Because there are no tables, there are no SQLite-to-Postgres type mappings,
  UNIQUE constraints, indexes, or foreign keys to translate for this module.
- The accompanying DDL file (`docs/db/modules/master.sql`) is intentionally a
  comment-only placeholder so the per-module file set stays complete and merges
  cleanly with the rest of the schema.
