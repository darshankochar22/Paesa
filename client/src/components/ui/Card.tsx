import { Link } from "react-router-dom";

export type OptionType = { label: string; path?: string; action?: () => void };

type MenuCardProps = {
  options: OptionType[];
  onItemClick?: () => void;
};

export default function MenuCard({ options, onItemClick }: MenuCardProps) {
  return (
    <div className="absolute top-8 left-0 border rounded shadow-md py-1 w-52 flex flex-col bg-white z-50">
      {options.map((option) =>
        option.path ? (
          <Link
            key={option.label}
            to={option.path}
            onClick={onItemClick}
            className="text-left px-3 py-1 text-sm hover:bg-zinc-100 text-zinc-800"
          >
            {option.label}
          </Link>
        ) : option.action ? (
          <button
            key={option.label}
            onClick={() => { option.action!(); onItemClick?.(); }}
            className="text-left px-3 py-1 text-sm hover:bg-zinc-100 text-zinc-800"
          >
            {option.label}
          </button>
        ) : (
          <button
            key={option.label}
            className="text-left px-3 py-1 text-sm text-zinc-400 cursor-not-allowed"
          >
            {option.label}
          </button>
        )
      )}
    </div>
  );
}