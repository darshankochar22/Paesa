import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuCard, { type OptionType } from '@/components/ui/Card';
import { useCompany } from '@/context/CompanyContext';
import { exportElementToPdf } from '@/lib/exportDomPdf';
import GstPortalLoginDialog from '@/components/tally-ui/GstPortalLoginDialog';

export default function Navbar() {
  const { selectedCompany, setSelectedCompany } = useCompany();
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
        { label: 'Payment Gateway', heading: true },
        {
          label: 'Generate Payment Link/QR Code',
          children: [{ label: 'Generate Payment Link' }, { label: 'Generate QR Code' }],
        },
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
