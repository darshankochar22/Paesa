import Gateway from "@/pages/menu/Gateway.tsx";
import RightPanel from "@/components/RightPanel.tsx";
import LeftPanel from "@/components/LeftPanel.tsx";

export default function App() {
  return (
    <div className="flex-1 flex justify-center py-10 w-full">
      <div className="w-[80%] flex gap-6">

        <div className="w-[38%]">
          <LeftPanel />
        </div>

        <div className="w-[42%] flex justify-center">
          <Gateway />
        </div>

        <div className="w-[20%] flex justify-end">
          <RightPanel />
        </div>

      </div>
    </div>
  );
}
