import { useState, useRef } from "react";
import type { BomEntry } from "../components/BomComponentsModal";
import type { FormData } from "../types";

export function useStockItemBom(
  updateFormFields: (updater: (prev: FormData) => Partial<FormData>) => void
) {
  const [boms, setBoms] = useState<BomEntry[]>([]);
  const [showBomList, setShowBomList] = useState(false);
  const [showBomComponents, setShowBomComponents] = useState(false);
  const [currentBomName, setCurrentBomName] = useState("");
  const savePendingRef = useRef(false);

  const handleBomToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yes = e.target.value === "Yes";
    updateFormFields(f => ({
      has_bom: yes,
      bom_name: yes ? f.bom_name : ""
    }));
    if (!yes) {
      setBoms([]);
    } else {
      setShowBomList(true);
    }
  };

  const handleBomSelect = (name: string) => {
    setCurrentBomName(name);
    setShowBomList(false);
    setShowBomComponents(true);
  };

  const handleBomAccept = (entry: BomEntry, executeSave: (updated: BomEntry[]) => void) => {
    setBoms(prev => {
      const updated = [...prev, entry];
      if (savePendingRef.current) {
        executeSave(updated);
        savePendingRef.current = false;
      }
      return updated;
    });
    updateFormFields(f => ({
      bom_name: f.bom_name || entry.bomName
    }));
    setShowBomComponents(false);
  };

  const handleBomListClose = () => {
    setShowBomList(false);
    savePendingRef.current = false;
  };

  const handleBomComponentsClose = () => {
    setShowBomComponents(false);
    savePendingRef.current = false;
  };

  return {
    boms,
    setBoms,
    showBomList,
    setShowBomList,
    showBomComponents,
    setShowBomComponents,
    currentBomName,
    setCurrentBomName,
    savePendingRef,
    handleBomToggle,
    handleBomSelect,
    handleBomAccept,
    handleBomListClose,
    handleBomComponentsClose,
  };
}
