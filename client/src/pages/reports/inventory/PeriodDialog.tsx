import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';

/**
 * Shared F2 Period picker for inventory summaries (Stock Summary / Stock Group
 * Summary). Selecting a narrower period carries the prior period's closing into
 * Opening and shows only that period's Inwards/Outwards, exactly like
 * TallyPrime. "Full Year" resets to the financial-year bounds.
 */
export default function PeriodDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromDate: string;
  toDate: string;
  minDate?: string;
  maxDate?: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onFullYear: () => void;
}) {
  const { open, onOpenChange, fromDate, toDate, minDate, maxDate } = props;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md bg-white text-black border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-black font-bold">Select Period (F2)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-black">From Date</label>
            <Input
              type="date"
              value={fromDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => props.onFromChange(e.target.value)}
              className="text-xs h-9 border-gray-200 focus:border-gray-200 focus:ring-black text-black"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-black">To Date</label>
            <Input
              type="date"
              value={toDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => props.onToChange(e.target.value)}
              className="text-xs h-9 border-gray-200 focus:border-gray-200 focus:ring-black text-black"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 bg-white border-t border-gray-200 p-3 -mx-4 -mb-4 rounded-b-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={props.onFullYear}
            className="text-xs border-gray-200 hover:bg-black/[0.03] text-black"
          >
            Full Year
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs bg-black hover:bg-black/80 text-white font-semibold"
          >
            Set Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
