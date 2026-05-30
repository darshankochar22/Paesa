interface Props {
  label: string;
  children: React.ReactNode;
}

export default function Field({ label, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}
