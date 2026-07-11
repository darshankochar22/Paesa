// import { useState, useEffect, useCallback } from "react";
// import { useNavigate,useLocation } from "react-router-dom";
// import { useCompany } from "@/context/CompanyContext";
// import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
// import type { StockGroupType } from "@/types/api";
// import { calculateStockGroupGstDetails } from "./utils";
// import {setPendingCreatedGroupId,consumePendingCreatedGroupId,setPendingParentGroupId,consumePendingParentGroupId} from "./StockGroupCreateState";

// const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
// const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer";

// function GroupListPanel({
//   groups,
//   selected,
//   onSelect,
//   onClose,
//   onCreate,
// }: {
//   groups: StockGroupType[];
//   selected: string;
//   onSelect: (id: string) => void;
//   onClose: () => void;
//   onCreate: () => void;
// }) {
//   return (
//     <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
//       <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center select-none border-b border-zinc-150">
//         <span>List of Groups</span>
//         <div className="flex items-center gap-2 font-normal">
//           <button
//             onClick={onCreate}
//             className="text-xs text-zinc-500 hover:text-black underline underline-offset-1"
//           >
//             Create
//           </button>
//           <button onClick={onClose} className="text-sm font-bold font-sans hover:text-red-500">&times;</button>
//         </div>
//       </div>
//       <div className="flex-1 overflow-y-auto">
//         <div
//           onClick={() => { onSelect(""); onClose(); }}
//           className={[
//             "text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none italic",
//             selected === "" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-500",
//           ].join(" ")}
//         >
//           Primary
//         </div>
//         {groups
//           .filter((g) => g.name.toLowerCase() !== "primary")
//           .map((g) => (
//             <div
//               key={g.sg_id}
//               onClick={() => { onSelect(String(g.sg_id)); onClose(); }}
//               className={[
//                 "text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none",
//                 selected === String(g.sg_id) ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-800",
//               ].join(" ")}
//             >
//               {g.name}
//             </div>
//           ))}
//         {groups.filter((g) => g.name.toLowerCase() !== "primary").length === 0 && (
//           <div className="text-xs text-zinc-400 px-3 py-2 italic">No groups yet</div>
//         )}
//       </div>
//     </div>
//   );
// }

// interface FormData {
//   name: string;
//   alias: string;
//   parent_group_id: string;
//   should_quantities_be_added: string;
//   // HSN/SAC
//   hsn_sac_details: string;
//   hsn_sac_code: string;
//   hsn_sac_description: string;
//   // GST
//   gst_rate_details: string;
//   taxability_type: string;
//   gst_rate: string;
// }

// const INITIAL: FormData = {
//   name: "",
//   alias: "",
//   parent_group_id: "",
//   should_quantities_be_added: "0", // Tally default: No
//   hsn_sac_details: "as_per_company",
//   hsn_sac_code: "",
//   hsn_sac_description: "",
//   gst_rate_details: "as_per_company",
//   taxability_type: "as_per_company",
//   gst_rate: "0",
// };

// function SectionHeader({ title }: { title: string }) {
//   return (
//     <div className="mt-3 mb-1 text-xs font-semibold text-zinc-600 select-none border-b border-zinc-200 pb-0.5">
//       {title}
//     </div>
//   );
// }

// function SubSectionLabel({ title }: { title: string }) {
//   return (
//     <div className="flex items-center min-h-[26px] pl-2">
//       <span className="text-sm text-zinc-500 italic">{title}</span>
//     </div>
//   );
// }

// export default function StockGroupCreateSecondary() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { selectedCompany } = useCompany();

//   const [form, setForm] = useState<FormData>(
//     INITIAL
//   );
//   const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
// //   const [success, setSuccess] = useState<string | null>(null);
//   const [showPanel, setShowPanel] = useState(false);

