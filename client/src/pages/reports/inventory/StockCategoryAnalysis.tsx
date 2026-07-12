import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';
import MovementAnalysisTable, { type MovRow } from './MovementAnalysisTable';
import ItemVoucherAnalysis, { type VoucherRow } from './ItemVoucherAnalysis';

interface ItemRow {
  item_id: number;
  item_name: string;
  unit_name: string;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
}
interface CategoryRef {
  category_id: number;
  category_name: string;
}

const PRIMARY_ID = -1; // sentinel: "Primary" => all items across categories

type Level =
  | { step: 'select' }
  | { step: 'items'; category: CategoryRef }
  | { step: 'vouchers'; category: CategoryRef; item: ItemRow };

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
    {children}
  </div>
);

export default function StockCategoryAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'select' });

  // ── Selection popup: Primary + all categories ────────────────────────────
  const [catList, setCatList] = React.useState<CategoryRef[]>([]);
  const [catListLoading, setCatListLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setCatListLoading(false);
      return;
    }
    setCatListLoading(true);
    (window as any).api.stockCategory.getAll(companyId).then((res: any) => {
      const list: CategoryRef[] = [...(res.stockCategories ?? [])]
        .map((c: any) => ({ category_id: c.sc_id, category_name: c.name }))
        .sort((a: CategoryRef, b: CategoryRef) => a.category_name.localeCompare(b.category_name));
      setCatList([{ category_id: PRIMARY_ID, category_name: 'Primary' }, ...list]);
      setCatListLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? catList
        : catList.filter((c) => c.category_name.toLowerCase().includes(search.toLowerCase())),
    [catList, search],
  );
  React.useEffect(() => {
    setSelectIdx(0);
  }, [search]);

  // ── Level: items (all, or in selected category) ──────────────────────────
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [itemErr, setItemErr] = React.useState<string | null>(null);
  const [itemIdx, setItemIdx] = React.useState(0);

  const loadItems = React.useCallback(
    (category: CategoryRef) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'items', category });
      setLoadingItems(true);
      setItemErr(null);
      setItemIdx(0);
      const req = (window as any).api.report.stockCategoryAnalysisItems(
        companyId,
        fyId,
        category.category_id === PRIMARY_ID ? null : category.category_id,
      );
      req.then((res: any) => {
        if (res.success) setItems(res.items ?? []);
        else setItemErr(res.error || 'Failed to load items');
        setLoadingItems(false);
      });
    },
    [companyId, fyId],
  );

  // ── Level: item voucher analysis ─────────────────────────────────────────
  const [vouchers, setVouchers] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherErr, setVoucherErr] = React.useState<string | null>(null);
  const [voucherIdx, setVoucherIdx] = React.useState(0);

  const loadVouchers = React.useCallback(
    (category: CategoryRef, item: ItemRow) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'vouchers', category, item });
      setLoadingVouchers(true);
      setVoucherErr(null);
      setVoucherIdx(0);
      (window as any).api.report
        .stockItemVouchers(companyId, fyId, item.item_id, activeFY?.start_date, activeFY?.end_date)
        .then((res: any) => {
          if (res.success) setVouchers(res.rows ?? []);
          else setVoucherErr(res.error || 'Failed to load vouchers');
          setLoadingVouchers(false);
        });
    },
    [companyId, fyId, activeFY],
  );

  const backToSelect = React.useCallback(() => {
    setLevel({ step: 'select' });
    setItems([]);
    setSearch('');
  }, []);

  // Keyboard nav
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === 'select') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectIdx((p) => Math.min(filtered.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const c = filtered[selectIdx];
          if (c) loadItems(c);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          navigate(-1);
        }
      } else if (level.step === 'items') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setItemIdx((p) => Math.min(items.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setItemIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const it = items[itemIdx];
          if (it) loadVouchers(level.category, it);
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          backToSelect();
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setVoucherIdx((p) => Math.min(vouchers.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setVoucherIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const r = vouchers[voucherIdx];
          if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          loadItems(level.category);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [
    level,
    filtered,
    selectIdx,
    items,
    itemIdx,
    vouchers,
    voucherIdx,
    loadItems,
    loadVouchers,
    backToSelect,
    navigate,
  ]);

  // ── Select Stock Category ────────────────────────────────────────────────
  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-sm tracking-wide">Stock Category Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Category"
          fieldLabel="Name of Stock Category"
          listLabel="List of Stock Categories"
          companyName={selectedCompany?.name}
          items={filtered.map((c) => ({ id: c.category_id, name: c.category_name }))}
          index={selectIdx}
          loading={catListLoading}
          search={search}
          onSearchChange={setSearch}
          onIndexChange={setSelectIdx}
          onAccept={(i) => {
            const c = filtered[i];
            if (c) loadItems(c);
          }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate('/master/create/stock-category')}
        />
      </div>
    );
  }

  // ── Items report ─────────────────────────────────────────────────────────
  if (level.step === 'items') {
    const c = level.category;
    const subtitle =
      c.category_id === PRIMARY_ID ? 'Primary — All Items' : `Category: ${c.category_name}`;
    const rows: MovRow[] = items.map((it) => ({
      id: it.item_id,
      name: it.item_name,
      unit: it.unit_name,
      leftQty: it.in_qty,
      leftValue: it.in_value,
      rightQty: it.out_qty,
      rightValue: it.out_value,
    }));
    return (
      <MovementAnalysisTable
        title="Stock Category Movement Analysis"
        companyName={selectedCompany?.name}
        subtitle={subtitle}
        periodLabel={periodLabel}
        leftLabel="Inward"
        rightLabel="Outward"
        rows={rows}
        loading={loadingItems}
        error={itemErr}
        emptyText="No items found."
        selectedIndex={itemIdx}
        onSelectIndex={setItemIdx}
        onActivate={(_r, i) => loadVouchers(c, items[i])}
        footer={
          <FooterBar>
            <button onClick={backToSelect} className="hover:underline hover:text-black">
              Q: Back to Category Selection
            </button>
            <span className="text-black">Enter: Item voucher analysis</span>
          </FooterBar>
        }
      />
    );
  }

  const { category: c, item: it } = level;
  return (
    <ItemVoucherAnalysis
      itemName={it.item_name}
      companyName={selectedCompany?.name}
      periodLabel={periodLabel}
      rows={vouchers}
      loading={loadingVouchers}
      error={voucherErr}
      selectedIndex={voucherIdx}
      onSelectIndex={setVoucherIdx}
      onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      footer={
        <FooterBar>
          <button onClick={() => loadItems(c)} className="hover:underline hover:text-black">
            Q: Back to Items
          </button>
          <span className="text-black">Enter: Open voucher</span>
        </FooterBar>
      }
    />
  );
}
