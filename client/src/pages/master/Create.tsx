import { Link } from "react-router-dom";

export default function Create() {

  const accountingMasters = [
    "Group",
    "Ledger",
    "Currency",
    "Voucher Type",
  ];

  const inventoryMasters = [
    "Stock Group",
    "Stock Category",
    "Stock Items",
    "Unit",
    "Location",
  ];

  const statutoryMasters = [
    "GST Registration",
    "GST Classification",
    "Statutory Details",
    "Company GST Details",
    "PAN / CIN Details",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl border rounded p-8">

        <div className="flex items-start justify-between mb-12">
          <div className="text-2xl font-semibold">
            List of Masters
          </div>

          <div className="flex flex-col items-end gap-3">

            <Link
              to="/"
              className="rounded px-2 py-1"
            >
              Back
            </Link>

            <div className="flex flex-col items-end gap-2 mt-4">
              <div className="text-lg font-semibold">
                Company
              </div>

              <button className="rounded px-2 py-1">
                Change Company
              </button>

              <button className="rounded px-2 py-1">
                Show More
              </button>

            </div>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          <div className="flex flex-col items-center gap-4">
            <div className="text-lg font-semibold">
              Accounting Masters
            </div>

            <div className="flex flex-col items-start w-full pl-8">

              {accountingMasters.map((item) => (
                <button
                  key={item}
                  className="text-left rounded px-2 py-1"
                >
                  {item}
                </button>
              ))}

            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="text-lg font-semibold">
              Inventory Masters
            </div>

            <div className="flex flex-col items-start w-full pl-8">

              {inventoryMasters.map((item) => (
                <button
                  key={item}
                  className="text-left rounded px-2 py-1"
                >
                  {item}
                </button>
              ))}

            </div>

          </div>

          <div className="flex flex-col items-center gap-4">

            <div className="text-lg font-semibold">
              Statutory Masters
            </div>

            <div className="flex flex-col items-start w-full pl-8">

              {statutoryMasters.map((item) => (
                <button
                  key={item}
                  className="text-left rounded px-2 py-1"
                >
                  {item}
                </button>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}