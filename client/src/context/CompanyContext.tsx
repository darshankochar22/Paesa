import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CompanyType, FYType } from "../types/api";

interface CompanyContextValue {
  selectedCompany: CompanyType | null;
  setSelectedCompany: (c: CompanyType | null) => void;
  activeFY: FYType | null;
  setActiveFY: (fy: FYType | null) => void;
  availableFYs: FYType[];
  switchFY: (fy: FYType) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyType | null>(null);
  const [activeFY, setActiveFY] = useState<FYType | null>(null);
  const [availableFYs, setAvailableFYs] = useState<FYType[]>([]);
  const [checked, setChecked] = useState(false);

  const loadFYs = useCallback(async (company_id: number) => {
    try {
      const result = await window.api.fy.getAll(company_id);
      if (result.success) {
        setAvailableFYs(result.financialYears);
        const active = result.financialYears.find((f: FYType) => f.is_active === 1);
        setActiveFY(active ?? result.financialYears[0] ?? null);
      }
    } catch (err) {
      console.error(err);
      setActiveFY(null);
      setAvailableFYs([]);
    }
  }, []);

  const handleSetSelectedCompany = useCallback(async (company: CompanyType | null) => {
    setSelectedCompany(company);
    if (!company?.company_id) {
      setActiveFY(null);
      setAvailableFYs([]);
      return;
    }
    await loadFYs(company.company_id);
  }, [loadFYs]);

  const switchFY = useCallback(async (fy: FYType) => {
    if (!selectedCompany?.company_id || !fy.fy_id) return;
    try {
      await window.api.fy.setActive(fy.fy_id, selectedCompany.company_id);
      setActiveFY(fy);
      setAvailableFYs(prev =>
        prev.map(f => ({ ...f, is_active: f.fy_id === fy.fy_id ? 1 : 0 }))
      );
    } catch (err) {
      console.error('switchFY error:', err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    const handler = () => {
      if (selectedCompany?.company_id) {
        loadFYs(selectedCompany.company_id);
      }
    };
    window.addEventListener("fy-reload", handler);
    return () => window.removeEventListener("fy-reload", handler);
  }, [selectedCompany, loadFYs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.api.company.getAll();
        const companies: CompanyType[] = Array.isArray(result?.companies)
          ? result.companies
          : Array.isArray(result) ? result : [];
        if (cancelled) return;
        if (companies.length === 1) {
          await handleSetSelectedCompany(companies[0]);
        }
      } catch (err) {
        console.error('useEffect error:', err);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [handleSetSelectedCompany]);

  return (
    <CompanyContext value={{
      selectedCompany,
      setSelectedCompany: handleSetSelectedCompany,
      activeFY,
      setActiveFY,
      availableFYs,
      switchFY,
    }}>
      {checked ? children : null}
    </CompanyContext>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}