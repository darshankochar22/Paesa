import { Link } from 'react-router-dom';
import { useState } from 'react';

export type OptionType = {
  label: string;
  path?: string;
  action?: () => void;
  heading?: boolean; // renders as a non-interactive section header
  children?: OptionType[]; // renders a flyout submenu
};

type MenuCardProps = {
  options: OptionType[];
  onItemClick?: () => void;
};

const ITEM = 'text-left px-3 py-1 text-sm hover:bg-zinc-100 text-zinc-800';
const DISABLED = 'text-left px-3 py-1 text-sm text-zinc-400 cursor-not-allowed';

function MenuItem({ option, onItemClick }: { option: OptionType; onItemClick?: () => void }) {
  const [open, setOpen] = useState(false);

  if (option.heading) {
    return (
      <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none">
        {option.label}
      </div>
    );
  }

  if (option.children) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className={`${ITEM} w-full flex items-center justify-between`}>
          <span>{option.label}</span>
          <span className="text-zinc-400">›</span>
        </button>
        {open && (
          <div className="absolute top-0 left-full -ml-px w-52 flex flex-col border rounded bg-white py-1 shadow-md z-50">
            {option.children.map((child, i) => (
              <MenuItem key={`${child.label}-${i}`} option={child} onItemClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (option.path) {
    return (
      <Link to={option.path} onClick={onItemClick} className={`${ITEM} block`}>
        {option.label}
      </Link>
    );
  }

  if (option.action) {
    return (
      <button
        onClick={() => {
          option.action!();
          onItemClick?.();
        }}
        className={`${ITEM} w-full`}
      >
        {option.label}
      </button>
    );
  }

  return <button className={`${DISABLED} w-full`}>{option.label}</button>;
}

export default function MenuCard({ options, onItemClick }: MenuCardProps) {
  return (
    <div className="absolute top-8 left-0 w-56 flex flex-col border rounded bg-white py-1 shadow-md z-50">
      {options.map((option, i) => (
        <MenuItem key={`${option.label}-${i}`} option={option} onItemClick={onItemClick} />
      ))}
    </div>
  );
}
