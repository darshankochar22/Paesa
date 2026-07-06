import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

// Backing shape mirrors the voucher_gst_eway_details table (snake_case) so it
// round-trips through create/read/update untouched.
export interface GstEwayBillDetails {
  reason_for_issuing_note?: string;
  buyers_note_no?: string;
  buyers_note_date?: string;
  eway_bill_no?: string;
  eway_bill_date?: string;
  dispatch_from?: string;
  ship_to?: string;
  transporter_name?: string;
  transporter_id?: string;
  mode?: string;
  doc_lading_no?: string;
  doc_lading_date?: string;
  vehicle_number?: string;
  vehicle_type?: string;
}

const NOT_APPLICABLE = "♦ Not Applicable";

const REASON_OPTIONS = [
  NOT_APPLICABLE,
  "01-Sales Return",
  "02-Post Sale Discount",
  "03-Deficiency in services",
  "04-Correction in Invoice",
  "05-Change in POS",
  "06-Finalization of Provisional assessment",
  "07-Others",
];

const MODE_OPTIONS = [NOT_APPLICABLE, "1 - Road", "2 - Rail", "3 - Air", "4 - Ship"];

const VEHICLE_TYPE_OPTIONS = [NOT_APPLICABLE, "Regular", "Over Dimensional Cargo"];

// "Not Applicable" is a display-only sentinel — never persisted (saved as ""),
// and empty/legacy-sentinel values load back to the display default.
const toDisplay = (v?: string | null) =>
  !v || v.includes("Not Applicable") ? NOT_APPLICABLE : v;
const toSaved = (v?: string | null) =>
  !v || v.includes("Not Applicable") ? "" : v;

interface Props {
  initialDetails?: GstEwayBillDetails | null;
  onClose: () => void;
  onSave: (details: GstEwayBillDetails) => void;
  /** Show "Reason for Issuing Note" + note-no row (Credit/Debit Note only). */
  showNoteReason?: boolean;
  /** Label for the note reference no. — differs by voucher type. */
  noteNoLabel?: string;
}

export default function GstEwayBillDetailsPopup({
  initialDetails,
  onClose,
  onSave,
  showNoteReason = false,
  noteNoLabel = "Buyer's Debit Note No.",
}: Props) {
  const [form, setForm] = useState<GstEwayBillDetails>({
    reason_for_issuing_note: toDisplay(initialDetails?.reason_for_issuing_note),
    buyers_note_no: initialDetails?.buyers_note_no ?? "",
    buyers_note_date: initialDetails?.buyers_note_date ?? "",
    eway_bill_no: initialDetails?.eway_bill_no ?? "",
    eway_bill_date: initialDetails?.eway_bill_date ?? "",
    dispatch_from: initialDetails?.dispatch_from ?? "",
    ship_to: initialDetails?.ship_to ?? "",
    transporter_name: initialDetails?.transporter_name ?? "",
    transporter_id: initialDetails?.transporter_id ?? "",
    mode: toDisplay(initialDetails?.mode),
    doc_lading_no: initialDetails?.doc_lading_no ?? "",
    doc_lading_date: initialDetails?.doc_lading_date ?? "",
    vehicle_number: initialDetails?.vehicle_number ?? "",
    vehicle_type: toDisplay(initialDetails?.vehicle_type),
  });

  const set = (patch: Partial<GstEwayBillDetails>) => setForm((p) => ({ ...p, ...patch }));

  const handleSave = () =>
    onSave({
      ...form,
      reason_for_issuing_note: toSaved(form.reason_for_issuing_note),
      mode: toSaved(form.mode),
      vehicle_type: toSaved(form.vehicle_type),
    });

  const labelCls = "w-56 text-sm text-black shrink-0";
  const colonCls = "text-sm text-black shrink-0";
  const inputCls =
    "min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black";
  const dateCls =
    "w-40 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black";
  const sectionCls =
    "text-sm font-semibold text-black border-b border-gray-300 pb-1 pt-1";

  return (
    <VoucherPopupShell title="Statutory Details" onClose={onClose} onAccept={handleSave}>
      <div className="max-w-3xl space-y-4">
        {showNoteReason && (
          <div className="space-y-3">
            <div className={sectionCls}>Additional Details</div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Reason for Issuing Note</span>
              <span className={colonCls}>:</span>
              <select
                className={inputCls}
                value={form.reason_for_issuing_note ?? ""}
                onChange={(e) => set({ reason_for_issuing_note: e.target.value })}
                autoFocus
              >
                {REASON_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>{noteNoLabel}</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.buyers_note_no ?? ""}
                onChange={(e) => set({ buyers_note_no: e.target.value })}
              />
              <span className={colonCls}>Date</span>
              <span className={colonCls}>:</span>
              <input
                type="date"
                className={dateCls}
                value={form.buyers_note_date ?? ""}
                onChange={(e) => set({ buyers_note_date: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className={sectionCls}>e-Way Bill Details</div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>e-Way Bill No.</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.eway_bill_no ?? ""}
              onChange={(e) => set({ eway_bill_no: e.target.value })}
              autoFocus={!showNoteReason}
            />
            <span className={colonCls}>Date</span>
            <span className={colonCls}>:</span>
            <input
              type="date"
              className={dateCls}
              value={form.eway_bill_date ?? ""}
              onChange={(e) => set({ eway_bill_date: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className={sectionCls}>Place of Party</div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Dispatch from</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.dispatch_from ?? ""}
              onChange={(e) => set({ dispatch_from: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Ship to</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.ship_to ?? ""}
              onChange={(e) => set({ ship_to: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className={sectionCls}>Transport Details</div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Transporter Name</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.transporter_name ?? ""}
              onChange={(e) => set({ transporter_name: e.target.value })}
            />
            <span className={colonCls}>Transporter ID</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={dateCls}
              value={form.transporter_id ?? ""}
              onChange={(e) => set({ transporter_id: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className={sectionCls}>Part B Details</div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Mode</span>
            <span className={colonCls}>:</span>
            <select
              className={inputCls}
              value={form.mode ?? ""}
              onChange={(e) => set({ mode: e.target.value })}
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Doc/Lading/RR/AirWay No.</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.doc_lading_no ?? ""}
              onChange={(e) => set({ doc_lading_no: e.target.value })}
            />
            <span className={colonCls}>Date</span>
            <span className={colonCls}>:</span>
            <input
              type="date"
              className={dateCls}
              value={form.doc_lading_date ?? ""}
              onChange={(e) => set({ doc_lading_date: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Vehicle Number</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              className={inputCls}
              value={form.vehicle_number ?? ""}
              onChange={(e) => set({ vehicle_number: e.target.value })}
            />
            <span className={colonCls}>Vehicle Type</span>
            <span className={colonCls}>:</span>
            <select
              className={dateCls}
              value={form.vehicle_type ?? ""}
              onChange={(e) => set({ vehicle_type: e.target.value })}
            >
              {VEHICLE_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </VoucherPopupShell>
  );
}
