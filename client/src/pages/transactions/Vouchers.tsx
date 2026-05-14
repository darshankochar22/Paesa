import { Link } from "react-router-dom";
import RightPanel from "../../../components/RightPanel.tsx";

export default function Vouchers() {
  const ledgerAccounts = [
    "Arum Mobile",
    "Bombay Shaving Company",
    "Chintu Dry clean",
    "Daddy Eats",
    "Elephemt Care & Nutrition",
    "Foregin Investors Group",
    "Gray Scale Images",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-6xl border border-gray-500 bg-white p-8">
        <div className="flex items-start justify-between mb-16">

          <div className="flex flex-col gap-4">
            <div className="text-4xl font-bold">
              Transactions
            </div>

            <div className="w-[450px]" />
          </div>

          <div className="flex flex-col items-start gap-4">

            <div className="text-4xl font-bold">
              List of Ledger Accounts
            </div>

            <div className="w-[520px]" />

          </div>
        </div>

        <div className="grid grid-cols-2 gap-20">

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">

              <div className="text-xl font-semibold">
                Vouchers
              </div>
              <div className="flex flex-col gap-2 pl-6">
                Party A/c Name
              </div>
              <div className="flex flex-col gap-2 pl-6">
                Current Balance
              </div>
              <div className="flex flex-col gap-2 pl-6">
                Sales Ledger
              </div>
              <div className="flex flex-col gap-2 pl-6">
                Current Balance
              </div>              
            </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">

              <div className="text-xl font-semibold">
                Name of Items
              </div>

              <div className="flex flex-col gap-2 pl-6">
                CGST@ 6%
              </div>
              <div className="flex flex-col gap-2 pl-6">
                SGST@ 6%
              </div>
              <div className="flex flex-col gap-2 pl-6">
                IGST@ 6%
              </div>
              <div className="flex flex-col gap-2 pl-6">
                CGST 9%
              </div> 
              <div className="flex flex-col gap-2 pl-6">
                Output CGST@ 2.5%
              </div>
              <div className="flex flex-col gap-2 pl-6">
                Output SGST@ 2.5%
              </div>    
              <div className="flex flex-col gap-2 pl-6">
                Output IGST@ 12%
              </div>
               <div className="flex flex-col gap-2 pl-6">
                Output IGST@ 5%
              </div>                                                   
            </div>
          </div>
        </div>  

        <div className="flex flex-col gap-4 pt-2">

            {ledgerAccounts.map((ledger) => (
              <div
                key={ledger}
                className="flex flex-col gap-3"
              >

                <div className="text-lg">
                  {ledger}
                </div>
                <div className="w-full" />
              </div>
            ))}

          </div>
        </div>
        <div className="flex justify-end mt-16">

          <Link
            to="/"
            className="px-4 py-2"
          >
            Back
          </Link>

        </div>
      </div>
       <div className = "h-200 p-10">
        <RightPanel />
      </div>
    </div>
  );
}