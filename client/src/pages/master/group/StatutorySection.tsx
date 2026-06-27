import { useState, useMemo, useEffect } from "react";
import type { GroupType, SlabBasedRate } from "@/types/api";
import { getConfig, TOGGLE_META, type StatutoryToggle } from "@/config/statutoryConfig";
import StatutoryModal from "./StatutoryModal";
import NatureOfPaymentDetailsModal from "./NatureOfPaymentDetailsModal";
import NatureOfGoodsDetailsModal from "./NatureOfGoodsDetailsModal";
import ServiceCategoryDetailsModal from "./ServiceCategoryDetailsModal";
import VATDetailsModal from "./VATDetailsModal";
import ExciseTariffDetailsModal from "./ExciseTariffDetailsModal";
import TDSNatureOfPaymentCreation from "./TDSNatureOfPaymentCreation";
import TCSNatureOfGoodsCreation from "./TCSNatureOfGoodsCreation";
import SlabBasedRatesTable from "./SlabBasedRatesTable";

const HSN_SAC_SOURCES = [
  "As per Company/Group",
  "Specify Details Here",
  "Use GST Classification",
  "Specify in Voucher",
];
const GST_RATE_SOURCES = [
  "As per Company/Group",
  "Specify Details Here",
  "Specify Slab-Based Rates",
  "Use GST Classification",
  "Specify in Voucher",
];
const TAXABILITY_TYPES = ["Taxable", "Exempt", "Nil Rated", "Non-GST"];

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

