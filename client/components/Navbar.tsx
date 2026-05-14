import { useState } from "react";
import MenuCard from "../components/ui/Card";

export default function Navbar() {

  const details = [
    {
      name: "Company",
      options: [
        "Create ",
        "Alter ",
        "Change ",
        "Select ",
        "Shut ",
        "Online Access ",
        "Connect ",
        "Disconnect ",
        "Connectivity Status",
        "Remote Access",
        "Browser Access",
        "Configure",
        "Features",
        "Security",
        "Tally Vault",
        "Online Access",
      ],
    },
    {
      name: "Data",
      options: [
        "Company Data",
        "Backup",
        "Restore",
        "Split",
        "Troubleshooting",
        "Repair",
        "Migrate",
        "All Exceptions",
        "Configure",
        "Data Path",
      ],
    },
    {
      name: "Exchange",
      options: [
        "Get",
        "Send for e-Invoicing",
        "Send for e-Way Bill",
        "All GST Options",
        "Banking",
        "Send Payments",
        "Get Balance",
        "All Banking Options",
        "Configure"
      ],
    },
    {
      name: "Go To",
      options: [
        "Gateway of Tally",
        "Chart of Accounts",
      ],
    },
    {
      name: "Import",
      options: [
        "Company Data",
        "Masters",
        "Transactions",
        "Exceptions",
        "Bank Details",
        "Bank Statement",
        "GST Returns",
        "Manage",
        "Configuration"
      ],
    },
    {
      name: "Export",
      options: [
        "Reports",
        "Current",
        "Others",
        "GST Returns",
        "Company Data",
        "Masters",
        "Transactions",
        "Configuration"
      ],
    },
    {
      name: "Share",
      options: [
        "Email",
        "Current",
        "Others",
        "Whatsapp",
        "Current",
        "Others",
        "Manage",
        "Inbox",
        "Configuration",
      ],
    },
    {
      name: "Print",
      options: [
        "Reports",
        "Current",
        "Others",
        "Configuration"
      ],
    },
    {
      name: "Tally Capital",
      options: [
        "Loans",
        "Banking",
      ],
    },
    {
      name: "Help",
      options: [
        "TallyHelp",
        "What's New",
        "Upgrade",
        "Tally Shop",
        "TroubleShooting",
        "Settings",
        "TDLs & AddOns",
        "Tally Plug-Ins",
        "Profile",
        "About",
        "Explore More Products",
        "TallyEdge",
        "TallyPrime Cloud Acess"
      ],
    },
  ];

  const [openMenu, setOpenMenu] = useState("");

  return (
    <nav className="flex items-center justify-between px-10 py-4 border-b relative">

      {details.map((section) => (
        <div
          key={section.name}
          className="relative"
        >

          <button
            className="px-2 py-1"
            onClick={() =>
              setOpenMenu(
                openMenu === section.name
                  ? ""
                  : section.name
              )
            }
          >
            {section.name}
          </button>

          {openMenu === section.name && (
            <MenuCard
              options={section.options}
            />
          )}
        </div>
      ))}

    </nav>
  );
}