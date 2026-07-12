import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';

interface SaveViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export function SaveViewDialog({ isOpen, onClose, onSave, defaultName = '' }: SaveViewDialogProps) {
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
      <DialogContent className="sm:max-w-md bg-white text-black border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-black font-bold">Save Report View</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="view-name" className="text-xs font-semibold text-black">
              View Name
            </Label>
            <Input
              id="view-name"
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. Balance Sheet Q1 Detailed"
              className="text-xs h-9 border-gray-200 focus:border-gray-200 focus:ring-black text-black"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 bg-white border-t border-gray-200 p-3 -mx-4 -mb-4 rounded-b-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-gray-200 hover:bg-black/[0.03] text-black"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!viewName.trim()}
            className="text-xs bg-black hover:bg-black/80 text-white font-semibold"
          >
            Save View (Ctrl+L)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
