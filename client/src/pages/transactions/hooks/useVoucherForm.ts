import { useState, useCallback, useEffect, useMemo } from "react";
import { useCompany } from "../../../context/CompanyContext";
import type { LedgerType } from "../../../types/api";

let idCounter = 0;
const nextId = () => `row_${++idCounter}_${Date.now()}`;

export interface ParticularRow {
  id: string;
  ledger: LedgerType | null;
  ledgerBalance: string;
  amountRaw: string;
}

export type ActiveField = { type: 'account' } | { type: 'particular'; rowId: string };

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${monthNames[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function useVoucherForm() {
  const { selectedCompany, activeFY } = useCompany();

  const [voucherType, setVoucherType] = useState<string>("Receipt");
  const [voucherNumber, setVoucherNumber] = useState<number>(1);
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(true);
  const [date] = useState<string>(todayStr());
  const [accountLedger, setAccountLedger] = useState<LedgerType | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>("");
  const [particulars, setParticulars] = useState<ParticularRow[]>([{ id: nextId(), ledger: null, ledgerBalance: "", amountRaw: "" }]);
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchLedgers = useCallback(async () => {
    if (!companyId) return;
    setLedgersLoading(true);
    try {
      const res = await window.api.ledger.getAll(companyId);
      if (res.success) setAllLedgers((res as any).ledgers || []);
    } catch {
      setAllLedgers([]);
    } finally {
      setLedgersLoading(false);
    }
  }, [companyId]);

  const fetchNextNumber = useCallback(async () => {
    if (!companyId || !fyId) return;
    try {
      const res = await window.api.voucher.getNextNumber(companyId, fyId, voucherType);
      if (res.success && res.nextNumber != null) {
        setVoucherNumber(res.nextNumber);
      }
    } catch {
      // ignore
    } finally {
      setVoucherNumberLoading(false);
    }
  }, [companyId, fyId, voucherType]);

  const fetchAccountBalance = useCallback(async (ledgerId: number) => {
    if (!companyId || !fyId) return;
    try {
      const res = await window.api.voucher.getLedgerBalance(ledgerId, companyId, fyId);
      if (res.success && res.balance != null) {
        setAccountBalance(res.balance);
      }
    } catch {
      // ignore
    }
  }, [companyId, fyId]);

  const fetchParticularBalance = useCallback(async (ledgerId: number): Promise<string> => {
    if (!companyId || !fyId) return "";
    try {
      const res = await window.api.voucher.getLedgerBalance(ledgerId, companyId, fyId);
      if (res.success && res.balance != null) return res.balance;
    } catch {
      // ignore
    }
    return "";
  }, [companyId, fyId]);

  useEffect(() => {
    fetchLedgers();
    fetchNextNumber();
  }, [fetchLedgers, fetchNextNumber]);

  useEffect(() => {
    if (accountLedger?.ledger_id) {
      fetchAccountBalance(accountLedger.ledger_id);
    } else {
      setAccountBalance("");
    }
  }, [accountLedger, fetchAccountBalance]);

  const totalAmount = useMemo(() => {
    return particulars.reduce((sum, p) => sum + (Number(p.amountRaw) || 0), 0);
  }, [particulars]);

  const handleSetAccountLedger = useCallback((ledger: LedgerType) => {
    setAccountLedger(ledger);
  }, []);

  const handleAddParticularRow = useCallback(() => {
    setParticulars(prev => [...prev, { id: nextId(), ledger: null, ledgerBalance: "", amountRaw: "" }]);
  }, []);

  const handleUpdateParticularRow = useCallback(async (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => {
    setParticulars(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, ...updates };
    }));

    if (updates.ledger?.ledger_id) {
      const bal = await fetchParticularBalance(updates.ledger.ledger_id);
      setParticulars(prev => prev.map(p => {
        if (p.id !== id) return p;
        return { ...p, ledgerBalance: bal };
      }));
    }
  }, [fetchParticularBalance]);

  const handleFieldFocus = useCallback((field: ActiveField) => {
    setActiveField(field);
    setLedgerSearchTerm("");
  }, []);

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  const handleLedgerPanelSelect = useCallback((ledger: LedgerType) => {
    if (!activeField) return;
    if (activeField.type === 'account') {
      setAccountLedger(ledger);
    } else {
      handleUpdateParticularRow(activeField.rowId, { ledger });
    }
    setLedgerSearchTerm(ledger.name);
  }, [activeField, handleUpdateParticularRow]);

  const resetForm = useCallback(() => {
    setAccountLedger(null);
    setAccountBalance("");
    setParticulars([{ id: nextId(), ledger: null, ledgerBalance: "", amountRaw: "" }]);
    setNarration("");
    setError(null);
    setSuccess(null);
    setActiveField(null);
    setLedgerSearchTerm("");
    fetchNextNumber();
  }, [fetchNextNumber]);

  const validate = useCallback((): string | null => {
    if (!accountLedger) return "Account Name is required";
    const filledRows = particulars.filter(p => p.ledger && Number(p.amountRaw) > 0);
    if (filledRows.length === 0) return "No transactions entered";
    for (const row of filledRows) {
      if (row.ledger?.ledger_id === accountLedger.ledger_id) {
        return "Same ledger cannot be used in both Account and Particulars";
      }
    }
    if (totalAmount <= 0) return "Total amount must be greater than 0";
    return null;
  }, [accountLedger, particulars, totalAmount]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const filledRows = particulars.filter(p => p.ledger && Number(p.amountRaw) > 0);

      const entries = [
        {
          ledger_id: accountLedger!.ledger_id,
          ledger_name: accountLedger!.name,
          type: 'Dr' as const,
          amount: totalAmount,
          currency: 'INR',
        },
        ...filledRows.map(p => ({
          ledger_id: p.ledger!.ledger_id,
          ledger_name: p.ledger!.name,
          type: 'Cr' as const,
          amount: Number(p.amountRaw),
          currency: 'INR',
        })),
      ];

      const payload: any = {
        company_id: companyId!,
        fy_id: fyId!,
        voucher_type: voucherType,
        date,
        narration: narration || null,
        is_accounting_voucher: 1,
        entries,
      };

      const res = await window.api.voucher.create(payload);
      if (res.success) {
        const savedNumber = voucherNumber;

        setAccountLedger(null);
        setAccountBalance("");
        setParticulars([{ id: nextId(), ledger: null, ledgerBalance: "", amountRaw: "" }]);
        setNarration("");
        setError(null);
        setActiveField(null);
        setLedgerSearchTerm("");
        setIsSubmitting(false);

        await fetchNextNumber();

        setSuccess(`Voucher No. ${savedNumber} saved successfully`);
      } else {
        setIsSubmitting(false);
        setError(res.error || "Failed to save voucher");
      }
    } catch (e: any) {
      setIsSubmitting(false);
      setError(e.message || "Unexpected error");
    }
  }, [validate, particulars, accountLedger, totalAmount, companyId, fyId, voucherType, date, narration, fetchNextNumber]);

  const dateDisplay = useMemo(() => formatDateDisplay(date), [date]);

  return {
    voucherType,
    setVoucherType,
    voucherNumber,
    voucherNumberLoading,
    date,
    dateDisplay,
    accountLedger,
    accountBalance,
    handleSetAccountLedger,
    particulars,
    handleUpdateParticularRow,
    handleAddParticularRow,
    narration,
    setNarration,
    totalAmount,
    isSubmitting,
    error,
    setError,
    success,
    setSuccess,
    handleSubmit,
    resetForm,
    companyId,
    fyId,
    allLedgers,
    ledgersLoading,
    ledgerSearchTerm,
    setLedgerSearchTerm,
    activeField,
    handleFieldFocus,
    handleFieldBlur,
    handleLedgerPanelSelect,
  };
}
