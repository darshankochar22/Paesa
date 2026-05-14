import { Link } from "react-router-dom";

const menuSections = [
  {
    label: "Reconciliation",
    items: ["Banking Activities", "Imported Bank Data"],
  },
  {
    label: "Cheque",
    items: ["Cheque Printing", "Cheque Register", "Post Dated Summary"],
  },
  {
    label: "Other Reports",
    items: ["Deposit Slip", "Payment Advice"],
  },
];

export default function Banking() {
  return (
    <div className="min-h-screen p-6">
      <Link to="/" className="flex items-center gap-1 text-sm mb-6">
        ← Back
      </Link>

      <h1 className="text-xl font-medium mb-6">Banking</h1>

      <div className="flex flex-col gap-6">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="text-xs uppercase tracking-widest mb-2">
              {section.label}
            </p>
            <div className="border rounded-lg divide-y">
              {section.items.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                >
                  <span className="text-sm">{item}</span>
                  <span className="text-sm">›</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="mt-6 w-full border rounded-lg py-3 text-sm">
        Quit
      </button>
    </div>
  );
}