import { FormRow, PageTitleBar } from "@/components/ui";
import { useCompany } from "@/context/CompanyContext";
const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function TaxCreate() {
  const { selectedCompany } = useCompany();
return(
   <div>
  <PageTitleBar title="Tax Units" subtitle={selectedCompany?.name} />
  
        <div className="flex-1 flex min-h-0 overflow-x-auto">
          <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
            <div className="p-3 space-y-1">
              <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
                <input autoFocus className={inputCls} value={""}  />
              </FormRow>
              <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={""}  />
              </FormRow>
            </div>
            </div>
            </div>
   </div>
  );
}