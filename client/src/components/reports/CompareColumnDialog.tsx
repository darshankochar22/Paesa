import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import type { CompanyType } from "@/types/api";

interface CompareColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: { companyId: number; companyName: string; fromDate: string; toDate: string }) => void;
  companies: CompanyType[];
  currentCompanyId?: number;
  defaultFromDate?: string;
  defaultToDate?: string;
}

export function CompareColumnDialog({
  isOpen,
  onClose,
  onAdd,
  companies,
  currentCompanyId,
  defaultFromDate = "",
  defaultToDate = "",
}: CompareColumnDialogProps) {
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<number>(currentCompanyId || 0);
  const [fromDate, setFromDate] = React.useState(defaultFromDate);
  const [toDate, setToDate] = React.useState(defaultToDate);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedCompanyId(currentCompanyId || (companies[0]?.company_id || 0));
      setFromDate(defaultFromDate);
      setToDate(defaultToDate);
    }
  }, [isOpen, currentCompanyId, companies, defaultFromDate, defaultToDate]);

  const handleAdd = () => {
    const comp = companies.find((c) => c.company_id === Number(selectedCompanyId));
    if (comp) {
      onAdd({
        companyId: comp.company_id,
        companyName: comp.name,
        fromDate,
        toDate,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-900 border border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 font-bold">New Column (Alt+C)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="compare-company" className="text-xs font-semibold text-zinc-700">
              Company
            </Label>
            <select
              id="compare-company"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
              className="w-full text-xs h-9 px-2 rounded-md border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-400"
            >
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="compare-from" className="text-xs font-semibold text-zinc-700">
                From Date
              </Label>
              <Input
                id="compare-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs h-9 border-zinc-300 focus:border-zinc-800 focus:ring-zinc-400 text-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="compare-to" className="text-xs font-semibold text-zinc-700">
                To Date
              </Label>
              <Input
                id="compare-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs h-9 border-zinc-300 focus:border-zinc-800 focus:ring-zinc-400 text-zinc-900"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 bg-zinc-50 border-t border-zinc-100 p-3 -mx-4 -mb-4 rounded-b-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-zinc-300 hover:bg-zinc-100 text-zinc-700"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
          >
            Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
