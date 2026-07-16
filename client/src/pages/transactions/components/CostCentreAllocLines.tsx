import { useEffect, useState } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import type { ParticularRow } from '../types';

// Inline cost-centre breakup shown under a ledger row once a cost-centre split
// is entered — mirroring TallyPrime's voucher body, which lists the cost
// CATEGORY as a header line and each cost CENTRE indented beneath it with its
// amount (e.g. "Appliances" → "Factories  90.00 Dr"). Replaces the old terse
// "N cost centres" caption. Strict grayscale; emphasis via weight/indent.

type CC = NonNullable<ParticularRow['costCentres']>[number];

const fmt = (n: number): string =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Names {
  centre: Map<number, { name: string; catId?: number }>;
  category: Map<number, string>;
}

// Cost centre + category names are small, stable masters. Load them once per
// company and share the resolved maps across every voucher row that renders a
// split, instead of refetching per row.
const cache = new Map<number, Promise<Names>>();

function loadNames(companyId: number): Promise<Names> {
  let p = cache.get(companyId);
  if (!p) {
    p = (async () => {
      const [ccRes, catRes] = await Promise.all([
        window.api.costCentre.getAll(companyId),
        window.api.costCategory.getAll(companyId),
      ]);
      const centre = new Map<number, { name: string; catId?: number }>();
      for (const c of ccRes?.costCentres ?? []) {
        if (typeof c.cc_id === 'number')
          centre.set(c.cc_id, { name: c.name, catId: c.cost_category_id });
      }
      const category = new Map<number, string>();
      for (const c of catRes?.costCategories ?? []) {
        if (typeof c.cc_cat_id === 'number') category.set(c.cc_cat_id, c.name);
      }
      return { centre, category };
    })();
    cache.set(companyId, p);
  }
  return p;
}

export default function CostCentreAllocLines({
  costCentres,
  dcType,
}: {
  costCentres?: ParticularRow['costCentres'];
  dcType: 'Dr' | 'Cr';
}) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [names, setNames] = useState<Names | null>(null);
  const count = costCentres?.length ?? 0;

  useEffect(() => {
    if (!companyId || count === 0) return;
    let active = true;
    loadNames(companyId)
      .then((n) => active && setNames(n))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [companyId, count]);

  if (!costCentres?.length) return null;

  const centreName = (id: number) => names?.centre.get(id)?.name ?? `#${id}`;

  // Group the allocations by cost category (explicit cost_category_id on the
  // allocation, else the centre's own category from the master, else Tally's
  // "Primary Cost Category" default), preserving first-seen order.
  const groups: { key: string; label: string; items: CC[] }[] = [];
  const indexByKey = new Map<string, number>();
  for (const cc of costCentres) {
    const catId = cc.cost_category_id ?? names?.centre.get(cc.cost_centre_id)?.catId;
    const label = (catId != null ? names?.category.get(catId) : '') || 'Primary Cost Category';
    const key = String(catId ?? 'primary');
    let gi = indexByKey.get(key);
    if (gi == null) {
      gi = groups.length;
      indexByKey.set(key, gi);
      groups.push({ key, label, items: [] });
    }
    groups[gi].items.push(cc);
  }

  return (
    <div className="pl-2 mt-0.5 space-y-0.5 text-[10px] text-zinc-600 leading-tight select-none">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="text-zinc-500 italic">{g.label}</div>
          {g.items.map((cc, i) => (
            <div key={i} className="pl-3 flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{centreName(cc.cost_centre_id)}</span>
              <span className="font-mono">
                {fmt(cc.amount)} {dcType}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
