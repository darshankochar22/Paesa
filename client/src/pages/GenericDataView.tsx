import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";

export default function GenericDataView() {
  const { controller } = useParams();
  const { selectedCompany, activeFY } = useCompany();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        if (controller && (window as any).api[controller]?.getAll) {
          const companyId = selectedCompany?.company_id;
          const fyId = activeFY?.fy_id;
          let res: any;

          if (controller === "voucher") {
            res = await (window as any).api[controller].getAll(companyId, fyId);
          } else if (companyId) {
            res = await (window as any).api[controller].getAll(companyId);
          } else {
            res = await (window as any).api[controller].getAll();
          }
          setData(res || []);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [controller, selectedCompany, activeFY]);

  return (
    <div className="flex-1 px-10 py-8">
      <h1 className="text-2xl font-bold mb-4">{controller} Data</h1>
      {loading ? (
        <p>Loading...</p>
      ) : data.length === 0 ? (
        <p>No data or API not supported.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100 border-b">
                {Object.keys(data[0] || {}).slice(0, 6).map((key) => (
                  <th key={key} className="py-2 px-4 text-left">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b">
                  {Object.keys(data[0] || {}).slice(0, 6).map((key) => (
                    <td key={key} className="py-2 px-4">{String(row[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
