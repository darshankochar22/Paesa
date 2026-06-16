import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import GroupFlatList from "@/components/GroupFlatList";
import type { GroupType } from "@/types/api";
import NatureOfPaymentDetailsModal from "./NatureOfPaymentDetailsModal";
import NatureOfGoodsDetailsModal from "./NatureOfGoodsDetailsModal";
import OtherStatutoryDetailsModal, { type StatutoryField } from "./OtherStatutoryDetailsModal";
import ServiceCategoryDetailsModal from "./ServiceCategoryDetailsModal";
import VATDetailsModal from "./VATDetailsModal";
import ExciseTariffDetailsModal from "./ExciseTariffDetailsModal";
import TDSNatureOfPaymentCreation from "./TDSNatureOfPaymentCreation";
import TCSNatureOfGoodsCreation from "./TCSNatureOfGoodsCreation";

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

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

const NATURES = ["Assets", "Liabilities", "Income", "Expenses"];
const ALLOC_METHODS = ["Not Applicable", "Appropriate by Quantity", "Appropriate by Value"];
const HSN_SAC_SOURCES = ["As per Company/Group", "Not Available"];
const GST_RATE_SOURCES = ["As per Company/Group", "Not Available"];
const TAXABILITY_TYPES = ["Taxable", "Exempt", "Nil Rated", "Zero Rated", "Reverse Charge"];

const INITIAL_FORM: Partial<GroupType> = {
    name: "",
    alias: "",
    parent_group_id: undefined,
    is_primary: 0,
    nature: "Assets",
    set_alter_tds_details: 0,
    set_alter_tcs_details: 0,
    set_alter_other_statutory_details: 0,
    hsn_sac_source: "As per Company/Group",
    hsn_sac_code: "",
    hsn_sac_description: "",
    gst_rate_source: "As per Company/Group",
    gst_rate: 0,
    taxability_type: "",
    behaves_like_subledger: 0,
    show_net_debit_credit: 0,
    used_for_calculation: 0,
    allocation_method: "Not Applicable",
  };

