import { useCallback, useEffect, useState } from "react";
import type { TCSNatureOfGoodsType } from "@/types/entities/TCSNatureOfGoods";

interface UseTcsNatureOfGoodsResult {
  items: TCSNatureOfGoodsType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches active TCS Nature of Goods records for a company via the
 * preload bridge (window.api.tcsNatureOfGoods.getAll), mirroring
 * useTdsNatureOfPayments.
 */
export function useTcsNatureOfGoods(
  companyId: number | null | undefined
): UseTcsNatureOfGoodsResult {
  const [items, setItems] = useState<TCSNatureOfGoodsType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!companyId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.tcsNatureOfGoods.getAll(companyId);
      if (res?.success) {
        setItems(res.tcsNatureOfGoodsList ?? []);
      } else {
        setError(res?.error || "Failed to load Nature of Goods list");
        setItems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}
