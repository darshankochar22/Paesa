import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import { useCompany } from '@/context/CompanyContext';

// TallyPrime-style hotkey: a capital letter placed mid-word marks the hotkey
// ('Day BooK' → K, 'PosT-dated Summary' → T); labels without one use the first.
function hotkeyMatch(label: string): string {
  const mid = label.match(/\B[A-Z]/);
  if (mid) return mid[0];
  const first = label.match(/[A-Za-z]/);
  return first ? first[0] : '';
}

interface MenuItem {
  label: string;
  route: string;
}
interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Banking submenu — mirrors TallyPrime's Gateway → Banking menu.
const sections: MenuSection[] = [
  {
    title: 'CHEQUE',
    items: [
      { label: 'Cheque Printing', route: '/utilities/banking/cheque-printing' },
      { label: 'Cheque Register', route: '/utilities/banking/cheque-register' },
      { label: 'PosT-dated Summary', route: '/utilities/banking/post-dated-summary' },
    ],
  },
  {
    title: 'STATEMENTS',
    items: [
      { label: 'Deposit Slip', route: '/utilities/banking/deposit-slip' },
      { label: 'Payment Advice', route: '/utilities/banking/payment-advice' },
      { label: 'Bank Reconciliation', route: '/utilities/banking/reconciliation' },
    ],
  },
];

export default function BankingMenu() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [selected, setSelected] = useState(0);

  const flat = sections.flatMap((s) => s.items);

  const activate = (item: MenuItem | undefined) => item && navigate(item.route);

  useShortcuts(
    [
      { keys: 'ArrowDown', handler: () => setSelected((p) => (p + 1) % flat.length) },
      { keys: 'ArrowUp', handler: () => setSelected((p) => (p - 1 + flat.length) % flat.length) },
      {
        keys: 'Enter',
        handler: () => {
          const el = document.activeElement;
          if (el instanceof HTMLAnchorElement || el instanceof HTMLButtonElement) return false;
          activate(flat[selected]);
        },
      },
      { keys: 'Escape', handler: () => navigate('/') },
      ...Array.from(new Set(flat.map((it) => hotkeyMatch(it.label).toLowerCase()))).map((char) => ({
        keys: char,
        handler: () => activate(flat.find((it) => hotkeyMatch(it.label).toLowerCase() === char)),
      })),
    ],
    { priority: PRIORITY.SCREEN },
  );

  useEffect(() => setSelected(0), []);

  const flatIndexOf = (item: MenuItem) => flat.indexOf(item);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black">
      <aside className="w-96 mx-auto mt-10 bg-white border border-gray-200 shadow-sm flex flex-col px-10 py-8 gap-6">
        <div className="text-lg font-normal pb-1 border-b border-gray-200">
          Banking
          {selectedCompany?.name && (
            <div className="text-[11px] text-gray-500 mt-0.5">{selectedCompany.name}</div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-2">
              <div className="font-medium text-xs text-gray-500 uppercase tracking-wide">
                {section.title}
              </div>
              <div className="flex flex-col pl-4 gap-1">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    onMouseEnter={() => setSelected(flatIndexOf(item))}
                    className={`text-left px-2 py-1 text-sm transition-colors ${
                      flatIndexOf(item) === selected ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => navigate('/')}
            className="text-left px-2 py-1 hover:bg-gray-100 transition-colors text-gray-400 text-sm"
          >
            Quit (Esc)
          </button>
        </div>
      </aside>
    </div>
  );
}
