import { useNavigate, useLocation } from "react-router-dom";

// Persistent, app-wide launcher for the AI copilot ("Cursor for Tally").
// Rendered from Layout so it's visible on every screen. Hidden on the copilot page itself.
export default function AiLauncher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === "/utilities/copilot") return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/utilities/copilot")}
      title="Ask the AI copilot (Alt+A)"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-zinc-900 text-white pl-3 pr-4 py-2.5 text-xs font-bold shadow-lg hover:bg-zinc-800 active:scale-95 transition"
    >
      <span className="text-sm leading-none">✦</span>
      <span className="tracking-wide">Ask AI</span>
    </button>
  );
}
