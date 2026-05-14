import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer.tsx";
import Gateway from "../components/Gateway.tsx";
import RightPanel from "../components/RightPanel.tsx";
import LeftPanel from "../components/LeftPanel.tsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex justify-center py-10">

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
      </main>

      <Footer />
    </div>
  );
}