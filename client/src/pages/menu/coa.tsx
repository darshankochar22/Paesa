import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useEscapeBack } from '@/hooks/useEscape';

export default function COA() {
  const { selectedCompany } = useCompany();
  const [masterSections, setMasterSections] = useState<{ title: string; items: string[] }[]>([]);
  const navigate = useNavigate();
  useEscapeBack('/');

  useEffect(() => {
    const companyId = selectedCompany?.company_id;
    if (!companyId) return;
    async function fetchMenu() {
      try {
        const data = await window.api.master.getMenu(companyId);
        if (data && data.success) {
          setMasterSections(data.menu);
        }
      } catch (err) {
        console.error('Failed to fetch master menu:', err);
      }
    }
    fetchMenu();
  }, [selectedCompany]);

  const getRoute = (item: string) => {
    const map: Record<string, string> = {
      Ledger: '/master/coa/ledger',
      Group: '/master/coa/group',
      Currency: '/master/coa/currency',
      'Voucher Type': '/master/coa/voucher-type',
      'Cost Category': '/master/coa/cost-category',
      'Cost Centre': '/master/coa/cost-centre',
      Budget: '/master/coa/budget',
      Scenario: '/master/coa/scenario',
      'Stock Group': '/master/coa/stock-group',
      'Stock Category': '/master/coa/stock-category',
      'TDS Details': '/master/coa/tds-details',
      'TCS Details': '/master/coa/tcs-details',
      'VAT Registration Details': '/master/coa/vat-registration-details',
      'Excise Registration Details': '/master/coa/excise-registration-details',
      'PAN / CIN Details': '/master/coa/pan-cin-details',
      'Price levels': '/master/coa/price-levels',
      'Price list (Stock Group)': '/master/coa/price-lists',
      'Price list (Stock Category)': '/master/coa/price-lists',
      'Stock Items': '/master/coa/stock-group',
      Unit: '/master/coa/unit',
      Location: '/master/coa/godown',
      'GST Registration': '/master/coa/gst-registration',
      'GST Classification': '/master/coa/gst-classification',
      'Excise Duty Classification': '/master/coa/excise-duty-classification',
      'TCS Nature of Goods': '/master/coa/tcs-nature-of-goods',
      'Tax Units': '/master/coa/tax-units',
      'Employee Category': '/master/coa/employee-category',
      'Employee Group': '/master/coa/employee-group',
      Employee: '/master/coa/employee',
      'Attendance / Production type': '/master/coa/attendance-type',
      'Payroll Voucher Type': '/master/coa/payroll-voucher-type',
      'Pay Heads': '/master/coa/pay-head',
      'Units(work)': '/master/coa/payroll-unit',
      'Salary Structure': '/master/coa/salary-structure',
    };
    return map[item] ?? null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl border rounded p-8">
        <div className="flex items-start justify-between mb-12">
          <div className="text-2xl font-semibold">Chart of Accounts</div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-col items-end gap-2 mt-4">
              <div className="text-lg font-semibold">Company</div>
              <button className="rounded px-2 py-1 hover:bg-zinc-100 transition-colors">
                {selectedCompany?.name || 'Change Company'}
              </button>
              <button className="rounded px-2 py-1 hover:bg-zinc-100 transition-colors">
                Show More
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {masterSections.map((section) => (
            <div key={section.title} className="flex flex-col items-center gap-4">
              <div className="text-lg font-semibold">{section.title}</div>

              <div className="flex flex-col items-start w-full pl-8">
                {section.items.map((item) => {
                  const route = getRoute(item);
                  if (route) {
                    return (
                      <button
                        key={item}
                        onClick={() => navigate(route)}
                        className="text-left rounded px-2 py-1 w-full hover:bg-zinc-100 transition-colors"
                      >
                        {item}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={item}
                      disabled
                      className="text-left rounded px-2 py-1 w-full opacity-40 cursor-not-allowed"
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
