import React from "react";

interface FormRowProps {
  label: string;
  required?: boolean;
  labelWidth?: string;
  className?: string;
  children: React.ReactNode;
}

export default function FormRow({
  label,
  required = false,
  labelWidth = "w-56",
  className = "flex items-center min-h-[32px]",
  children,
}: FormRowProps) {
  return (
    <div className={className}>
      <span className={`${labelWidth} text-sm text-zinc-400 shrink-0 py-1`}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2 shrink-0">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
