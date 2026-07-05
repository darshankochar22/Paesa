import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const dims = { sm: 28, md: 34, lg: 44 };
  const textSize = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };
  const d = dims[size];

  return (
    <Link href="/" className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={d}
        height={d}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Paesa logo"
      >
        <rect width="40" height="40" rx="10" fill="#0a0a0a" />
        {/* Stylised P that echoes the ₹ crossbars */}
        <path
          d="M12 30V10h9.5c3.866 0 7 3.134 7 7s-3.134 7-7 7H12"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Two horizontal tick-marks like ₹ */}
        <line x1="10" y1="15" x2="21" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="20" x2="21" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className={`font-semibold tracking-tight ${textSize[size]} text-gray-900`}>
        Paesa
      </span>
    </Link>
  );
}
