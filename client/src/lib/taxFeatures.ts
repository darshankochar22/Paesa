// Central gate for statutory/tax features (F11 → Company Features). A tax's UI,
// menus, reports and voucher fields should only appear when its `enable_*` flag is
// on. Keeping the flag→column mapping here means gating a new tax later (GST, TDS,
// TCS, Excise, Service Tax) is a one-line lookup instead of scattered checks.
//
// Behaviour matches the existing feature gates (e.g. showDiscount): when `features`
// hasn't loaded yet we treat the tax as enabled to avoid hiding it mid-load; once
// loaded, a value of 0 hides it. This is non-destructive — turning a tax off only
// hides it, existing masters/data stay intact and reappear when turned back on.

import type { TallyFeaturesType } from '@/types/entities/TallyFeatures';

export type TaxFeature = 'gst' | 'vat' | 'tds' | 'tcs' | 'excise' | 'serviceTax';

const TAX_FLAG: Record<TaxFeature, keyof TallyFeaturesType> = {
  gst: 'enable_gst',
  vat: 'enable_vat',
  tds: 'enable_tds',
  tcs: 'enable_tcs',
  excise: 'enable_excise',
  serviceTax: 'enable_service_tax',
};

/** True when the given tax feature is enabled (or features haven't loaded yet). */
export function isTaxFeatureEnabled(
  features: TallyFeaturesType | null | undefined,
  tax: TaxFeature,
): boolean {
  return features?.[TAX_FLAG[tax]] !== 0;
}

// Statutory sub-section keys that are feature-gated (their key doubles as the tax
// name). Service Tax and GST are intentionally NOT gated yet.
const GATED_SECTIONS: readonly TaxFeature[] = ['vat', 'tds', 'tcs', 'excise'];

/**
 * Drop statutory sub-section keys (used by the ledger/group/stock-item statutory
 * modals) whose tax feature is turned off in F11. Sections outside GATED_SECTIONS
 * (e.g. serviceTax) keep their existing always-on behaviour.
 */
export function filterStatutorySectionsByFeature<T extends string>(
  sections: T[],
  features: TallyFeaturesType | null | undefined,
): T[] {
  return sections.filter(
    (s) =>
      !GATED_SECTIONS.includes(s as TaxFeature) || isTaxFeatureEnabled(features, s as TaxFeature),
  );
}