//   useEffect(() => {
//   const company_id = selectedCompany?.company_id;
//   if (!company_id) return;
//   window.api.stockGroup.getAll(company_id).then(r => {
//     if (r.success) {
//       setStockGroups(r.stockGroups ?? []);
//       const createdId = consumePendingCreatedGroupId();
//       if (createdId) {
//         setForm(f => ({ ...f, parent_group_id: createdId }));
//       }
//     }
//   });
// }, [selectedCompany, location.key]);
// useEffect(() => {
//   const savedParent = consumePendingParentGroupId();
//   if (savedParent !== null) {
//     setForm(f => ({ ...f, parent_group_id: savedParent }));
//   }
// }, []);
//     const setField = (key: keyof FormData) =>
//   (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
//     setForm((f) => ({ ...f, [key]: e.target.value }));
//   const validate = (): string | null => {
//     if (!form.name.trim()) return "Name is required.";
//     if (!selectedCompany?.company_id) return "No company selected.";
//     return null;
//   };

//   const handleSubmit = useCallback(async () => {
//     const err = validate();
//     if (err) { setError(err); return; }
//     setLoading(true); setError(null);
//     try {
//       const gst = calculateStockGroupGstDetails(form);

//       const result = await window.api.stockGroup.create({
//         company_id:                 selectedCompany!.company_id,
//         name:                       form.name.trim(),
//         alias:                      form.alias.trim() || null,
//         parent_group_id:            form.parent_group_id ? Number(form.parent_group_id) : null,
//         should_quantities_be_added: Number(form.should_quantities_be_added),
//         hsn_sac_code:               gst.hsn_sac_code,
//         hsn_sac_description:        gst.hsn_sac_description,
//         gst_rate:                   gst.gst_rate,
//         cgst_rate:                  gst.cgst_rate,
//         sgst_rate:                  gst.sgst_rate,
//         taxability_type:            gst.taxability_type,
//         statutory_details:          null,
//       });

//     //   if (result.success) {
//     //     // const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
//     //     // if (updated.success) setStockGroups(updated.stockGroups ?? []);
//     //      navigate(-1);
//     //     setSuccess(`Stock Group "${form.name}" created.`);
//     //     setForm(INITIAL);
//     //     setTimeout(() => setSuccess(null), 3000);
//     //   }
//     if (result.success) {
//   const createdId = String(result.stockGroup?.sg_id ?? result.sg_id ?? "");
//   setPendingCreatedGroupId(createdId);
//   setTimeout(() => navigate(-1), 0);
//     } else {
//         setError(result.error || "Failed to create stock group.");
//       }
//     } catch (e) {
//       setError(e instanceof Error ? e.message : "Unexpected error.");
//     } finally {
//       setLoading(false);
//     }
//   }, [form, selectedCompany]);

//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         e.preventDefault();
//         if (showPanel) setShowPanel(false);
//         // else navigate("/master/create");
//         else navigate(-1);
//       }
//       if (e.altKey && e.key.toLowerCase() === "g") { e.preventDefault(); setShowPanel(prev => !prev); }
//       if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
//       if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
//       if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/stock-group"); }
//     };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, [handleSubmit, navigate, showPanel]);

// //   const selectedGroupLabel = form.parent_group_id
// //     ? stockGroups.find(g => String(g.sg_id) === form.parent_group_id)?.name ?? "Primary"
// //     : "Primary";
// const selectedGroup = stockGroups.find(g => String(g.sg_id) === form.parent_group_id);
// const childGroup = stockGroups.find(g => String(g.parent_group_id) === form.parent_group_id);
// const selectedGroupLabel = form.parent_group_id
//   ? childGroup
//     ? `${selectedGroup?.name ?? "Primary"} (${childGroup.name})`
//     : selectedGroup?.name ?? "Primary"
//   : "Primary";

//   const hsnSourceLabel = form.hsn_sac_details === "as_per_company" ? "Not Available" : "Specified Here";
//   const gstSourceLabel = form.gst_rate_details === "as_per_company" ? "Not Available" : "Specified Here";

//   const groupActions = [
//     { key: "Alt+G", label: "Select Group", onClick: () => setShowPanel(prev => !prev) },
//     { key: "Alt+A", label: "Accept",       onClick: handleSubmit },
//     { key: "Alt+C", label: "Alter Group",  onClick: () => navigate("/master/alter/stock-group") },
//     { key: "Esc",   label: "Quit",         onClick: () => navigate("/master/create") },
//   ];

//   return (
//     <div className="flex-1 flex flex-col h-full bg-white select-none">
//       <PageTitleBar title="Stock Group Creation(Secondary)" subtitle={selectedCompany?.name} />

