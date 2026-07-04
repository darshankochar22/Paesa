import { useEffect, useRef } from 'react';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';

export default function RightSidebar({
  voucherType,
  onTypeChange,
  voucherTypeChildren,
  subDropdownType,
  onSubDropdownToggle,
  status,
  onStatusChange,
  entryMode,
  onEntryModeChange,
  onDateClick,
  onCompanyTaxRegistrationClick,
  onCreateLedger,
  onAccept,
  onQuit,
  canAccept,
  onOtherVouchersClick,
}: {
  voucherType: string;
  onTypeChange: (t: string) => void;
  voucherTypeChildren: Record<string, string[]>;
  subDropdownType: string | null;
  onSubDropdownToggle: (type: string) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: 'single' | 'double';
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCompanyTaxRegistrationClick: () => void;
  onCreateLedger: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
  onOtherVouchersClick: () => void;
}) {
  const types = [
    { key: 'F4', label: 'Contra' },
    { key: 'F5', label: 'Payment' },
    { key: 'F6', label: 'Receipt' },
    { key: 'F7', label: 'Journal' },
    { key: 'F8', label: 'Sales' },
    { key: 'F9', label: 'Purchase' },
  ];

  const otherVoucherTypes = [
    'Attendance',
    'Credit Note',
    'Debit Note',
    'Delivery Note',
    'Job Work In Order',
    'Job Work Out Order',
    'Material In',
    'Material Out',
    'Manufacturing Journal',
    'Memorandum',
    'Payroll',
    'Physical Stock',
    'Purchase Order',
    'Receipt Note',
    'Rejection In',
    'Rejection Out',
    'Reversing Journal',
    'Sales Order',
    'Stock Journal',
  ];
  const isOtherActive = otherVoucherTypes.includes(voucherType);

  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!subDropdownType) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onSubDropdownToggle(subDropdownType);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [subDropdownType, onSubDropdownToggle]);

  return (
    <div ref={sidebarRef} className="w-36 border-l border-black flex flex-col shrink-0 bg-white">
      <div className="border-b border-black px-2 py-1">
        <Button
          variant="ghost"
          onClick={onDateClick}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline"
        >
          <span className="text-gray-500">F2</span>: Date
        </Button>
      </div>

      <div className="border-b border-black px-2 py-1">
        <Button
          variant="ghost"
          onClick={onCompanyTaxRegistrationClick}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline"
        >
          <span className="text-gray-500">F3</span>: Company/Tax Registration
        </Button>
      </div>

      {types.map(({ key, label }) => {
        const children = voucherTypeChildren[label];
        const hasChildren = children && children.length > 0;
        return (
          <div key={key} className="border-b border-gray-200 relative">
            <Button
              variant="ghost"
              onClick={() => {
                if (hasChildren) {
                  onSubDropdownToggle(label);
                } else {
                  if (subDropdownType) onSubDropdownToggle(subDropdownType);
                  onTypeChange(label);
                }
              }}
              className={cn(
                'w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal',
                voucherType === label || children?.includes(voucherType)
                  ? 'bg-black text-white font-semibold hover:bg-black hover:text-white'
                  : 'text-black hover:bg-gray-100',
              )}
            >
              <span
                className={
                  voucherType === label || children?.includes(voucherType)
                    ? 'text-gray-300'
                    : 'text-gray-500'
                }
              >
                {key}
              </span>
              : {label}
              {hasChildren && (
                <span className="ml-1 text-[9px] opacity-60">
                  {subDropdownType === label ? '▲' : '▼'}
                </span>
              )}
            </Button>
            {hasChildren && subDropdownType === label && (
              <div className="absolute left-0 right-0 top-full z-30 bg-white border border-zinc-300 shadow-lg rounded-b">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onTypeChange(label);
                    onSubDropdownToggle(label);
                  }}
                  className={cn(
                    'w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal',
                    voucherType === label
                      ? 'bg-black text-white font-semibold hover:bg-black hover:text-white'
                      : 'text-black hover:bg-gray-100',
                  )}
                >
                  {label}
                </Button>
                {children.map((child) => (
                  <Button
                    key={child}
                    variant="ghost"
                    onClick={() => {
                      onTypeChange(child);
                      onSubDropdownToggle(label);
                    }}
                    className={cn(
                      'w-full h-auto justify-start rounded-none pl-4 pr-2 py-1 text-xs font-normal',
                      voucherType === child
                        ? 'bg-black text-white font-semibold hover:bg-black hover:text-white'
                        : 'text-black hover:bg-gray-100',
                    )}
                  >
                    {child}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={onOtherVouchersClick}
          className={cn(
            'w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal',
            isOtherActive
              ? 'bg-black text-white font-semibold hover:bg-black hover:text-white'
              : 'text-black hover:bg-gray-100',
          )}
        >
          <span className={isOtherActive ? 'text-gray-300' : 'text-gray-500'}>F10</span>: Other
          Vouchers
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={onCreateLedger}
          className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">Alt+C</span>: Create Ldgr
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={onStatusChange}
          className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">T</span>: {status === 'Post-Dated' ? '✓ ' : ''}Post-Dated
        </Button>
      </div>

      {['Contra', 'Receipt', 'Journal', 'Payment'].includes(voucherType) && (
        <div className="border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={onEntryModeChange}
            className="w-full h-auto justify-start rounded-none px-2 py-1 text-xs font-normal text-black hover:bg-gray-100"
          >
            <span className="text-gray-500">H</span>: {entryMode === 'double' ? '✓ ' : ''}Double
            Entry
          </Button>
        </div>
      )}

      <div className="flex-1" />

      <div className="border-t border-black px-2 py-1">
        <Button
          variant="ghost"
          onClick={onAccept}
          disabled={!canAccept}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-100"
        >
          <span className="text-gray-500">A</span>: Accept
        </Button>
      </div>
      <div className="border-t border-gray-300 px-2 py-1">
        <Button
          variant="ghost"
          onClick={onQuit}
          className="w-full h-auto justify-start rounded-none p-0 text-xs font-normal text-black hover:bg-transparent hover:underline"
        >
          <span className="text-gray-500">Q</span>: Quit
        </Button>
      </div>
    </div>
  );
}
