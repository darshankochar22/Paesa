import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuCard, { type OptionType } from '@/components/ui/Card';
import { useCompany } from '@/context/CompanyContext';
import { isFeatureEnabled } from '@/lib/companyFeatures';
import { exportElementToPdf } from '@/lib/exportDomPdf';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import GstPortalLoginDialog from '@/components/tally-ui/GstPortalLoginDialog';

// TallyPrime top-menu hotkeys: Alt+letter opens the menu (F1 for Help).
// Registered as deferred globals, so a screen that already uses the same
// combo (e.g. Alt+E export on reports) keeps winning there.
const MENU_HOTKEYS: Record<string, string> = {
  Company: 'Alt+K',
  Data: 'Alt+Y',
  Exchange: 'Alt+Z',
  Import: 'Alt+O',
  Export: 'Alt+E',
  Share: 'Alt+M',
  Print: 'Alt+P',
  Help: 'F1',
};

const HOTKEY_BADGES: Record<string, string> = Object.fromEntries(
  Object.entries(MENU_HOTKEYS).map(([name, combo]) => [name, combo.replace('Alt+', '')]),
);

export default function Navbar() {
  const { selectedCompany, setSelectedCompany, features } = useCompany();
  // F11 "Enable Payment Request to share payment link/QR code" gates the
  // Exchange → Payment Gateway link/QR action (Merchant Profile menu is gated elsewhere).
  const payQrEnabled = isFeatureEnabled(features, 'enable_payment_request_qr');
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState('');
  const [gstLoginOpen, setGstLoginOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const companyId = selectedCompany?.company_id;

  // Exchange → GST Login & Logout: opens the shared GSTN OTP session dialog (Tally's
  // Exchange menu is where portal login lives). Needs a selected company.
  const openGstLogin = () => {
    if (!companyId) {
      window.alert('Select a company first.');
      return;
    }
    setGstLoginOpen(true);
  };

  // Exchange → Refresh GST Status: extend the live OTP session (no re-OTP if valid).
  const refreshGstStatus = async () => {
    const r = await window.api.gstFiling.refreshToken();
    window.alert(
      r.success
        ? 'GSTN session refreshed.'
        : r.error || 'No active GSTN session — use GST Login first.',
    );
  };

  // Export → the voucher currently on screen, exactly as the frontend renders it.
  // If not viewing a voucher, go to the Voucher Register so the user can pick one.
  const exportCurrentVoucher = async () => {
    const el = document.getElementById('voucher-print-area');
    if (!el) {
      navigate('/transactions/voucher-list');
      return;
    }
    const res = await exportElementToPdf(el as HTMLElement, el.dataset.filename || 'voucher');
    if (!res.success && !res.canceled) window.alert(res.error || 'Failed to export PDF');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useShortcuts(
    Object.entries(MENU_HOTKEYS).map(([name, combo]) => ({
      keys: combo,
      handler: () => setOpenMenu((prev) => (prev === name ? '' : name)),
      defer: true,
      allowInInputs: true,
    })),
    { priority: PRIORITY.GLOBAL },
  );

  // Esc closes an open top menu before anything else reacts to it.
  useShortcuts([{ keys: 'Escape', handler: () => setOpenMenu(''), allowInInputs: true }], {
    priority: PRIORITY.POPUP,
    enabled: openMenu !== '',
  });

  const details = [
    {
      name: 'Company',
      options: [
        { label: 'Create', path: '/company/create' },
        { label: 'Alter', path: '/company/alter' },
        { label: 'Change', path: '/company' },
        { label: 'Select', action: () => setSelectedCompany(null) },
        { label: 'Shut', path: '/company' },
        { label: 'Online Access' },
        { label: 'Connect' },
        { label: 'Disconnect' },
        { label: 'Connectivity Status' },
        { label: 'Remote Access' },
        { label: 'Browser Access' },
        { label: 'Configure' },
        { label: 'Features', path: '/data/tallyFeatures' },
        { label: 'Security' },
        { label: 'Vault' },
      ] as OptionType[],
    },
    {
      name: 'Data',
      options: [
        { label: 'Company Data', path: '/data/company' },
        { label: 'Backup' },
        { label: 'Restore' },
        { label: 'Split' },
        { label: 'Troubleshooting' },
        { label: 'Repair' },
        { label: 'Migrate' },
        { label: 'All Exceptions' },
        { label: 'Configure' },
        { label: 'Data Path' },
      ] as OptionType[],
    },
    {
      name: 'Exchange',
      options: [
        { label: 'GST', heading: true },
        { label: 'GST Login & Logout', action: openGstLogin },
        { label: 'Send for e-Invoicing', path: '/compliance/einvoice' },
        { label: 'Send for e-Way Bill', path: '/compliance/eway' },
        { label: 'Upload GST Returns', path: '/compliance/filing' },
        { label: 'Download GST Returns', path: '/master/statutory/download-gst-returns' },
        { label: 'Refresh GST Status', action: refreshGstStatus },
        { label: 'File GSTR-1', path: '/master/statutory/gstr1' },
        ...(payQrEnabled
          ? ([
              { label: 'Payment Gateway', heading: true },
              {
                label: 'Generate Payment Link/QR Code',
                children: [{ label: 'Generate Payment Link' }, { label: 'Generate QR Code' }],
              },
            ] as OptionType[])
          : []),
        { label: 'Configure', heading: true },
        { label: 'Data Synchronisation' },
        { label: 'GST', path: '/data/gstRegistration' },
      ] as OptionType[],
    },
    {
      name: 'Go To',
      options: [
        { label: 'Gateway', path: '/' },
        { label: 'Chart of Accounts', path: '/master/coa' },
      ] as OptionType[],
    },
    {
      name: 'Import',
      options: [
        { label: 'From TallyPrime', path: '/import/tally' },
        { label: 'Company Data' },
        { label: 'Masters', path: '/master/create' },
        { label: 'Transactions', path: '/transactions/vouchers' },
        { label: 'Exceptions' },
        { label: 'Bank Details', path: '/data/banking' },
        { label: 'Bank Statement', path: '/data/banking' },
        { label: 'GST Returns' },
        { label: 'Manage' },
        { label: 'Configuration' },
      ] as OptionType[],
    },
    {
      name: 'Export',
      options: [
        { label: 'Voucher / Invoice (PDF)', action: exportCurrentVoucher },
        { label: 'Reports' },
        { label: 'Current' },
        { label: 'Others' },
        { label: 'GSTR-1 Return', path: '/master/statutory/gstr1' },
        { label: 'GST Returns' },
        { label: 'Company Data', path: '/data/company' },
        { label: 'Masters', path: '/data/group' },
        { label: 'Transactions', path: '/data/voucher' },
        { label: 'Configuration' },
      ] as OptionType[],
    },
    {
      name: 'Share',
      options: [
        { label: 'Email' },
        { label: 'Current' },
        { label: 'Others' },
        { label: 'Whatsapp' },
        { label: 'Current (WA)' },
        { label: 'Others (WA)' },
        { label: 'Manage' },
        { label: 'Inbox' },
        { label: 'Configuration' },
      ] as OptionType[],
    },
    {
      name: 'Print',
      options: [
        { label: 'Reports', path: '/data/report' },
        { label: 'Current', path: '/data/report' },
        { label: 'Others', path: '/data/report' },
        { label: 'Configuration' },
      ] as OptionType[],
    },
    {
      name: 'Capital',
      options: [
        { label: 'Loans' },
        { label: 'Banking', path: '/utilities/banking' },
      ] as OptionType[],
    },
    {
      name: 'Help',
      options: [
        { label: 'Help' },
        { label: "What's New" },
        { label: 'Upgrade' },
        { label: 'Shop' },
        { label: 'TroubleShooting' },
        { label: 'Settings' },
        { label: 'TDLs & AddOns' },
        { label: 'Plug-Ins' },
        { label: 'Profile' },
        { label: 'About' },
        { label: 'Explore More Products' },
        { label: 'Edge' },
        { label: 'Cloud Access' },
      ] as OptionType[],
    },
  ];

  return (
    <nav ref={navRef} className="flex items-center justify-between px-10 py-4 border-b relative">
      {details.map((section) => (
        <div key={section.name} className="relative">
          <button
            className="px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => setOpenMenu(openMenu === section.name ? '' : section.name)}
          >
            {HOTKEY_BADGES[section.name] && (
              <span className="text-zinc-400 font-semibold mr-1">
                {HOTKEY_BADGES[section.name]}:
              </span>
            )}
            {section.name}
          </button>

          {openMenu === section.name && (
            <MenuCard options={section.options} onItemClick={() => setOpenMenu('')} />
          )}
        </div>
      ))}

      {companyId && (
        <GstPortalLoginDialog
          open={gstLoginOpen}
          companyId={companyId}
          onClose={() => setGstLoginOpen(false)}
        />
      )}
    </nav>
  );
}
