import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import type { LedgerType, GroupType } from "@/types/api";
import { EMPTY_BANK_DETAILS } from "../components/BankDetailsPopup";
import type { BankDetails } from "../components/BankDetailsPopup";

export interface StatutoryDetails {
  gst_applicability?: string;
  hsn_sac_code?: string;
  hsn_sac_description?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  type_of_duty_tax?: string;
  percentage_of_calculation?: number;
  statutory_details?: string;
  additional_gst_details: number;
  service_tax_details: number;
}

export const EMPTY_STATUTORY: StatutoryDetails = {
  gst_applicability: "Not Applicable",
  hsn_sac_code: "",
  hsn_sac_description: "",
  gst_rate: 0,
  cgst_rate: 0,
  sgst_rate: 0,
  igst_rate: 0,
  type_of_duty_tax: "",
  percentage_of_calculation: 0,
  statutory_details: "",
  additional_gst_details: 0,
  service_tax_details: 0,
};

export const INITIAL_FORM: Partial<LedgerType> = {
  name: "",
  alias: "",
  opening_balance: 0,
  ledger_type: "General",
  mailing_name: "",
  address1: "",
  address2: "",
  city: "",
  state: "Select",
  country: "India",
  pincode: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  registration_type: "Unregistered",
  additional_gst_details: 0,
  service_tax_details: 0,
  default_credit_period: 0,
  check_credit_days: 0,
  allow_cost_centres: 0,
  invoice_rounding: 0,
  rounding_method: "",
  rounding_limit: 0,
  include_assessable_value: "Not Applicable",
  method_of_calculation: "Based on Value",
  other_statutory_details: 0,
  
};

interface UseLedgerFormOptions {
  mode: "create" | "alter";
}

