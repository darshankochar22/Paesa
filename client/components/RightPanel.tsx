import { Link } from "react-router-dom";

export default function RightPanel() {
  return (
    <div className="flex flex-col border-l px-3 py-2 h-full items-center gap-4 w-[8%]">

      <div className="w-full text-center">
        Date
      </div>

      <Link to="/company" className="w-full text-center">
        Company
      </Link>

    </div>
  );
}