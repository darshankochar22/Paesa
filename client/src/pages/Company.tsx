import { Link } from "react-router-dom";

export default function Company() {
  const companyActions = [
    "Create Company",
    "Alter Company",
    "Select Company",
    "Shut Company",
  ];

  const companies = [
    "ABC Pvt Ltd",
    "XYZ Traders",
    "Demo Company",
  ];

  return (
    <div className="flex min-h-[500px] w-full">
      <aside className="w-[35%] border-r flex flex-col px-6 py-6 gap-6">

        <div className="text-2xl font-semibold">
          Company
        </div>

        <div className="flex flex-col gap-2">

          {companyActions.map((item) => (
            <button
              key={item}
              className="text-left px-3 py-2 rounded"
            >
              {item}
            </button>
          ))}

        </div>
      </aside>

      <section className="flex-1 px-6 py-6">

        <div className="text-xl font-semibold mb-4">
          List of Companies
        </div>

        <div className="flex flex-col gap-2">

          {companies.map((company) => (
            <div
              key={company}
              className="px-4 py-3 rounded cursor-pointer"
            >
              {company}
            </div>
          ))}

        </div>
        <Link to="/">Back</Link>
      </section>
    </div>
  );
}