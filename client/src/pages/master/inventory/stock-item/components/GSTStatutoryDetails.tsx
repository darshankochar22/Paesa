import type { FormData, PanelType } from "../types";

interface GSTStatutoryDetailsProps {
  form: FormData;
  setVal: (key: keyof FormData, value: any) => void;
  setActivePanel: (panel: PanelType) => void;
  gstClassifications: any[];
}

export default function GSTStatutoryDetails({
  form,
  setVal,
  setActivePanel,
  gstClassifications,
}: GSTStatutoryDetailsProps) {
  
  const selectedHsnClsName = gstClassifications.find(
    c => String(c.gc_id) === form.hsn_classification_id
  )?.name || "Select...";

  const selectedRateClsName = gstClassifications.find(
    c => String(c.gc_id) === form.rate_classification_id
  )?.name || "Select...";

  return (
    <div className="flex-1 min-w-0 px-6 pt-4 pb-2 overflow-y-auto flex flex-col gap-1.5 font-mono select-none">
      <div className="text-sm font-bold text-zinc-900 mb-2 font-sans">Statutory Details</div>

      {/* GST applicability */}
      <div
        className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
        onClick={() => setActivePanel("gst_applicable")}
      >
        <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-0">GST applicability</span>
        <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
        <div className="flex-1">
          <span className="text-xs text-zinc-950 font-bold">{form.gst_applicable}</span>
        </div>
      </div>

      {form.gst_applicable === "Applicable" ? (
        <>
          {/* HSN/SAC & Related Details Header */}
          <div className="text-xs font-bold text-zinc-900 mt-2 mb-0.5 font-sans pl-0">HSN/SAC & Related Details</div>

          {/* HSN/SAC Details */}
          <div
            className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
            onClick={() => setActivePanel("hsn_sac_details")}
          >
            <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-4">HSN/SAC Details</span>
            <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
            <div className="flex-1">
              <span className="text-xs text-zinc-955 font-bold">
                {form.hsn_sac_details === "as_per_company" && "As per Company/Stock Group"}
                {form.hsn_sac_details === "specify_here" && "Specify Details Here"}
                {form.hsn_sac_details === "use_classification" && "Use GST Classification"}
                {form.hsn_sac_details === "specify_in_voucher" && "Specify in Voucher"}
              </span>
            </div>
          </div>

          {/* HSN: Specify Details Here */}
          {form.hsn_sac_details === "specify_here" && (
            <>
              <div className="flex items-center min-h-[22px]">
                <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-8">HSN/SAC</span>
                <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
                <div className="flex-1">
                  <input
                    className="w-full bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 font-mono text-zinc-955"
                    value={form.hsn_sac}
                    onChange={e => setVal("hsn_sac", e.target.value)}
                    placeholder="Code"
                  />
                </div>
              </div>
              <div className="flex items-center min-h-[22px]">
                <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-8">Description</span>
                <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
                <div className="flex-1">
                  <input
                    className="w-full bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 font-mono text-zinc-955"
                    value={form.hsn_sac_description}
                    onChange={e => setVal("hsn_sac_description", e.target.value)}
                    placeholder="Description"
                  />
                </div>
              </div>
            </>
          )}

          {/* HSN: Use GST Classification */}
          {form.hsn_sac_details === "use_classification" && (
            <>
              <div
                className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
                onClick={() => setActivePanel("hsn_classification")}
              >
                <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-8">Classification</span>
                <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
                <div className="flex-1">
                  <span className="text-xs text-zinc-950 font-bold truncate">
                    {selectedHsnClsName}
                  </span>
                </div>
              </div>
              {(() => {
                const cls = gstClassifications.find(c => String(c.gc_id) === form.hsn_classification_id);
                return (
                  <>
                    <div className="flex items-center min-h-[22px]">
                      <span className="w-48 shrink-0 text-xs text-zinc-400 font-sans pl-8">HSN/SAC</span>
                      <span className="w-4 shrink-0 text-zinc-300 text-xs text-center">:</span>
                      <div className="flex-1 text-xs text-zinc-400">{cls?.hsn_sac_code || ""}</div>
                    </div>
                    <div className="flex items-center min-h-[22px]">
                      <span className="w-48 shrink-0 text-xs text-zinc-400 font-sans pl-8">Description</span>
                      <span className="w-4 shrink-0 text-zinc-300 text-xs text-center">:</span>
                      <div className="flex-1 text-xs text-zinc-400">{cls?.description || ""}</div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* GST Rate & Related Details Header */}
          <div className="text-xs font-bold text-zinc-900 mt-2 mb-0.5 font-sans pl-0">GST Rate & Related Details</div>

          {/* GST Rate Details */}
          <div
            className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
            onClick={() => setActivePanel("gst_rate_details")}
          >
            <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-4">GST Rate Details</span>
            <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
            <div className="flex-1">
              <span className="text-xs text-zinc-955 font-bold">
                {form.gst_rate_details === "as_per_company" && "As per Company/Stock Group"}
                {form.gst_rate_details === "specify_here" && "Specific Details Here"}
                {form.gst_rate_details === "use_classification" && "Use GST Classification"}
                {form.gst_rate_details === "specify_in_voucher" && "Specify in Voucher"}
              </span>
            </div>
          </div>

          {/* Rate: Specify Details Here */}
          {form.gst_rate_details === "specify_here" && (
            <>
              <div
                className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
                onClick={() => setActivePanel("taxability_type")}
              >
                <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-8">Taxability</span>
                <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
                <div className="flex-1">
                  <span className="text-xs text-zinc-950 font-bold">{form.taxability_type || "Select..."}</span>
                </div>
              </div>

              {form.taxability_type === "Taxable" && (
                <div className="flex items-center min-h-[22px]">
                  <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-8">GST Rate</span>
                  <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
                  <div className="flex-1 flex items-center">
                    <input
                      className="w-16 bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 text-right tabular-nums font-mono text-zinc-955"
                      type="number" min="0" max="100" step="0.01"
                      value={form.gst_rate}
                      onChange={e => setVal("gst_rate", e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-xs text-zinc-800 ml-1 font-sans">%</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Rate: Use GST Classification */}
          {form.gst_rate_details === "use_classification" && (
            <>
              <div
                className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
                onClick={() => setActivePanel("rate_classification")}
              >
                <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-8">Classification</span>
                <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
                <div className="flex-1">
                  <span className="text-xs text-zinc-950 font-bold truncate">
                    {selectedRateClsName}
                  </span>
                </div>
              </div>
              {(() => {
                const cls = gstClassifications.find(c => String(c.gc_id) === form.rate_classification_id);
                return (
                  <>
                    <div className="flex items-center min-h-[22px]">
                      <span className="w-48 shrink-0 text-xs text-zinc-400 font-sans pl-8">Taxability Type</span>
                      <span className="w-4 shrink-0 text-zinc-300 text-xs text-center">:</span>
                      <div className="flex-1 text-xs text-zinc-400">{cls?.taxability || ""}</div>
                    </div>
                    <div className="flex items-center min-h-[22px]">
                      <span className="w-48 shrink-0 text-xs text-zinc-400 font-sans pl-8">GST Rate</span>
                      <span className="w-4 shrink-0 text-zinc-300 text-xs text-center">:</span>
                      <div className="flex-1 text-xs text-zinc-400">{cls ? `${Number(cls.igst_rate)} %` : ""}</div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* Type of Supply */}
          <div
            className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
            onClick={() => setActivePanel("type_of_supply")}
          >
            <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-0">Type of Supply</span>
            <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
            <div className="flex-1">
              <span className="text-xs text-zinc-955 font-bold">{form.type_of_supply}</span>
            </div>
          </div>
        </>
      ) : null}

      {/* Rate of Duty */}
      <div className="flex items-center min-h-[22px]">
        <span className="w-48 shrink-0 text-xs text-zinc-700 font-sans pl-0">Rate of Duty (eg 5)</span>
        <span className="w-4 shrink-0 text-zinc-400 text-xs text-center">:</span>
        <div className="flex-1">
          <input
            className="w-16 bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 text-right tabular-nums font-mono text-zinc-955"
            type="number" min="0" max="100" step="0.01"
            value={form.rate_of_duty}
            onChange={e => setVal("rate_of_duty", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}
