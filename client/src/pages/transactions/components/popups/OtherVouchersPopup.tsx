import { useEffect, useMemo, useRef, useState } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import type { VoucherTypeType } from '@/types/api';
import { useCompany } from '@/context/CompanyContext';
import { isVoucherTypeEnabled, type VoucherType } from '@/constants/voucherTypes';

const PRIMARY_VOUCHER_TYPES = [
  { key: 'Contra', label: 'Contra' },
  { key: 'Payment', label: 'Payment' },
  { key: 'Receipt', label: 'Receipt' },
  { key: 'Journal', label: 'Journal' },
  { key: 'Sales', label: 'Sales' },
  { key: 'Purchase', label: 'Purchase' },
];

const OTHER_VOUCHER_TYPES = [
  { key: 'Attendance', label: 'Attendance' },
  { key: 'Credit Note', label: 'Credit Note' },
  { key: 'Debit Note', label: 'Debit Note' },
  { key: 'Delivery Note', label: 'Delivery Note' },
  { key: 'Job Work In Order', label: 'Job Work In Order' },
  { key: 'Job Work Out Order', label: 'Job Work Out Order' },
  { key: 'Material In', label: 'Material In' },
  { key: 'Material Out', label: 'Material Out' },
  { key: 'Manufacturing Journal', label: 'Manufacturing Journal' },
  { key: 'Memorandum', label: 'Memorandum' },
  { key: 'Payroll', label: 'Payroll' },
  { key: 'Physical Stock', label: 'Physical Stock' },
  { key: 'Purchase Order', label: 'Purchase Order' },
  { key: 'Receipt Note', label: 'Receipt Note' },
  { key: 'Rejection In', label: 'Rejection In' },
  { key: 'Rejection Out', label: 'Rejection Out' },
  { key: 'Reversing Journal', label: 'Reversing Journal' },
  { key: 'Sales Order', label: 'Sales Order' },
  { key: 'Stock Journal', label: 'Stock Journal' },
];

const CANONICAL_NAMES = new Set(
  [...PRIMARY_VOUCHER_TYPES, ...OTHER_VOUCHER_TYPES].map((t) => t.key),
);

interface Props {
  voucherType: string;
  onClose: () => void;
  onSelect: (type: string) => void;
  voucherTypeChildren: Record<string, string[]>;
  /**
   * Optional: when provided, user-created voucher types are fetched via
   * window.api.voucherType.getAll and merged into the sections. Canonical
   * (predefined) types keep their fixed ordering.
   */
  companyId?: number;
}

export default function OtherVouchersPopup({
  voucherType,
  onClose,
  onSelect,
  voucherTypeChildren,
  companyId,
}: Props) {
  const { features } = useCompany();
  const [fetchedTypes, setFetchedTypes] = useState<VoucherTypeType[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  // Fetch user-created voucher types (optional — falls back to hardcoded lists).
  useEffect(() => {
    if (companyId == null) return;
    let active = true;
    (async () => {
      try {
        const res = await window.api.voucherType.getAll(companyId);
        if (active && res.success) setFetchedTypes(res.voucherTypes ?? []);
      } catch {
        /* non-fatal — keep canonical lists */
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  // Merge fetched user-created types into the sections. Custom types with a
  // canonical parent nest under it; the rest are appended (alphabetically) to
  // the Other Vouchers section. Canonical ordering is preserved.
  const { otherItems, childrenMap } = useMemo(() => {
    const childrenMap: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(voucherTypeChildren)) childrenMap[k] = [...v];

    const extras: string[] = [];
    for (const vt of fetchedTypes) {
      if (vt.is_active === 0) continue;
      const name = vt.name;
      if (!name || CANONICAL_NAMES.has(name)) continue;
      const parent = vt.parent_name;
      if (parent && CANONICAL_NAMES.has(parent)) {
        const arr = (childrenMap[parent] ??= []);
        if (!arr.includes(name)) arr.push(name);
      } else {
        const alreadyChild = Object.values(childrenMap).some((a) => a.includes(name));
        if (!alreadyChild && !extras.includes(name)) extras.push(name);
      }
    }
    extras.sort((a, b) => a.localeCompare(b));
    // Hide canonical voucher types whose F11 feature is off (custom types have no
    // flag mapping, so they always pass).
    const gatedCanonical = OTHER_VOUCHER_TYPES.filter((t) =>
      isVoucherTypeEnabled(features, t.key as VoucherType),
    );
    return {
      otherItems: [...gatedCanonical, ...extras.map((n) => ({ key: n, label: n }))],
      childrenMap,
    };
  }, [fetchedTypes, voucherTypeChildren, features]);

  // Flat list in render order — drives arrow-key navigation.
  const flatItems = useMemo(() => {
    const out: string[] = [];
    const push = (items: { key: string }[]) =>
      items.forEach((t) => {
        out.push(t.key);
        (childrenMap[t.key] ?? []).forEach((c) => out.push(c));
      });
    push(PRIMARY_VOUCHER_TYPES);
    push(otherItems);
    return out;
  }, [otherItems, childrenMap]);

  // Start the highlight on the currently active voucher type.
  useEffect(() => {
    const idx = flatItems.indexOf(voucherType);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [flatItems, voucherType]);

  const handleSelect = (key: string) => {
    onSelect(key);
    onClose();
  };

  // Tally-style keyboard navigation: Up/Down move the highlight, Enter selects.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flatItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const key = flatItems[activeIndex];
        if (key) handleSelect(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatItems, activeIndex]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const renderTypeItems = (items: { key: string; label: string }[]) => {
    return items.map((t) => {
      const children = childrenMap[t.key];
      const hasChildren = children && children.length > 0;
      const idx = flatItems.indexOf(t.key);
      return (
        <div key={t.key}>
          <button
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            onClick={() => handleSelect(t.key)}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              voucherType === t.key
                ? 'bg-gray-100 font-bold text-black'
                : 'text-black hover:bg-gray-50'
            } ${idx === activeIndex ? 'bg-gray-100 outline outline-1 -outline-offset-1 outline-black' : ''}`}
          >
            {t.label}
          </button>
          {hasChildren &&
            children.map((child) => {
              const childIdx = flatItems.indexOf(child);
              return (
                <button
                  key={child}
                  ref={(el) => {
                    itemRefs.current[childIdx] = el;
                  }}
                  onClick={() => handleSelect(child)}
                  onMouseEnter={() => setActiveIndex(childIdx)}
                  className={`w-full text-left pl-6 pr-3 py-1.5 text-sm transition-colors ${
                    voucherType === child
                      ? 'bg-gray-100 font-bold text-black'
                      : 'text-gray-600 hover:bg-gray-50'
                  } ${childIdx === activeIndex ? 'bg-gray-100 outline outline-1 -outline-offset-1 outline-black' : ''}`}
                >
                  {child}
                </button>
              );
            })}
        </div>
      );
    });
  };

  return (
    <VoucherPopupShell
      title="Other Vouchers"
      size="tally"
      onClose={onClose}
      hint="↑↓ to move · Enter to select · Esc to close"
    >
      <div>
        <div className="px-3 pb-1 text-sm font-bold text-black border-b border-gray-400 select-none">
          Primary Vouchers
        </div>
        <div className="py-1">{renderTypeItems(PRIMARY_VOUCHER_TYPES)}</div>

        <div className="px-3 pb-1 mt-4 text-sm font-bold text-black border-b border-gray-400 select-none">
          Other Vouchers
        </div>
        <div className="py-1">{renderTypeItems(otherItems)}</div>
      </div>
    </VoucherPopupShell>
  );
}