//       {error && (
//         <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
//           <span>• {error}</span>
//           <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
//         </div>
//       )}
//       {/* {success && (
//         <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
//           <span>• {success}</span>
//           <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
//         </div>
//       )} */}

//       <div className="flex-1 flex min-h-0">
//         {/* Form */}
//         <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
//           <div className="p-3 space-y-1 max-w-2xl">

//             <FormRow label="Name" labelWidth="w-56" className="flex items-center min-h-[26px]">
//               <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
//             </FormRow>

//             <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
//               <input className={inputCls} value={form.alias} onChange={setField("alias")} />
//             </FormRow>

//             {/* Under — opens group panel */}
//             <div
//               className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 text-sm"
//               onClick={() => setShowPanel(v => !v)}
//             >
//               <span className="w-56 text-zinc-400 shrink-0 py-1">Under</span>
//               <span className="text-zinc-600 mr-2 shrink-0">:</span>
//               <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">
//                 {selectedGroupLabel}
//               </span>
//             </div>

//             <FormRow label="Should quantities of items be added" labelWidth="w-56" className="flex items-center min-h-[26px]">
//               <select className={selectCls} value={form.should_quantities_be_added} onChange={setField("should_quantities_be_added")}>
//                 <option value="1">Yes</option>
//                 <option value="0">No</option>
//               </select>
//             </FormRow>

//             {/* ── Statutory Details ── */}
//             <SectionHeader title="Statutory Details" />

//             <SubSectionLabel title="HSN/SAC & Related Details" />

//             <FormRow label="HSN/SAC Details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//               <select className={selectCls} value={form.hsn_sac_details} onChange={setField("hsn_sac_details")}>
//                 <option value="as_per_company">As per Company/Stock Group</option>
//                 <option value="specify">Specify Here</option>
//               </select>
//             </FormRow>

//             <FormRow label="Source of details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//               <span className="text-sm text-zinc-400 px-1">{hsnSourceLabel}</span>
//             </FormRow>

//             {form.hsn_sac_details === "specify" && (
//               <>
//                 <FormRow label="HSN/SAC" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//                   <input className={inputCls} value={form.hsn_sac_code} onChange={setField("hsn_sac_code")} />
//                 </FormRow>
//                 <FormRow label="Description" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//                   <input className={inputCls} value={form.hsn_sac_description} onChange={setField("hsn_sac_description")} />
//                 </FormRow>
//               </>
//             )}

//             <SubSectionLabel title="GST Rate & Related Details" />

//             <FormRow label="GST Rate Details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//               <select className={selectCls} value={form.gst_rate_details} onChange={setField("gst_rate_details")}>
//                 <option value="as_per_company">As per Company/Stock Group</option>
//                 <option value="specify">Specify Here</option>
//               </select>
//             </FormRow>

//             <FormRow label="Source of details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//               <span className="text-sm text-zinc-400 px-1">{gstSourceLabel}</span>
//             </FormRow>

//             <FormRow label="Taxability Type" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//               <select className={selectCls} value={form.taxability_type} onChange={setField("taxability_type")}>
//                 <option value="as_per_company">As per Company/Stock Group</option>
//                 <option value="Taxable">Taxable</option>
//                 <option value="Exempt">Exempt</option>
//                 <option value="Nil Rated">Nil Rated</option>
//                 <option value="Non-GST">Non-GST</option>
//               </select>
//             </FormRow>

//             <FormRow label="GST Rate" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
//               <div className="flex items-center gap-1">
//                 <input
//                   className={inputCls}
//                   style={{ width: "60px" }}
//                   type="number"
//                   min="0"
//                   max="100"
//                   step="0.01"
//                   value={form.gst_rate}
//                   onChange={setField("gst_rate")}
//                 />
//                 <span className="text-sm text-zinc-400">%</span>
//               </div>
//             </FormRow>

//           </div>
//           <div className="flex-1" />
//         </div>