function Row({ label, required, children, onClick }: { label: string; required?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`flex items-start last:border-0 min-h-[36px]${onClick ? " cursor-pointer hover:bg-zinc-50" : ""}`} onClick={onClick}>
      <span className="w-64 text-sm text-zinc-600 shrink-0 py-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

interface StatutorySectionProps {
  form: Partial<GroupType>;
  setForm: React.Dispatch<React.SetStateAction<Partial<GroupType>>>;
  primaryGroupName: string | null;
  parentGroupName?: string | null;
  companyId: number | undefined;
  gstClassifications: { gc_id: number; name: string }[];
  onOpenClassPanel: (target: "hsn" | "gst") => void;
}

export default function StatutorySection({
  form,
  setForm,
  primaryGroupName,
  parentGroupName,
  companyId,
  gstClassifications,
  onOpenClassPanel,
}: StatutorySectionProps) {
  const config = useMemo(() => getConfig(primaryGroupName, parentGroupName), [primaryGroupName, parentGroupName]);

  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState<StatutoryToggle | null>(null);
  const [showTdsCreate, setShowTdsCreate] = useState(false);
  const [showTcsCreate, setShowTcsCreate] = useState(false);

  const values = useMemo<Record<StatutoryToggle, number>>(() => ({
    tds:        form.set_alter_tds_details ?? 0,
    tcs:        form.set_alter_tcs_details ?? 0,
    serviceTax: form.set_alter_service_tax_details ?? 0,
    vat:        form.set_alter_vat_details ?? 0,
    excise:     form.set_alter_excise_details ?? 0,
  }), [form.set_alter_tds_details, form.set_alter_tcs_details, form.set_alter_service_tax_details, form.set_alter_vat_details, form.set_alter_excise_details]);

  const handleToggle = (key: StatutoryToggle) => {
    const dbKey = TOGGLE_META[key].dbKey as keyof GroupType;
    setForm((f) => ({ ...f, [dbKey]: f[dbKey] ? 0 : 1 }));
  };

  const handleOpenSubModal = (key: StatutoryToggle) => {
    setActiveSubModal(key);
  };

  const statutoryRowYes = config.statutoryModalToggles.some(
    (key) => values[key] === 1
  );

  const setField = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      <div className="text-sm font-semibold text-zinc-800 mb-2">Statutory Details</div>
      <div className="border rounded overflow-hidden">
        <div className="px-3 py-2 bg-zinc-50 border-b">
          <span className="text-xs font-semibold text-zinc-700 underline">HSN/SAC & Related Details</span>
        </div>
        <Row label="HSN/SAC Details">
          <select
            className={selectCls}
            value={form.hsn_sac_source || "As per Company/Group"}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({
                ...f,
                hsn_sac_source: val,
                hsn_sac_code: val === "Specify Details Here" ? f.hsn_sac_code : "",
                hsn_sac_description: val === "Specify Details Here" ? f.hsn_sac_description : "",
                hsn_sac_classification_id: val === "Use GST Classification" ? f.hsn_sac_classification_id : undefined,
              }));
            }}
          >
            {HSN_SAC_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Row>
        <Row label="Source of details">
          <span className="text-sm py-1 text-zinc-700">
            {form.hsn_sac_source === "As per Company/Group" || !form.hsn_sac_source
              ? "Not Available"
              : form.hsn_sac_source === "Use GST Classification"
                ? (gstClassifications.find((g) => g.gc_id === Number(form.hsn_sac_classification_id))?.name ?? "Not Available")
                : ""}
          </span>
        </Row>
        {form.hsn_sac_source === "Use GST Classification" && (
          <Row label="Classification" onClick={() => onOpenClassPanel("hsn")}>
            <span className="text-sm py-1 font-medium text-zinc-800">
              {gstClassifications.find((c) => c.gc_id === Number(form.hsn_sac_classification_id))?.name || ""}
            </span>
          </Row>
        )}
        {form.hsn_sac_source === "Specify Details Here" && (
          <>
            <Row label="HSN/SAC">
              <input
                className={inputCls}
                value={form.hsn_sac_code || ""}
                onChange={setField("hsn_sac_code")}
                placeholder=""
              />
            </Row>
            <Row label="Description">
              <input
                className={inputCls}
                value={form.hsn_sac_description || ""}
                onChange={setField("hsn_sac_description")}
                placeholder=""
              />
            </Row>
          </>
        )}
        <div className="px-3 py-2 bg-zinc-50 border-b border-t">
          <span className="text-xs font-semibold text-zinc-700 underline">GST Rate & Related Details</span>
        </div>
        <Row label="GST Rate Details">
          <select
            className={selectCls}
            value={form.gst_rate_source || "As per Company/Group"}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({
                ...f,
                gst_rate_source: val,
                gst_classification_id: val === "Use GST Classification" ? f.gst_classification_id : undefined,
                slab_based_rates: val === "Specify Slab-Based Rates" ? f.slab_based_rates : "[]",
              }));
            }}
          >
            {GST_RATE_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Row>
        <Row label="Source of details">
          <span className="text-sm py-1 text-zinc-700">
            {form.gst_rate_source === "As per Company/Group" || !form.gst_rate_source
              ? "Not Available"
              : form.gst_rate_source === "Use GST Classification"
                ? (gstClassifications.find((g) => g.gc_id === Number(form.gst_classification_id))?.name ?? "Not Available")
                : ""}
          </span>
        </Row>
        {form.gst_rate_source === "Use GST Classification" && (
          <Row label="Classification" onClick={() => onOpenClassPanel("gst")}>
            <span className="text-sm py-1 font-medium text-zinc-800">
              {gstClassifications.find((c) => c.gc_id === Number(form.gst_classification_id))?.name || ""}
            </span>
          </Row>
        )}
        {form.gst_rate_source === "Specify Details Here" && (
          <>
            <Row label="Taxability Type">
              <select
                className={selectCls}
                value={form.taxability_type || ""}
                onChange={(e) => setForm((f) => ({ ...f, taxability_type: e.target.value }))}
              >
                <option value="">-- None --</option>
                {TAXABILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row label="GST Rate">
              <div className="flex items-center gap-1">
                <input
                  className={inputCls}
                  type="number"
                  value={form.gst_rate || 0}
                  onChange={(e) => setForm((f) => ({ ...f, gst_rate: Number(e.target.value) }))}
                />
                <span className="text-sm text-zinc-500">%</span>
              </div>
            </Row>
          </>
        )}
        {form.gst_rate_source === "Specify Slab-Based Rates" && (
          <>
            <Row label="Taxability Type">
              <select
                className={selectCls}
                value={form.taxability_type || ""}
                onChange={(e) => setForm((f) => ({ ...f, taxability_type: e.target.value }))}
              >
                <option value="">-- None --</option>
                {TAXABILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <div className="px-3 pb-2">
              <SlabBasedRatesTable
                rows={(() => {
                  try {
                    return JSON.parse(form.slab_based_rates || "[]") as SlabBasedRate[];
                  } catch {
                    return [];
                  }
                })()}
                onChange={(rows) =>
                  setForm((f) => ({ ...f, slab_based_rates: JSON.stringify(rows) }))
                }
              />
            </div>
          </>
        )}
      </div>
      <div className="border rounded overflow-hidden mt-3">
        <Row label="Set/Alter other Statutory details" onClick={() => setShowStatutoryModal(true)}>
          <span className="text-sm py-1">
            {statutoryRowYes ? "Yes" : "No"}
          </span>
        </Row>
      </div>

      <StatutoryModal
        isOpen={showStatutoryModal}
        onClose={() => setShowStatutoryModal(false)}
        groupName={form.name}
        toggles={config.statutoryModalToggles}
        values={values}
        onToggle={handleToggle}
        onOpenSubModal={handleOpenSubModal}
      />

      <NatureOfPaymentDetailsModal
        isOpen={activeSubModal === "tds"}
        onClose={() => setActiveSubModal(null)}
        companyId={companyId}
        onOpenCreateForm={() => setShowTdsCreate(true)}
      />
      <NatureOfGoodsDetailsModal
        isOpen={activeSubModal === "tcs"}
        onClose={() => setActiveSubModal(null)}
        companyId={companyId}
        onOpenCreateForm={() => setShowTcsCreate(true)}
      />
      <ServiceCategoryDetailsModal
        isOpen={activeSubModal === "serviceTax"}
        onClose={() => setActiveSubModal(null)}
      />
      <VATDetailsModal
        isOpen={activeSubModal === "vat"}
        onClose={() => setActiveSubModal(null)}
      />
      <ExciseTariffDetailsModal
        isOpen={activeSubModal === "excise"}
        onClose={() => setActiveSubModal(null)}
      />
      <TDSNatureOfPaymentCreation
        isOpen={showTdsCreate}
        onClose={() => setShowTdsCreate(false)}
        companyId={companyId}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent("tds-nature-of-payment-created"));
        }}
      />
      <TCSNatureOfGoodsCreation
        isOpen={showTcsCreate}
        onClose={() => setShowTcsCreate(false)}
        companyId={companyId}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent("tcs-nature-of-goods-created"));
        }}
      />
    </div>
  );
}
