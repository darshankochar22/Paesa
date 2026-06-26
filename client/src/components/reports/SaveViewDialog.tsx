import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";

interface SaveViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export function SaveViewDialog({
  isOpen,
  onClose,
  onSave,
  defaultName = "",
}: SaveViewDialogProps) {
  const [viewName, setViewName] = React.useState(defaultName);

  React.useEffect(() => {
    if (isOpen) {
      setViewName(defaultName);
    }
  }, [isOpen, defaultName]);

  const handleSave = () => {
    if (viewName.trim()) {
      onSave(viewName.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-900 border border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 font-bold">Save Report View</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="view-name" className="text-xs font-semibold text-zinc-700">
              View Name
            </Label>
            <Input
              id="view-name"
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. Balance Sheet Q1 Detailed"
              className="text-xs h-9 border-zinc-300 focus:border-zinc-800 focus:ring-zinc-400 text-zinc-900"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
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
            disabled={!viewName.trim()}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
          >
            Save View (Ctrl+L)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
