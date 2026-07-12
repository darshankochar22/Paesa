import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const BASE = '/reports/audit-security';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function AuditSecurity() {
  useEscapeBack();

  const sections = [
    {
      title: 'AUDIT MENU',
      items: items(['Audit & Compliance Menu', 'Audit Listing']),
    },
    {
      title: 'VOUCHER & LEDGER AUDIT',
      items: items(['Voucher Audit', 'Ledger Audit', 'Master Alteration Audit']),
    },
    {
      title: 'DELETED & ALTERED',
      items: items([
        'Deleted Masters Report',
        'Deleted Vouchers Report',
        'Altered Vouchers Report',
        'Altered Ledgers Report',
      ]),
    },
    {
      title: 'EDIT LOG',
      items: items(['Edit Log Report', 'Edit Log Voucher-wise', 'Edit Log Master-wise']),
    },
    {
      title: 'USER ACTIVITY & SECURITY',
      items: items([
        'User Activity Log',
        'Login/Logout Report',
        'Company Access Log',
        'Security Control Report',
        'User Rights Report',
        'Role Permission Report',
      ]),
    },
    {
      title: 'DATA MANAGEMENT',
      items: items([
        'Data Synchronisation Report',
        'Backup Status Report',
        'Restore History Report',
        'Data Import Log',
        'Data Export Log',
        'Remote Access Report',
      ]),
    },
    {
      title: 'CONNECTED SERVICES',
      items: items(['Connected Services Status', 'License/Subscription Status']),
    },
    {
      title: 'FEATURES REPORT',
      items: items([
        'Company Features Report',
        'Statutory Features Report',
        'Inventory Features Report',
        'Accounting Features Report',
      ]),
    },
    {
      title: 'EXCEPTIONS & HEALTH',
      items: items([
        'Exception Reports Summary',
        'Negative Cash Exception',
        'Duplicate Voucher Number Exception',
        'Missing Master Details Exception',
        'Data Health Check Report',
      ]),
    },
  ];

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
        <CardTitle className="text-base font-semibold">Audit, Edit Log, Security & Admin</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-black px-1">
              {section.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="xs"
                  className="justify-start text-[11px] font-normal px-2 h-7 text-black"
                >
                  <Link to={item.route}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
