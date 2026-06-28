import { useEffect, useRef } from "react";

export const UQC_LIST = [
  "Not Applicable",
  "BAG-BAGS",
  "BALE-BALE",
  "BDL-BUNDLES",
  "BKL-BUCKLES",
  "BOU-BILLION OF UNITS",
  "BOX-BOX",
  "BTL-BOTTLES",
  "BUN-BUNCHES",
  "CAN-CANS",
  "CBM-CUBIC METERS",
  "CCM-CUBIC CENTIMETERS",
  "CMS-CENTIMETERS",
  "CTN-CARTONS",
  "DOZ-DOZENS",
  "DRM-DRUMS",
  "GGK-GREAT GROSS",
  "GMS-GRAMMES",
  "GRS-GROSS",
  "GYD-GROSS YARDS",
  "KGS-KILOGRAMS",
  "KLR-KILOLITRE",
  "KME-KILOMETRE",
  "LTR-LITRES",
  "MLT-MILILITRE",
  "MTR-METERS",
  "MTS-METRIC TON",
  "NOS-NUMBERS",
  "OTH-OTHERS",
  "PAC-PACKS",
  "PCS-PIECES",
  "PRS-PAIRS",
  "QTL-QUINTAL",
  "ROL-ROLLS",
  "SET-SETS",
  "SQF-SQUARE FEET",
  "SQM-SQUARE METERS",
  "SQY-SQUARE YARDS",
  "TBS-TABLETS",
  "TGM-TEN GROSS",
  "THD-THOUSANDS",
  "TON-TONNES",
  "TUB-TUBES",
  "UGS-US GALLONS",
  "UNT-UNITS",
  "YDS-YARDS",
];

export function UqcPopup({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 bg-white border border-zinc-300 shadow-xl"
      style={{ minWidth: 220, maxHeight: 320, display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 flex justify-between items-center shrink-0">
        <span>List of UQCs</span>
        <span className="text-zinc-300 font-normal cursor-pointer hover:text-white" onClick={onClose}>
          New UQC
        </span>
      </div>
      {/* List */}
      <div className="overflow-y-auto flex-1">
        {UQC_LIST.map((uqc) => (
          <div
            key={uqc}
            className={[
              "px-3 py-0.5 text-sm cursor-pointer border-b border-zinc-50 select-none",
              selected === uqc || (uqc === "Not Applicable" && !selected)
                ? "bg-amber-400 text-zinc-900 font-semibold"
                : "hover:bg-zinc-100 text-zinc-800",
            ].join(" ")}
            onMouseDown={(e) => { e.preventDefault(); onSelect(uqc); }}
          >
            {uqc === "Not Applicable" ? `◆ ${uqc}` : uqc}
          </div>
        ))}
      </div>
    </div>
  );
}
