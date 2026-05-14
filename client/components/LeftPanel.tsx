import { useEffect, useState } from "react";

export default function LeftPanel() {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      );
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded h-full px-4 py-3 flex flex-col gap-4 w-full">

      <div className="flex flex-row justify-between gap-6">
        <div className="flex flex-col">
          <span className="text-sm">CURRENT PERIOD</span>
          <span>1-Apr-2025 to 31-Mar-2026</span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-sm">CURRENT DATE</span>
          <span>{currentTime}</span>
        </div>
      </div>

      <div className="flex flex-row justify-between gap-6">
        <div className="flex flex-col">
          <span className="text-sm">NAME OF COMPANY</span>
          <span>ABC Pvt Ltd</span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-sm">DATE OF LAST ENTRY</span>
          <span>{currentTime}</span>
        </div>
      </div>

    </div>
  );
}