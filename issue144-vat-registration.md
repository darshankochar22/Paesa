# Issue #144 — Statutory Details → VAT Registration Details

> Source: GitHub issue `darshankochar22/MVP#144`. 6 body images (TallyPrime flow) +
> 2 comment images (cmt_01 = TallyPrime "VAT Details", cmt_02 = our clone "VAT
> REGISTRATION DETAILS"). Entry: Gateway → Masters → Statutory Details →
> VAT Registration Details (a per-company singleton).

## TallyPrime flow (body images)
- **VAT Details** popup: State (List of States — Not Applicable + all Indian states/UTs),
  TIN, Interstate sales tax number, **Set/alter tax/rate details** (Yes/No),
  **Define VAT commodity and tax details as masters** (Yes/No), Deactivate from.
- **Set/alter tax/rate details = Yes** → opens **Tax/rate details** sub-screen:
  **VAT Rate** → Tax rate (%) · Tax Type.
- **Tax Type** picks from **List of Taxability: Unknown · Exempt · Tax Free** (body_05).

## Differences found (clone vs TallyPrime) and fixes
The clone already had the form, the tax-rate/type reveal, the commodity table and
Deactivate-from. The mismatches were:

1. **Tax Type options were wrong.** Clone listed `Unknown · Taxable · Exempt · Nil Rated`;
   TallyPrime's List of Taxability is `Unknown · Exempt · Tax Free` (body_05).
   → `VAT_TAX_TYPES` corrected to `["Unknown", "Exempt", "Tax Free"]`
   (`client/src/types/entities/VATRegistrationDetails.ts`). Drives both the
   Set/alter tax/rate Tax-Type field and the VAT Commodity Details "Tax type" column.

2. **Label wording.** Clone read "Set/alter tax rate details"; TallyPrime is
   "Set/alter tax/rate details" (with slash). → label corrected.

3. **Missing "VAT Rate" group heading.** TallyPrime's Tax/rate details sub-screen
   groups Tax rate + Tax Type under a **VAT Rate** heading (body_04). → added above
   the revealed fields (`VATRegistrationDetailsForm.tsx`).

Server stores `tax_type` as free text (no enum/validation), so the change is
frontend-only and safe.

## Notes
- Tax/rate details are shown inline (revealed under the toggle) rather than as a
  separate modal — consistent with the other statutory-detail forms in this app;
  field set + options now match TallyPrime.
