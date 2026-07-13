// Central, generic gate for ALL Company Features (F11). Any UI — menus, reports,
// master fields, voucher columns — that belongs to a feature should render only
// when its flag is on. Keeping one helper here means gating a feature is a
// one-line lookup instead of a scattered `features?.foo !== 0` check.
//
// Semantics (matching the existing tax gates): while `features` hasn't loaded
// yet (null/undefined) we treat the feature as ENABLED so already-visible UI
// doesn't flash away mid-load; once loaded, a stored value of 0 hides it. This
// is non-destructive — turning a feature off only hides its UI, the underlying
// data stays intact and reappears when turned back on.
//
// Dependency tiers (parent → child) are declared in FEATURE_DEPENDENCIES and are
// enforced both in the F11 popup (auto-off + disable child toggles) and here via
// isFeatureEnabled, so a child can never read as enabled while its parent is off.

import type { TallyFeaturesType } from '@/types/entities/TallyFeatures';

/** Every toggleable F11 flag (excludes ids/timestamps). */
export type FeatureFlag = Exclude<
  keyof TallyFeaturesType,
  'tally_feature_id' | 'company_id' | 'created_at' | 'updated_at'
>;

/**
 * Parent flag each feature depends on. A child feature is only ever considered
 * enabled when every ancestor up the chain is also enabled.
 */
export const FEATURE_DEPENDENCIES: Partial<Record<FeatureFlag, FeatureFlag>> = {
  maintain_expiry_date_for_batches: 'enable_batches',
  set_alter_company_gst_details: 'enable_gst',
  enable_payroll_statutory: 'maintain_payroll',
  // Inventory sub-features require inventory to be maintained at all.
  integrate_accounts_with_inventory: 'maintain_inventory',
  enable_multiple_price_levels: 'maintain_inventory',
  enable_batches: 'maintain_inventory',
  enable_job_order_processing: 'maintain_inventory',
  enable_cost_tracking: 'maintain_inventory',
  enable_job_costing: 'maintain_inventory',
  use_discount_column_in_invoices: 'maintain_inventory',
  use_separate_actual_billed_qty: 'maintain_inventory',
};

/** True when `key` is turned on (or features haven't loaded yet). Ignores deps. */
function isFlagOn(features: TallyFeaturesType | null | undefined, key: FeatureFlag): boolean {
  return features?.[key] !== 0;
}

/**
 * True when a feature is effectively enabled: its own flag is on AND every
 * ancestor in FEATURE_DEPENDENCIES is on. Use this everywhere UI is gated.
 */
export function isFeatureEnabled(
  features: TallyFeaturesType | null | undefined,
  key: FeatureFlag,
): boolean {
  let cur: FeatureFlag | undefined = key;
  const seen = new Set<FeatureFlag>();
  while (cur && !seen.has(cur)) {
    if (!isFlagOn(features, cur)) return false;
    seen.add(cur);
    cur = FEATURE_DEPENDENCIES[cur];
  }
  return true;
}
