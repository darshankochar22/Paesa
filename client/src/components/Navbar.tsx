import { useState, useEffect, useRef } from "react";
import MenuCard, { type OptionType } from "@/components/ui/Card";
import { useCompany } from "@/context/CompanyContext";

export default function Navbar() {
  const { setSelectedCompany } = useCompany();
  const [openMenu, setOpenMenu] = useState("");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const details = [
    {
      name: "Company",
      options: [
        { label: "Create", path: "/company/create" },
        { label: "Alter", path: "/company/alter" },
        { label: "Change", path: "/company" },
        { label: "Select", action: () => setSelectedCompany(null) },
        { label: "Shut", path: "/company" },
        { label: "Online Access" },
        { label: "Connect" },
        { label: "Disconnect" },
        { label: "Connectivity Status" },
        { label: "Remote Access" },
        { label: "Browser Access" },
        { label: "Configure" },
        { label: "Features", path: "/data/tallyFeatures" },
        { label: "Security" },
        { label: "Tally Vault" },
      ] as OptionType[],
    },
    {
      name: "Data",
      options: [
        { label: "Company Data", path: "/data/company" },
        { label: "Backup" },
        { label: "Restore" },
        { label: "Split" },
        { label: "Troubleshooting" },
        { label: "Repair" },
        { label: "Migrate" },
        { label: "All Exceptions" },
        { label: "Configure" },
        { label: "Data Path" },
      ] as OptionType[],
    },
    {
      name: "Exchange",
      options: [
        { label: "Get" },
        { label: "Send for e-Invoicing" },
        { label: "Send for e-Way Bill" },
        { label: "GSTR-1 Return", path: "/master/statutory/gstr1" },
        { label: "All GST Options", path: "/data/gstRegistration" },
        { label: "Banking", path: "/utilities/banking" },
        { label: "Send Payments" },
        { label: "Get Balance" },
        { label: "All Banking Options", path: "/data/banking" },
        { label: "Configure" },
      ] as OptionType[],
    },
    {
      name: "Go To",
      options: [
        { label: "Gateway of Tally", path: "/" },
        { label: "Chart of Accounts", path: "/master/coa" },
      ] as OptionType[],
    },
    {
      name: "Import",
      options: [
        { label: "Company Data" },
        { label: "Masters", path: "/master/create" },
        { label: "Transactions", path: "/transactions/vouchers" },
        { label: "Exceptions" },
        { label: "Bank Details", path: "/data/banking" },
        { label: "Bank Statement", path: "/data/banking" },
        { label: "GST Returns" },
        { label: "Manage" },
        { label: "Configuration" },
      ] as OptionType[],
    },
    {
      name: "Export",
      options: [
        { label: "Reports" },
        { label: "Current" },
        { label: "Others" },
        { label: "GSTR-1 Return", path: "/master/statutory/gstr1" },
        { label: "GST Returns" },
        { label: "Company Data", path: "/data/company" },
        { label: "Masters", path: "/data/group" },
        { label: "Transactions", path: "/data/voucher" },
        { label: "Configuration" },
      ] as OptionType[],
    },
    {
      name: "Share",
      options: [
        { label: "Email" },
        { label: "Current" },
        { label: "Others" },
        { label: "Whatsapp" },
        { label: "Current (WA)" },
        { label: "Others (WA)" },
        { label: "Manage" },
        { label: "Inbox" },
        { label: "Configuration" },
      ] as OptionType[],
    },
    {
      name: "Print",
      options: [
        { label: "Reports", path: "/data/report" },
        { label: "Current", path: "/data/report" },
        { label: "Others", path: "/data/report" },
        { label: "Configuration" },
      ] as OptionType[],
    },
    {
      name: "Tally Capital",
      options: [
        { label: "Loans" },
        { label: "Banking", path: "/utilities/banking" },
      ] as OptionType[],
    },
    {
      name: "Help",
      options: [
        { label: "TallyHelp" },
        { label: "What's New" },
        { label: "Upgrade" },
        { label: "Tally Shop" },
        { label: "TroubleShooting" },
        { label: "Settings" },
        { label: "TDLs & AddOns" },
        { label: "Tally Plug-Ins" },
        { label: "Profile" },
        { label: "About" },
        { label: "Explore More Products" },
        { label: "TallyEdge" },
        { label: "TallyPrime Cloud Access" },
      ] as OptionType[],
    },
  ];

  return (
    <nav ref={navRef} className="flex items-center justify-between px-10 py-4 border-b relative">
      {details.map((section) => (
        <div key={section.name} className="relative">
          <button
            className="px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => setOpenMenu(openMenu === section.name ? "" : section.name)}
          >
            {section.name}
          </button>

          {openMenu === section.name && (
            <MenuCard
              options={section.options}
              onItemClick={() => setOpenMenu("")}
            />
          )}
        </div>
      ))}
    </nav>
  );
}