import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { CompanyType, FYType } from '../types/api';
import type { TallyFeaturesType } from '../types/entities/TallyFeatures';

interface CompanyContextValue {
  selectedCompany: CompanyType | null;
  setSelectedCompany: (c: CompanyType | null) => void;
  activeFY: FYType | null;
  setActiveFY: (fy: FYType | null) => void;
  availableFYs: FYType[];
  switchFY: (fy: FYType) => Promise<void>;
  // Current company's F11 feature flags (null until loaded). Refetched on
  // company switch and whenever a "features-reload" window event fires
  // (dispatched by the F11 popup after save/reset).
  features: TallyFeaturesType | null;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyType | null>(null);
  const [activeFY, setActiveFY] = useState<FYType | null>(null);
  const [availableFYs, setAvailableFYs] = useState<FYType[]>([]);
  const [features, setFeatures] = useState<TallyFeaturesType | null>(null);
  const [checked, setChecked] = useState(false);

  const loadFeatures = useCallback(async (company_id: number) => {
    try {
      if (!window.api?.tallyFeatures) return;
      const res = await window.api.tallyFeatures.get(company_id);
      setFeatures(res?.success ? res.features : null);
    } catch (err) {
      console.error(err);
      setFeatures(null);
    }
  }, []);

  const loadFYs = useCallback(async (company_id: number) => {
    try {
      if (!window.api?.fy) return;
      const result = await window.api.fy.getAll(company_id);
      if (result.success) {
        setAvailableFYs(result.financialYears);
        const active = result.financialYears.find((f: FYType) => !!f.is_active);
        setActiveFY(active ?? result.financialYears[0] ?? null);
      }
    } catch (err) {
      console.error(err);
      setActiveFY(null);
      setAvailableFYs([]);
    }
  }, []);

  const handleSetSelectedCompany = useCallback(
    async (company: CompanyType | null) => {
      setSelectedCompany(company);
      if (!company?.company_id) {
        setActiveFY(null);
        setAvailableFYs([]);
        setFeatures(null);
        return;
      }
      await loadFYs(company.company_id);
      await loadFeatures(company.company_id);
    },
    [loadFYs, loadFeatures],
  );

  const switchFY = useCallback(
    async (fy: FYType) => {
      if (!selectedCompany?.company_id || !fy.fy_id) return;
      try {
        await window.api.fy.setActive(fy.fy_id, selectedCompany.company_id);
        setActiveFY(fy);
        setAvailableFYs((prev) =>
          prev.map((f) => ({ ...f, is_active: f.fy_id === fy.fy_id ? 1 : 0 })),
        );
      } catch (err) {
        console.error('switchFY error:', err);
      }
    },
    [selectedCompany],
  );

  useEffect(() => {
    const handler = () => {
      if (selectedCompany?.company_id) {
        loadFYs(selectedCompany.company_id);
      }
    };
    window.addEventListener('fy-reload', handler);
    return () => window.removeEventListener('fy-reload', handler);
  }, [selectedCompany, loadFYs]);

  useEffect(() => {
    const handler = () => {
      if (selectedCompany?.company_id) {
        loadFeatures(selectedCompany.company_id);
      }
    };
    window.addEventListener('features-reload', handler);
    return () => window.removeEventListener('features-reload', handler);
  }, [selectedCompany, loadFeatures]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // window.api is injected by preload; on first mount in dev it can be a tick late.
        for (let i = 0; i < 20 && !window.api?.company && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (cancelled || !window.api?.company) return;
        const result = await window.api.company.getAll();
        const companies: CompanyType[] = Array.isArray(result?.companies)
          ? result.companies
          : Array.isArray(result)
            ? result
            : [];
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
    return () => {
      cancelled = true;
    };
  }, [handleSetSelectedCompany]);

  return (
    <CompanyContext
      value={{
        selectedCompany,
        setSelectedCompany: handleSetSelectedCompany,
        activeFY,
        setActiveFY,
        availableFYs,
        switchFY,
        features,
      }}
    >
      {checked ? children : null}
    </CompanyContext>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}