export default function GroupCreate() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `groupCreate_${companyId}` : null;
  const hasRestored = useRef(false);

  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showTdsModal, setShowTdsModal] = useState(false);
  const [showTcsModal, setShowTcsModal] = useState(false);
  const [showOtherStatutoryModal, setShowOtherStatutoryModal] = useState(false);
  const [showServiceTaxModal, setShowServiceTaxModal] = useState(false);
  const [showStatutoryTdsModal, setShowStatutoryTdsModal] = useState(false);
  const [showStatutoryTdsCreate, setShowStatutoryTdsCreate] = useState(false);
  const [showStatutoryTcsCreate, setShowStatutoryTcsCreate] = useState(false);
  const [showVatModal, setShowVatModal] = useState(false);
  const [showExciseModal, setShowExciseModal] = useState(false);

  const [form, setForm] = useState<Partial<GroupType>>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL_FORM
  );

  // Auto-save to sessionStorage
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const anyModal = showGroupPanel || showTdsModal || showTcsModal || showOtherStatutoryModal ||
        showServiceTaxModal || showStatutoryTdsModal || showStatutoryTdsCreate || showStatutoryTcsCreate ||
        showVatModal || showExciseModal;
      if (e.key === "Escape" && !anyModal) {
        e.preventDefault();
        navigate("/master/create");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGroupPanel, showTdsModal, showTcsModal, showOtherStatutoryModal,
      showServiceTaxModal, showStatutoryTdsModal, showStatutoryTdsCreate, showStatutoryTcsCreate,
      showVatModal, showExciseModal, navigate]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [allRes] = await Promise.all([
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (allRes.success && allRes.groups) {
          const allGroups = allRes.groups ?? [];
          setFlatGroups(allGroups);
          const capital = allGroups.find((g: GroupType) => g.name === "Capital Account");
          if (capital) {
            setForm((f) => ({
              ...f,
              parent_group_id: capital.group_id,
              is_primary: 0,
              nature: capital.nature || "Liabilities",
            }));
          }
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load groups.");
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const parentGroup = form.parent_group_id
    ? flatGroups.find((g) => g.group_id === form.parent_group_id)
    : null;

  const primaryGroupName = useMemo(() => {
    if (!parentGroup || flatGroups.length === 0) return null;
    let current: GroupType | undefined = parentGroup;
    while (current) {
      if (!current.parent_group_id) return current.name;
      current = flatGroups.find((g) => g.group_id === current!.parent_group_id);
    }
    return null;
  }, [parentGroup, flatGroups]);

  const showStatutoryDetails = useMemo(() => {
    return primaryGroupName === "Fixed Assets" ||
      primaryGroupName === "Investments" ||
      primaryGroupName === "Loans(Liability)" ||
      primaryGroupName === "Misc.Expenses(Asset)";
  }, [primaryGroupName]);

  const showTcsDetails = useMemo(() => {
    return primaryGroupName === "Branch/Divisions";
  }, [primaryGroupName]);

  const statutoryFields = useMemo<StatutoryField[] | undefined>(() => {
    if (primaryGroupName === "Investments" || primaryGroupName === "Loans(Liability)" || primaryGroupName === "Misc.Expenses(Asset)") {
      return ["tds"];
    }
    return undefined;
  }, [primaryGroupName]);

  const isPrimarySelected = !form.parent_group_id;

  const handleGroupSelect = (group: GroupType) => {
    setForm((f) => ({
      ...f,
      parent_group_id: group.group_id,
      is_primary: 0,
      nature: group.nature || "Assets",
    }));
    setShowGroupPanel(false);
  };

  const handleSelectPrimary = () => {
    setForm((f) => ({ ...f, parent_group_id: undefined, is_primary: 1, nature: "Liabilities" }));
    setShowGroupPanel(false);
  };

  const setField = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleField = (key: keyof GroupType) => () => {
    if (key === "set_alter_tds_details") {
      setForm((f) => {
        const newVal = f[key] ? 0 : 1;
        if (newVal === 1) {
          setTimeout(() => setShowTdsModal(true), 0);
        }
        return { ...f, [key]: newVal };
      });
      return;
    }
    if (key === "set_alter_tcs_details") {
      setForm((f) => {
        const newVal = f[key] ? 0 : 1;
        if (newVal === 1) {
          setTimeout(() => setShowTcsModal(true), 0);
        }
        return { ...f, [key]: newVal };
      });
      return;
    }
    if (key === "set_alter_other_statutory_details") {
      setForm((f) => {
        const newVal = f[key] ? 0 : 1;
        if (newVal === 1) {
          setTimeout(() => setShowOtherStatutoryModal(true), 0);
        }
        return { ...f, [key]: newVal };
      });
      return;
    }
    setForm((f) => ({ ...f, [key]: f[key] ? 0 : 1 }));
  };

  const validate = (): string | null => {
    if (!form.name?.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null); setSuccess(null);
    try {
      const payload = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : undefined,
        is_primary: form.parent_group_id ? 0 : 1,
        nature: form.nature || undefined,
        set_alter_tds_details: form.set_alter_tds_details ? 1 : 0,
        set_alter_tcs_details: form.set_alter_tcs_details ? 1 : 0,
        set_alter_other_statutory_details: form.set_alter_other_statutory_details ? 1 : 0,
        hsn_sac_source: form.hsn_sac_source || undefined,
        hsn_sac_code: form.hsn_sac_code || undefined,
        hsn_sac_description: form.hsn_sac_description || undefined,
        gst_rate_source: form.gst_rate_source || undefined,
        gst_rate: form.gst_rate || 0,
        taxability_type: form.taxability_type || undefined,
        behaves_like_subledger: form.behaves_like_subledger ? 1 : 0,
        show_net_debit_credit: form.show_net_debit_credit ? 1 : 0,
        used_for_calculation: form.used_for_calculation ? 1 : 0,
        allocation_method: form.allocation_method || "Not Applicable",
      };

      const res = await window.api.group.create(payload);
      if (res.success) {
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        setSuccess(`Group "${form.name}" created.`);
        const capital = flatGroups.find((g) => g.name === "Capital Account");
        setForm((f) => ({
          ...f,
          name: "",
          alias: "",
          parent_group_id: capital?.group_id,
          is_primary: 0,
          nature: capital?.nature || "Liabilities",
          set_alter_tds_details: 0,
          set_alter_tcs_details: 0,
          set_alter_other_statutory_details: 0,
          hsn_sac_source: "As per Company/Group",
          hsn_sac_code: "",
          hsn_sac_description: "",
          gst_rate_source: "As per Company/Group",
          gst_rate: 0,
          taxability_type: "",
          behaves_like_subledger: 0,
          show_net_debit_credit: 0,
          used_for_calculation: 0,
          allocation_method: "Not Applicable",
        }));
        const [allRes] = await Promise.all([
          window.api.group.getAll(companyId!),
        ]);
        if (allRes.success && allRes.groups) setFlatGroups(allRes.groups ?? []);
      } else {
        setError(res.error || "Failed to create group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/master/create" className="text-sm text-zinc-500 hover:text-zinc-800">
              &larr; Back to Masters
            </Link>
            <h1 className="text-lg font-semibold text-zinc-800">Create Group</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-2 border border-green-200 text-green-700 text-sm flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
          </div>
        )}

        <div className="flex flex-col gap-6 max-w-3xl">
          <div>
            <div className="border rounded overflow-hidden">
              <Row label="Name" required>
                <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} placeholder="" />
              </Row>
              <Row label="(alias)">
                <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} placeholder="" />
              </Row>
              <Row label="Under" onClick={() => setShowGroupPanel(!showGroupPanel)}>
                <span className="text-sm py-1 font-medium text-zinc-800">
                  {parentGroup ? parentGroup.name : "\u2014 Primary \u2014"}
                </span>
                {primaryGroupName && primaryGroupName !== parentGroup?.name && (
                  <span className="text-xs text-zinc-400 ml-2 font-normal">(Group: {primaryGroupName})</span>
                )}
              </Row>
              {isPrimarySelected && (
                <Row label="Nature of Group" required>
                  <select className={selectCls} value={form.nature || "Liabilities"} onChange={setField("nature")}>
                    {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Row>
              )}
            </div>
          </div>

          <div className="" />

          <div className="border rounded overflow-hidden">
            <Row label="Group behaves like a sub-ledger" onClick={toggleField("behaves_like_subledger")}>
              <span className="text-sm py-1">{form.behaves_like_subledger ? "Yes" : "No"}</span>
            </Row>
            <Row label="Nett Debit/Credit Balances for Reporting" onClick={toggleField("show_net_debit_credit")}>
              <span className="text-sm py-1">{form.show_net_debit_credit ? "Yes" : "No"}</span>
            </Row>
            <Row label="Used for calculation (for example: taxes, discounts) (for sales invoice entries)" onClick={toggleField("used_for_calculation")}>
              <span className="text-sm py-1">{form.used_for_calculation ? "Yes" : "No"}</span>
            </Row>
            <Row label="Method to allocate when used in purchase invoice">
              <select className={selectCls} value={form.allocation_method || "Not Applicable"} onChange={setField("allocation_method")}>
                {ALLOC_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Row>
            {!showStatutoryDetails && (
              <>
                <Row label="Set/Alter TDS details" onClick={toggleField("set_alter_tds_details")}>
                  <span className="text-sm py-1">{form.set_alter_tds_details ? "Yes" : "No"}</span>
                </Row>
                {showTcsDetails && (
                  <Row label="Set/Alter TCS details" onClick={toggleField("set_alter_tcs_details")}>
                    <span className="text-sm py-1">{form.set_alter_tcs_details ? "Yes" : "No"}</span>
                  </Row>
                )}
              </>
            )}
          </div>

          {showStatutoryDetails && (
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
                  onChange={(e) => setForm((f) => ({ ...f, hsn_sac_source: e.target.value }))}
                >
                  {HSN_SAC_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Source of details">
                <span className="text-sm py-1">Not Available</span>
              </Row>
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
              <div className="px-3 py-2 bg-zinc-50 border-b border-t">
                <span className="text-xs font-semibold text-zinc-700 underline">GST Rate & Related Details</span>
              </div>
              <Row label="GST Rate Details">
                <select
                  className={selectCls}
                  value={form.gst_rate_source || "As per Company/Group"}
                  onChange={(e) => setForm((f) => ({ ...f, gst_rate_source: e.target.value }))}
                >
                  {GST_RATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Source of details">
                <span className="text-sm py-1">Not Available</span>
              </Row>
              <Row label="Taxability Type">
                <select
                  className={selectCls}
                  value={form.taxability_type || ""}
                  onChange={(e) => setForm((f) => ({ ...f, taxability_type: e.target.value }))}
                >
                  <option value="">-- None --</option>
                  {TAXABILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
            </div>
            <Row label="Set/Alter other Statutory details" onClick={toggleField("set_alter_other_statutory_details")}>
              <span className="text-sm py-1">{form.set_alter_other_statutory_details ? "Yes" : "No"}</span>
            </Row>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </div>

      {showGroupPanel && (
        <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Under Group</span>
            <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
          </div>
          <div
            className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none border-b ${isPrimarySelected ? "bg-zinc-100 font-semibold text-black" : "text-zinc-700 hover:bg-zinc-50"}`}
            onClick={handleSelectPrimary}
          >
            <span className="truncate">Primary</span>
          </div>
          <GroupFlatList
            groups={flatGroups}
            selectedId={form.parent_group_id as number}
            onSelect={handleGroupSelect}
            showHeader={false}
          />
        </div>
      )}

      <NatureOfPaymentDetailsModal
        isOpen={showTdsModal}
        onClose={() => setShowTdsModal(false)}
        companyId={companyId}
        onOpenCreateForm={() => setShowStatutoryTdsCreate(true)}
      />

      <NatureOfGoodsDetailsModal
        isOpen={showTcsModal}
        onClose={() => setShowTcsModal(false)}
        companyId={companyId}
        onOpenCreateForm={() => setShowStatutoryTcsCreate(true)}
      />

      <OtherStatutoryDetailsModal
        isOpen={showOtherStatutoryModal}
        onClose={() => setShowOtherStatutoryModal(false)}
        groupName={form.name}
        showFields={statutoryFields}
        openServiceTaxModal={() => setShowServiceTaxModal(true)}
        openTdsModal={() => setShowStatutoryTdsModal(true)}
        openVatModal={() => setShowVatModal(true)}
        openExciseModal={() => setShowExciseModal(true)}
      />

      <ServiceCategoryDetailsModal
        isOpen={showServiceTaxModal}
        onClose={() => setShowServiceTaxModal(false)}
      />

      <NatureOfPaymentDetailsModal
        isOpen={showStatutoryTdsModal}
        onClose={() => setShowStatutoryTdsModal(false)}
        companyId={companyId}
        onOpenCreateForm={() => setShowStatutoryTdsCreate(true)}
      />

      <TDSNatureOfPaymentCreation
        isOpen={showStatutoryTdsCreate}
        onClose={() => setShowStatutoryTdsCreate(false)}
        companyId={companyId}
        onCreated={() => {
          // Refresh the list in the NatureOfPaymentDetailsModal
          window.dispatchEvent(new CustomEvent("tds-nature-of-payment-created"));
        }}
      />

      <TCSNatureOfGoodsCreation
        isOpen={showStatutoryTcsCreate}
        onClose={() => setShowStatutoryTcsCreate(false)}
        companyId={companyId}
        onCreated={() => {
          // Refresh the list in the NatureOfGoodsDetailsModal
          window.dispatchEvent(new CustomEvent("tcs-nature-of-goods-created"));
        }}
      />

      <VATDetailsModal
        isOpen={showVatModal}
        onClose={() => setShowVatModal(false)}
      />

      <ExciseTariffDetailsModal
        isOpen={showExciseModal}
        onClose={() => setShowExciseModal(false)}
      />
    </div>
  );
}
