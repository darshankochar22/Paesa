import { useState, useCallback, useMemo } from "react";
import { useCompany } from "../../../context/CompanyContext";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

export type VoucherType = "Receipt" | "Payment" | "Contra" | "Journal" | "Sales" | "Purchase";

export function useVoucherMeta() {
  const { selectedCompany, activeFY } = useCompany();

  const companyId = selectedCompany?.company_id ?? null;
  const fyId = activeFY?.fy_id ?? null;
  const persistKey = companyId ? `voucherForm_${companyId}` : null;

  const [voucherType, setVoucherType] = useState<VoucherType>("Receipt");
  const [voucherNumber, setVoucherNumber] = useState<string>("1");
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(true);
  const [date, setDate] = useState<string>(todayStr());
  const [status, setStatus] = useState<"Regular" | "Post-Dated">("Regular");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [referenceDate, setReferenceDate] = useState<string>(todayStr());
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("Select");

  const dateDisplay = useMemo(() => formatDateDisplay(date), [date]);

  const fetchNextNumber = useCallback(async () => {
    if (!companyId || !fyId) return;
    setVoucherNumberLoading(true);
    try {
      const res = await window.api.voucher.getNextNumber(companyId, fyId, voucherType);
      if (res.success && res.voucher_number) {
        setVoucherNumber(String(res.voucher_number));
      }
    } catch {
      // ignore
    } finally {
      setVoucherNumberLoading(false);
    }
  }, [companyId, fyId, voucherType]);

  const resetMeta = useCallback(() => {
    setDate(todayStr());
    setStatus("Regular");
    setSupplierInvoiceNo("");
    setSupplierInvoiceDate("");
    setNarration("");
    setReferenceNumber("");
    setReferenceDate(todayStr());
    setPlaceOfSupply("Select");
  }, []);

  return {
    // company context — exposed so sub-hooks can consume them
    companyId,
    fyId,
    persistKey,
    // voucher meta state
    voucherType,
    setVoucherType,
    voucherNumber,
    setVoucherNumber,
    voucherNumberLoading,
    date,
    setDate,
    dateDisplay,
    status,
    setStatus,
    supplierInvoiceNo,
    setSupplierInvoiceNo,
    supplierInvoiceDate,
    setSupplierInvoiceDate,
    narration,
    setNarration,
    referenceNumber,
    setReferenceNumber,
    referenceDate,
    setReferenceDate,
    placeOfSupply,
    setPlaceOfSupply,
    // actions
    fetchNextNumber,
    resetMeta,
  };
}