export function useLedgerForm({ mode }: UseLedgerFormOptions) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `ledger${mode === "create" ? "Create" : "Alter"}_${companyId}` : null;
  const hasRestored = useRef(false);

  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [groupTree, setGroupTree] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(() => {
    if (mode === "alter" && persistKey) {
      return loadFormState<any>(persistKey)?.selectedLedgerId ?? null;
    }
    return null;
  });
  const [loadedGroupId, setLoadedGroupId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [showBankPopup, setShowBankPopup] = useState(false);

  const [provideBank, setProvideBank] = useState<"No" | "Yes">(
    () => loadFormState<any>(persistKey ?? "")?.provideBank ?? "No"
  );

  const [form, setForm] = useState<Partial<LedgerType>>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL_FORM
  );
  const [bankForm, setBankForm] = useState<BankDetails>(
    () => loadFormState<any>(persistKey ?? "")?.bankForm ?? EMPTY_BANK_DETAILS
  );
  const [statutoryForm, setStatutoryForm] = useState<StatutoryDetails>(
    () => loadFormState<any>(persistKey ?? "")?.statutoryForm ?? EMPTY_STATUTORY
  );

  // Auto-save to sessionStorage
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    if (mode === "alter" && !selectedLedgerId) return;
    saveFormState(persistKey, {
      form,
      bankForm,
      statutoryForm,
      provideBank,
      ...(mode === "alter" ? { selectedLedgerId } : {}),
    });
  }, [persistKey, form, bankForm, statutoryForm, provideBank, selectedLedgerId, mode]);


  const selectedGroup = useMemo(() => {
    return flatGroups.find((g) => g.group_id === form.group_id) || null;
  }, [form.group_id, flatGroups]);


  const groupLineage = useMemo(() => {
    const lineage = {
      isBank: false,
      isOD: false,
      isTax: false,
      isDebtorCreditor: false,
      isInventory: false,
      isIncomeExpense: false,
      primaryGroupName: null as string | null,
      hideMailingExtras: false,
    };
    if (!selectedGroup || flatGroups.length === 0) return lineage;

    const findGroup = (id?: number): GroupType | undefined => {
      return flatGroups.find((g) => g.group_id === id);
    };

    const checkLineage = (current: GroupType) => {
      const name = current.name.toLowerCase().trim();
      if (name === "bank accounts") lineage.isBank = true;
      if (name === "bank od a/c" || name === "bank od accounts" || name === "bank od account" || name === "bank occ a/c") {
        lineage.isBank = true;
        lineage.isOD = true;
      }

      if (name === "duties & taxes" || name === "current assets") lineage.isTax = true;
      if (name === "sundry debtors" || name === "sundry creditors") lineage.isDebtorCreditor = true;
      if (
        [
          "sales accounts",
          "purchase accounts",
          "direct expenses",
          "indirect expenses",
          "direct incomes",
          "indirect incomes",
        ].includes(name)
      ) {
        lineage.isInventory = true;
      }
      if (
        [
          "direct expenses",
          "indirect expenses",
          "direct incomes",
          "indirect incomes",
        ].includes(name)
      ) {
        lineage.isIncomeExpense = true;
      }

      if (
        [
          "cash-in-hand",
          "duties & taxes",
          "misc. expenses(asset)",
          "misc.expenses(asset)",
          "provisions",
          "purchase accounts",
          "sales accounts",
          "reserves & surplus",
          "reserve & surplus",
          "retained earnings",
          "stock-in-hand",
          "stock in hand",
          "suspense a/c",
        ].includes(name)
      ) {
        lineage.hideMailingExtras = true;
      }

      if (!current.parent_group_id) {
        lineage.primaryGroupName = current.name;
        return;
      }

      const parent = findGroup(current.parent_group_id);
      if (parent) {
        checkLineage(parent);
      }
    };

    checkLineage(selectedGroup);
    return lineage;
  }, [selectedGroup, flatGroups]);

  useEffect(() => {
    if (!selectedGroup) return;
    if (mode === "create" || form.group_id !== loadedGroupId) {
      if (!groupLineage.isBank) {
        setProvideBank("No");
      } else {
        setProvideBank("Yes");
      }
      if (!groupLineage.isInventory) {
        setForm((f) => ({ ...f, invoice_rounding: 0, rounding_method: "", rounding_limit: 0 }));
      }
    } else {
      if (groupLineage.isBank) {
        setProvideBank("Yes");
      }
    }
  }, [selectedGroup, groupLineage.isBank, groupLineage.isInventory, form.group_id, loadedGroupId, mode]);

  const loadInitial = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      if (mode === "alter") {
        const [ledgerRes, groupRes, treeRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getAll(companyId),
          window.api.group.getTree(companyId),
        ]);
        if (ledgerRes.success) setLedgers(ledgerRes.ledgers || []);
        if (groupRes.success) setFlatGroups(groupRes.groups || []);
        if (treeRes.success) setGroupTree(treeRes.tree || []);
      } else {
        const groupRes = await window.api.group.getAll(companyId);
        if (groupRes.success && groupRes.groups) {
          const groups = groupRes.groups || [];
          setFlatGroups(groups);
          const capital = groups.find((g: GroupType) => g.name === "Capital Account");
          if (capital && !form.group_id) {
            setForm((f) => ({ ...f, group_id: capital.group_id }));
          }
        }
      }
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [companyId, mode]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadLedger = async (ledgerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.ledger.getById(ledgerId);
      if (!res.success || !res.ledger) {
        setError("Ledger not found.");
        return;
      }
      const l = res.ledger;
      setSelectedLedgerId(ledgerId);
      setLoadedGroupId(l.group_id || null);

      const hasBankDetails = !!l.bank_details;
      setProvideBank(hasBankDetails ? "Yes" : "No");
      setBankForm(hasBankDetails ? { ...EMPTY_BANK_DETAILS, ...l.bank_details } : EMPTY_BANK_DETAILS);

      const hasStatutory = !!l.statutory_details;
      setStatutoryForm(hasStatutory ? { ...EMPTY_STATUTORY, ...l.statutory_details } : EMPTY_STATUTORY);

      setShowGroupPanel(false);
      setForm({
        ledger_id: l.ledger_id,
        name: l.name || "",
        alias: l.alias || "",
        group_id: l.group_id || null,
        ledger_type: l.ledger_type || "General",
        opening_balance: l.opening_balance || 0,
        closing_balance: l.closing_balance || 0,
        mailing_name: l.mailing_name || "",
        address1: l.address1 || "",
        address2: l.address2 || "",
        city: l.city || "",
        state: l.state || "Select",
        country: l.country || "India",
        pincode: l.pincode || "",
        phone: l.phone || "",
        email: l.email || "",
        pan: l.pan || "",
        gstin: l.gstin || "",
        registration_type: l.registration_type || "Unregistered",
        is_bill_wise: l.is_bill_wise || 0,
        maintain_inventory_values: l.maintain_inventory_values || 0,
        default_credit_period: l.default_credit_period || 0,
        check_credit_days: l.check_credit_days || 0,
        allow_cost_centres: l.allow_cost_centres || 0,
        invoice_rounding: l.invoice_rounding || 0,
        rounding_method: l.rounding_method || "",
        rounding_limit: l.rounding_limit || 0,
      });
    } catch {
      setError("Failed to load ledger.");
    } finally {
      setLoading(false);
    }
  };

  const fyLabel = useMemo(() => {
    if (activeFY?.start_date) {
      const d = new Date(activeFY.start_date);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
    }
    return "1-Apr-24";
  }, [activeFY]);

  const setField = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value === "" ? 0 : Number(e.target.value) }));

  const setBankField = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value }));

  const setBankNumber = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setStatutoryField = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value }));

  const setStatutoryNumber = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const handleProvideBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "No" | "Yes";
    setProvideBank(val);
    if (val === "Yes") setShowBankPopup(true);
  };

  const handleBankClose = () => {
    setShowBankPopup(false);
    setProvideBank("No");
    setBankForm(EMPTY_BANK_DETAILS);
  };

  const handleBankAccept = () => {
    setShowBankPopup(false);
  };

  const validate = useCallback((): string | null => {
    if (!form.name?.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  }, [form.name, companyId]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        group_id: form.group_id || undefined,
        ledger_type: form.ledger_type || "General",
        opening_balance: Number(form.opening_balance) || 0,
        closing_balance: mode === "create" ? 0 : Number(form.closing_balance) || 0,
        is_bill_wise: form.is_bill_wise || 0,
        maintain_inventory_values: form.maintain_inventory_values || 0,
        mailing_name: form.mailing_name?.trim() || undefined,
        address1: form.address1?.trim() || undefined,
        address2: form.address2?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state || undefined,
        country: form.country?.trim() || undefined,
        pincode: form.pincode?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        gstin: form.gstin?.trim() || undefined,
        pan: form.pan?.trim() || undefined,
        registration_type: form.registration_type || "Unregistered",
        default_credit_period: form.default_credit_period || 0,
        check_credit_days: form.check_credit_days || 0,
        allow_cost_centres: form.allow_cost_centres || 0,
        invoice_rounding: form.invoice_rounding || 0,
        rounding_method: form.rounding_method || undefined,
        rounding_limit: form.rounding_limit || 0,
        additional_gst_details: form.additional_gst_details ?? 0,
        service_tax_details: form.service_tax_details ?? 0,
      };

      if (mode === "alter") {
        payload.ledger_id = form.ledger_id;
      }

      const hasBankData = provideBank === "Yes" || groupLineage.isBank;
      if (hasBankData) {
        payload.bank_details = {
          account_holder_name: bankForm.account_holder_name?.trim() || undefined,
          account_number: bankForm.account_number?.trim() || undefined,
          ifsc_code: bankForm.ifsc_code?.trim() || undefined,
          swift_code: bankForm.swift_code?.trim() || undefined,
          bank_name: bankForm.bank_name?.trim() || undefined,
          branch_name: bankForm.branch_name?.trim() || undefined,
          bank_configuration: bankForm.bank_configuration?.trim() || undefined,
          cheque_book_start_no: bankForm.cheque_book_start_no?.trim() || undefined,
          cheque_book_end_no: bankForm.cheque_book_end_no?.trim() || undefined,
          enable_cheque_printing: bankForm.enable_cheque_printing ? 1 : 0,
          cheque_printing_configuration: bankForm.cheque_printing_configuration?.trim() || undefined,
          od_limit: Number(bankForm.od_limit) || 0,
          transaction_type: bankForm.transaction_type?.trim() || undefined,
          cross_using: bankForm.cross_using?.trim() || undefined,
          company_bank: bankForm.company_bank?.trim() || undefined,
        };
      } else if (mode === "alter") {
        payload.bank_details = null;
      }

      if (
        groupLineage.isTax ||
        (statutoryForm.gst_applicability && statutoryForm.gst_applicability !== "Not Applicable")
      ) {
        payload.statutory_details = {
          gst_applicability: statutoryForm.gst_applicability || "Not Applicable",
          hsn_sac_code: statutoryForm.hsn_sac_code?.trim() || undefined,
          hsn_sac_description: statutoryForm.hsn_sac_description?.trim() || undefined,
          gst_rate: Number(statutoryForm.gst_rate) || 0,
          cgst_rate: Number(statutoryForm.cgst_rate) || 0,
          sgst_rate: Number(statutoryForm.sgst_rate) || 0,
          igst_rate: Number(statutoryForm.igst_rate) || 0,
          type_of_duty_tax: statutoryForm.type_of_duty_tax || undefined,
          percentage_of_calculation: Number(statutoryForm.percentage_of_calculation) || 0,
          statutory_details: statutoryForm.statutory_details || undefined,
        };
      } else if (mode === "alter") {
        payload.statutory_details = null;
      }

      const res = await (mode === "create"
        ? window.api.ledger.create(payload)
        : window.api.ledger.update(payload));

      if (res.success) {
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        setSuccess(`Ledger "${form.name}" ${mode === "create" ? "created" : "updated"} successfully.`);
        if (mode === "create") {
          setForm(INITIAL_FORM);
          setProvideBank("No");
          setBankForm(EMPTY_BANK_DETAILS);
          setStatutoryForm(EMPTY_STATUTORY);
        } else {
          setLoadedGroupId(form.group_id || null);
          await loadInitial();
        }
      } else {
        setError(res.error || `Failed to ${mode} ledger.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }, [companyId, form, provideBank, groupLineage, bankForm, statutoryForm, validate, mode, loadInitial, persistKey]);

  return {
    form,
    setForm,
    bankForm,
    setBankForm,
    statutoryForm,
    setStatutoryForm,
    provideBank,
    setProvideBank,
    showBankPopup,
    setShowBankPopup,
    showGroupPanel,
    setShowGroupPanel,
    showLedgerPanel,
    setShowLedgerPanel,
    flatGroups,
    groupTree,
    ledgers,
    loading,
    saving,
    error,
    setError,
    success,
    setSuccess,
    selectedLedgerId,
    setSelectedLedgerId,
    selectedGroup,
    groupLineage,
    fyLabel,
    setField,
    setNumber,
    setBankField,
    setBankNumber,
    setStatutoryField,
    setStatutoryNumber,
    handleProvideBankChange,
    handleBankClose,
    handleBankAccept,
    handleSubmit,
    loadLedger,
  };
}