//         {/* Group panel */}
//         {showPanel && (
//           <GroupListPanel
//             groups={stockGroups}
//             selected={form.parent_group_id}
//            onSelect={(val) => {
//   setForm((f) => ({ ...f, parent_group_id: val }));
//   setPendingParentGroupId(val || null);
// }}
//             onClose={() => setShowPanel(false)}
//       onCreate={() => {
//   setShowPanel(false);
//   const url = `/master/create/stock-group/secondary?t=${Date.now()}`;
//   console.log("Navigating to:", url);
//   navigate(url);
// }}
//           />
//         )}

//         <RightActionPanel actions={groupActions} />
//       </div>

//       {/* Footer */}
//       <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
//         <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
//           &larr; Back to Masters
//         </button>
//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
//         >
//           {loading ? "Saving..." : "Create"}
//         </button>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, RightActionPanel } from '@/components/ui';
import type { StockGroupType } from '@/types/api';
import { calculateStockGroupGstDetails } from './utils';
import {
  pushDraft,
  popDraft,
  setPendingCreatedGroupId,
  consumePendingCreatedGroupId,
} from './StockGroupCreateState';

const inputCls = 'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer';

// ── GroupListPanel ─────────────────────────────────────────────────────────────

function GroupListPanel({
  groups,
  selected,
  onSelect,
  onClose,
  onCreate,
}: {
  groups: StockGroupType[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase() !== 'primary' && g.name.toLowerCase().includes(search.toLowerCase()),
  );
  const optionsList = [
    { id: '', label: 'Primary' },
    ...filtered.map((g) => ({ id: String(g.sg_id), label: g.name })),
  ];

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const idx = optionsList.findIndex((o) => o.id === selected);
    setFocusedIndex(idx !== -1 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, search]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  return (
    <div
      className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
      data-enter-nav-ignore
    >
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center select-none border-b border-zinc-150">
        <span>List of Groups</span>
        <div className="flex items-center gap-2 font-normal">
          <button
            onClick={onCreate}
            className="text-xs text-zinc-500 hover:text-black underline underline-offset-1"
          >
            Create
          </button>
          <button onClick={onClose} className="text-sm font-bold font-sans hover:text-red-500">
            &times;
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        data-enter-skip
        className="px-3 py-1.5 text-xs outline-none border-b border-zinc-200 placeholder-zinc-400 bg-zinc-50 focus:bg-white transition-colors"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev + 1) % optionsList.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev - 1 + optionsList.length) % optionsList.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const opt = optionsList[focusedIndex];
            if (opt) {
              onSelect(opt.id);
              onClose();
            }
          }
        }}
      />
      <div className="flex-1 overflow-y-auto">
        {optionsList.map((opt, idx) => (
          <div
            key={opt.id || '__primary'}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            onClick={() => {
              onSelect(opt.id);
              onClose();
            }}
            onMouseEnter={() => setFocusedIndex(idx)}
            className={[
              'text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none',
              opt.id === '' ? 'italic' : '',
              idx === focusedIndex
                ? 'bg-zinc-900 text-white'
                : selected === opt.id && opt.id !== ''
                  ? 'bg-zinc-200 text-zinc-900 font-semibold'
                  : opt.id === ''
                    ? 'hover:bg-zinc-50 text-zinc-500'
                    : 'hover:bg-zinc-50 text-zinc-800',
            ].join(' ')}
          >
            {opt.label}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic">No groups yet</div>
        )}
      </div>
    </div>
  );
}

// ── FormData ───────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  alias: string;
  parent_group_id: string;
  should_quantities_be_added: string;
  hsn_sac_details: string;
  hsn_sac_code: string;
  hsn_sac_description: string;
  gst_rate_details: string;
  taxability_type: string;
  gst_rate: string;
}

const INITIAL: FormData = {
  name: '',
  alias: '',
  parent_group_id: '',
  should_quantities_be_added: '0',
  hsn_sac_details: 'as_per_company',
  hsn_sac_code: '',
  hsn_sac_description: '',
  gst_rate_details: 'as_per_company',
  taxability_type: 'as_per_company',
  gst_rate: '0',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-3 mb-1 text-xs font-semibold text-zinc-600 select-none border-b border-zinc-200 pb-0.5">
      {title}
    </div>
  );
}

function SubSectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center min-h-[26px] pl-2">
      <span className="text-sm text-zinc-500 italic">{title}</span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StockGroupCreateSecondary() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { selectedCompany } = useCompany();

  // Holds the createdId from a returning child so handleCreateSubGroup
  // can merge it into the draft synchronously before pushing.
  const pendingParentIdRef = useRef<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const shouldQtyRef = useRef<HTMLSelectElement>(null);

  const [form, setForm] = useState<FormData>(INITIAL);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  // ── On mount / location change ─────────────────────────────────────────────

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;

    const isReturning = navigationType === 'POP';

    if (!isReturning) {
      // Fresh PUSH into this level — always start with a blank form.
      // Critical because React Router reuses this component instance
      // for every level of nesting (same route, different ?t=timestamp),
      // so useState(INITIAL) only ran on the very first mount.
      setForm(INITIAL);
      pendingParentIdRef.current = null;
    }

    window.api.stockGroup.getAll(company_id).then((r) => {
      if (r.success) {
        setStockGroups(r.stockGroups ?? []);

        if (isReturning) {
          // Pop draft and created ID together inside .then() so the groups
          // list is loaded before we apply them — both in one setForm call
          // to avoid a race between two separate setState calls.
          const draft = popDraft();
          const createdId = consumePendingCreatedGroupId();

          // Keep the ref in sync so handleCreateSubGroup can read it
          // synchronously if the user immediately opens the panel again.
          pendingParentIdRef.current = createdId;

          setForm(() => {
            const base = draft ?? INITIAL;
            // createdId (the group just made by the child) always wins
            // as the parent — it overrides whatever was in the draft.
            return createdId ? { ...base, parent_group_id: createdId } : base;
          });
        }
      }
    });
  }, [selectedCompany, location.key]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!selectedCompany?.company_id) return 'No company selected.';
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const gst = calculateStockGroupGstDetails(form);
      const result = await window.api.stockGroup.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || null,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : null,
        should_quantities_be_added: Number(form.should_quantities_be_added),
        hsn_sac_code: gst.hsn_sac_code,
        hsn_sac_description: gst.hsn_sac_description,
        gst_rate: gst.gst_rate,
        cgst_rate: gst.cgst_rate,
        sgst_rate: gst.sgst_rate,
        taxability_type: gst.taxability_type,
        statutory_details: null,
      });

      if (result.success) {
        // Store the new group's ID so the returning page can pick it up.
        const createdId = String(result.stockGroup?.sg_id ?? result.sg_id ?? '');
        setPendingCreatedGroupId(createdId);
        // Go back to whoever opened us — their useEffect will restore
        // their draft and consume this ID.
        navigate(-1);
      } else {
        setError(result.error || 'Failed to create stock group.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany, navigate]);

  // ── Navigate to a deeper secondary page ───────────────────────────────────

  const handleCreateSubGroup = useCallback(() => {
    setShowPanel(false);
    // Merge the pending parent ID from any returning child into the draft
    // before pushing. This is what carries the hierarchy up the chain.
    const settled: FormData = pendingParentIdRef.current
      ? { ...form, parent_group_id: pendingParentIdRef.current }
      : form;
    pushDraft(settled);
    pendingParentIdRef.current = null;
    navigate(`/master/create/stock-group/secondary?t=${Date.now()}`);
  }, [form, navigate]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showPanel) setShowPanel(false);
        else navigate(-1);
      }
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowPanel((prev) => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/stock-group');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate, showPanel]);

  // ── Label: walk up parent chain ────────────────────────────────────────────

  const getGroupLabel = (groupId: string): string => {
    if (!groupId) return 'Primary';
    const parts: string[] = [];
    let currentId: string | null = groupId;
    while (currentId) {
      const current = stockGroups.find((g) => String(g.sg_id) === currentId);
      if (!current) break;
      parts.push(current.name);
      currentId = current.parent_group_id ? String(current.parent_group_id) : null;
    }
    if (parts.length === 0) return 'Primary';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} (${parts.slice(1).join(' > ')})`;
  };

  const selectedGroupLabel = getGroupLabel(form.parent_group_id);
  const hsnSourceLabel =
    form.hsn_sac_details === 'as_per_company' ? 'Not Available' : 'Specified Here';
  const gstSourceLabel =
    form.gst_rate_details === 'as_per_company' ? 'Not Available' : 'Specified Here';

  const groupActions = [
    { key: 'Alt+G', label: 'Select Group', onClick: () => setShowPanel((prev) => !prev) },
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Group', onClick: () => navigate('/master/alter/stock-group') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate(-1) },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Stock Group Creation (Secondary)" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>• {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Name" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={form.name}
                onChange={setField('name')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setShowPanel(true);
                }}
              />
            </FormRow>

            <div
              tabIndex={0}
              data-enter-click
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 focus:bg-zinc-100 outline-none text-sm"
              onClick={() => setShowPanel((v) => !v)}
            >
              <span className="w-56 text-zinc-400 shrink-0 py-1">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">
                {selectedGroupLabel}
              </span>
            </div>

            <FormRow
              label="Should quantities of items be added"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={shouldQtyRef}
                className={selectCls}
                value={form.should_quantities_be_added}
                onChange={setField('should_quantities_be_added')}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FormRow>

            <SectionHeader title="Statutory Details" />
            <SubSectionLabel title="HSN/SAC & Related Details" />

            <FormRow
              label="HSN/SAC Details"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] pl-4"
            >
              <select
                className={selectCls}
                value={form.hsn_sac_details}
                onChange={setField('hsn_sac_details')}
              >
                <option value="as_per_company">As per Company/Stock Group</option>
                <option value="specify">Specify Here</option>
              </select>
            </FormRow>

            <FormRow
              label="Source of details"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] pl-4"
            >
              <span className="text-sm text-zinc-400 px-1">{hsnSourceLabel}</span>
            </FormRow>

            {form.hsn_sac_details === 'specify' && (
              <>
                <FormRow
                  label="HSN/SAC"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px] pl-4"
                >
                  <input
                    className={inputCls}
                    value={form.hsn_sac_code}
                    onChange={setField('hsn_sac_code')}
                  />
                </FormRow>
                <FormRow
                  label="Description"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px] pl-4"
                >
                  <input
                    className={inputCls}
                    value={form.hsn_sac_description}
                    onChange={setField('hsn_sac_description')}
                  />
                </FormRow>
              </>
            )}

            <SubSectionLabel title="GST Rate & Related Details" />

            <FormRow
              label="GST Rate Details"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] pl-4"
            >
              <select
                className={selectCls}
                value={form.gst_rate_details}
                onChange={setField('gst_rate_details')}
              >
                <option value="as_per_company">As per Company/Stock Group</option>
                <option value="specify">Specify Here</option>
              </select>
            </FormRow>

            <FormRow
              label="Source of details"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] pl-4"
            >
              <span className="text-sm text-zinc-400 px-1">{gstSourceLabel}</span>
            </FormRow>

            <FormRow
              label="Taxability Type"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] pl-4"
            >
              <select
                className={selectCls}
                value={form.taxability_type}
                onChange={setField('taxability_type')}
              >
                <option value="as_per_company">As per Company/Stock Group</option>
                <option value="Taxable">Taxable</option>
                <option value="Exempt">Exempt</option>
                <option value="Nil Rated">Nil Rated</option>
                <option value="Non-GST">Non-GST</option>
              </select>
            </FormRow>

            <FormRow
              label="GST Rate"
              labelWidth="w-56"
              className="flex items-center min-h-[26px] pl-4"
            >
              <div className="flex items-center gap-1">
                <input
                  className={inputCls}
                  style={{ width: '60px' }}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.gst_rate}
                  onChange={setField('gst_rate')}
                />
                <span className="text-sm text-zinc-400">%</span>
              </div>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        {showPanel && (
          <GroupListPanel
            groups={stockGroups}
            selected={form.parent_group_id}
            onSelect={(val) => {
              setForm((f) => ({ ...f, parent_group_id: val }));
              setTimeout(() => shouldQtyRef.current?.focus(), 0);
            }}
            onClose={() => {
              setShowPanel(false);
              setTimeout(() => shouldQtyRef.current?.focus(), 0);
            }}
            onCreate={handleCreateSubGroup}
          />
        )}

        <RightActionPanel actions={groupActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
        >
          &larr; Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Saving...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
