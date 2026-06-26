import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { Label } from "@/components/shadcn/label";

export interface ReportContextConfig {
  showNarration: boolean;
  showPercentage: boolean;
  detailedFormat: boolean;
  excludeZeroBalances: boolean;
  valuationMethod: string;
  basisOfValues: string;
}

interface ReportContextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReportContextConfig;
  onSave: (newConfig: ReportContextConfig) => void;
}

export function ReportContextDialog({
  isOpen,
  onClose,
  config,
  onSave,
}: ReportContextDialogProps) {
  const [showNarration, setShowNarration] = React.useState(config.showNarration);
  const [showPercentage, setShowPercentage] = React.useState(config.showPercentage);
  const [detailedFormat, setDetailedFormat] = React.useState(config.detailedFormat);
  const [excludeZeroBalances, setExcludeZeroBalances] = React.useState(config.excludeZeroBalances);
  const [valuationMethod, setValuationMethod] = React.useState(config.valuationMethod);
  const [basisOfValues, setBasisOfValues] = React.useState(config.basisOfValues);

  React.useEffect(() => {
    if (isOpen) {
      setShowNarration(config.showNarration);
      setShowPercentage(config.showPercentage);
      setDetailedFormat(config.detailedFormat);
      setExcludeZeroBalances(config.excludeZeroBalances);
      setValuationMethod(config.valuationMethod);
      setBasisOfValues(config.basisOfValues);
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave({
      showNarration,
      showPercentage,
      detailedFormat,
      excludeZeroBalances,
      valuationMethod,
      basisOfValues,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-900 border border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 font-bold">Configuration (F4)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 text-xs">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-narration" className="font-medium text-zinc-700 cursor-pointer">
              Show Narrations
            </Label>
            <input
              id="show-narration"
              type="checkbox"
              checked={showNarration}
              onChange={(e) => setShowNarration(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-percentage" className="font-medium text-zinc-700 cursor-pointer">
              Show Percentage of Total
            </Label>
            <input
              id="show-percentage"
              type="checkbox"
              checked={showPercentage}
              onChange={(e) => setShowPercentage(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="detailed-format" className="font-medium text-zinc-700 cursor-pointer">
              Detailed Format (Expansion by default)
            </Label>
            <input
              id="detailed-format"
              type="checkbox"
              checked={detailedFormat}
              onChange={(e) => setDetailedFormat(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="exclude-zero" className="font-medium text-zinc-700 cursor-pointer">
              Exclude Zero Balance Accounts
            </Label>
            <input
              id="exclude-zero"
              type="checkbox"
              checked={excludeZeroBalances}
              onChange={(e) => setExcludeZeroBalances(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="val-method" className="font-medium text-zinc-700">
              Stock Valuation Method
            </Label>
            <select
              id="val-method"
              value={valuationMethod}
              onChange={(e) => setValuationMethod(e.target.value)}
              className="w-full text-xs h-9 px-2 rounded-md border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-400"
            >
              <option value="Average Price">Average Price</option>
              <option value="FIFO">FIFO (First In First Out)</option>
              <option value="LIFO">LIFO (Last In First Out)</option>
              <option value="Standard Cost">Standard Cost</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="basis-values" className="font-medium text-zinc-700">
              Basis of Values
            </Label>
            <select
              id="basis-values"
              value={basisOfValues}
              onChange={(e) => setBasisOfValues(e.target.value)}
              className="w-full text-xs h-9 px-2 rounded-md border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-400"
            >
              <option value="Accrual">Accrual (Normal)</option>
              <option value="Cash">Cash Basis</option>
            </select>
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
            onClick={handleSave}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
          >
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
