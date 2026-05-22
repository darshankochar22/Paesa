import { useState, useEffect } from "react";
import type { PayHeadFormulaLineType, PayHeadType } from "@/types/entities/Payroll";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded";

interface Props {
  formulaLines: PayHeadFormulaLineType[];
  onAdd: (line: { function: string; pay_head_id_ref: number; operator: string }) => void;
  onDelete: (index: number) => void;
  companyId: number | undefined;
}

export default function FormulaBuilder({ formulaLines, onAdd, onDelete, companyId }: Props) {
  const [payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [selectedFunction, setSelectedFunction] = useState("Add");
  const [selectedPayHead, setSelectedPayHead] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState("+");

  useEffect(() => {
    if (!companyId) return;
    window.api.payHead.getAll(companyId).then((res) => {
      if (res.success) setPayHeads(res.payHeads);
    });
  }, [companyId]);

  const handleAdd = () => {
    if (!selectedPayHead) return;
    onAdd({
      function: selectedFunction,
      pay_head_id_ref: Number(selectedPayHead),
      operator: selectedOperator,
    });
    setSelectedPayHead("");
  };

  return (
    <div className="space-y-2">
      <div className="border border-zinc-200 rounded overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider grid grid-cols-12 gap-1">
          <span className="col-span-3">Function</span>
          <span className="col-span-6">Pay Head</span>
          <span className="col-span-2">Operator</span>
          <span className="col-span-1"></span>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {formulaLines.map((line, i) => {
            const ph = payHeads.find(p => p.pay_head_id === line.pay_head_id_ref);
            return (
              <div key={i} className="grid grid-cols-12 gap-1 px-1 py-0.5 border-b border-zinc-100 items-center text-sm">
                <span className="col-span-3 px-1 text-zinc-600">{line.function}</span>
                <span className="col-span-6 px-1 text-zinc-800">{ph?.name || line.pay_head_name || `ID:${line.pay_head_id_ref}`}</span>
                <span className="col-span-2 px-1 text-zinc-500">{line.operator}</span>
                <button onClick={() => onDelete(i)} className="col-span-1 text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
              </div>
            );
          })}
          {formulaLines.length === 0 && (
            <div className="text-xs text-zinc-400 text-center py-4">No formula lines added</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select className={`${inputCls} w-28`} value={selectedFunction} onChange={(e) => setSelectedFunction(e.target.value)}>
          <option value="Add">Add</option>
          <option value="Subtract">Subtract</option>
          <option value="Multiply">Multiply</option>
          <option value="Divide">Divide</option>
        </select>
        <select
          className={`${inputCls} flex-1`}
          value={selectedPayHead}
          onChange={(e) => setSelectedPayHead(e.target.value)}
        >
          <option value="">Select Pay Head</option>
          {payHeads.map(ph => (
            <option key={ph.pay_head_id} value={ph.pay_head_id}>{ph.name}</option>
          ))}
        </select>
        <select className={`${inputCls} w-16`} value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)}>
          <option value="+">+</option>
          <option value="-">-</option>
          <option value="*">*</option>
          <option value="/">/</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={!selectedPayHead}
          className="text-xs px-3 py-1 rounded bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
