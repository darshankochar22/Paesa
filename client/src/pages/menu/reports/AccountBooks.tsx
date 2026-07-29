import { useNavigate, Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { useMenuHotkeys, type MenuHotkeyItem } from '@/hooks/useMenuHotkeys';
import { MenuHotkeyLabel } from '@/components/blocks/MenuHotkeyLabel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { cn } from '@/lib/utils';

export default function AccountBooks() {
  useEscapeBack();
  const navigate = useNavigate();

  const sections: { title: string; items: MenuHotkeyItem[] }[] = [
    // Hotkey letters are the mid-word capital (Tally convention, as in Gateway's
    // "Day BooK"). They must be DISTINCT across the whole menu or two items fight
    // over one key — hence BooK / VoucHers / PayMent / CredIt below.
    {
      title: 'SUMMARY',
      items: [
        { label: 'Cash/Bank BooK(s)', route: '/reports/accounts/cash-bank' },
        { label: 'Ledger', route: '/reports/accounts/ledger-select' },
        { label: 'Group Summary', route: '/reports/accounts/group-select' },
        { label: 'Group VoucHers', route: '/reports/accounts/group-vouchers-select' },
      ],
    },
    {
      title: 'REGISTERS',
      items: [
        { label: 'Contra Register', route: '/reports/accounts/contra-register' },
        { label: 'PayMent Register', route: '/reports/accounts/payment-register' },
        { label: 'Receipt Register', route: '/reports/accounts/receipt-register' },
        { label: 'Sales Register', route: '/reports/accounts/sales-register' },
        { label: 'Purchase Register', route: '/reports/accounts/purchase-register' },
        { label: 'Journal Register', route: '/reports/accounts/journal-register' },
        { label: 'Debit Note Register', route: '/reports/accounts/debit-note-register' },
        { label: 'CredIt Note Register', route: '/reports/accounts/credit-note-register' },
        { label: 'Voucher Clarification', route: '/reports/accounts/voucher-clarification' },
      ],
    },
  ];

  // Flat list in visual order — the hook walks it for arrows and letter hotkeys.
  const flat = sections.flatMap((s) => s.items);
  const { selected, setSelected, activate } = useMenuHotkeys(flat, {
    onBack: () => navigate(-1),
  });

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-black flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-black">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-black">
            Display More Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Account Books</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-black px-1">
              {section.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => {
                const idx = flat.indexOf(item);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => activate(item)}
                    className={cn(
                      'text-left text-[11px] font-normal px-2 h-7 rounded-sm text-black',
                      idx === selected ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]',
                    )}
                  >
                    <MenuHotkeyLabel label={item.label} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
