export function IndiaMap({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Subtle glow behind the map */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full bg-zinc-100 blur-3xl opacity-60" />
      </div>

      <svg
        viewBox="0 0 400 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full max-w-md drop-shadow-sm"
        aria-label="Map of India"
      >
        {/* India outline */}
        <path
          d="
            M 160 18
            L 175 14
            L 192 16
            L 210 12
            L 228 18
            L 245 15
            L 262 20
            L 272 28
            L 280 38
            L 285 52
            L 278 62
            L 270 58
            L 265 68
            L 272 78
            L 280 82
            L 290 78
            L 298 84
            L 302 96
            L 295 106
            L 288 112
            L 295 120
            L 308 126
            L 318 136
            L 322 148
            L 318 160
            L 310 168
            L 318 175
            L 325 185
            L 328 198
            L 322 210
            L 314 218
            L 316 228
            L 322 238
            L 320 252
            L 312 262
            L 305 275
            L 298 288
            L 292 302
            L 284 318
            L 275 334
            L 264 350
            L 252 366
            L 240 382
            L 228 396
            L 216 412
            L 208 424
            L 204 434
            L 200 442
            L 196 434
            L 190 420
            L 182 406
            L 172 390
            L 160 374
            L 148 358
            L 136 342
            L 125 326
            L 115 310
            L 106 294
            L 98 278
            L 90 262
            L 84 248
            L 80 234
            L 76 220
            L 74 206
            L 72 192
            L 75 178
            L 82 166
            L 88 154
            L 84 142
            L 78 132
            L 72 122
            L 68 110
            L 72 98
            L 80 88
            L 88 80
            L 96 72
            L 100 62
            L 96 52
            L 100 42
            L 108 34
            L 118 26
            L 132 20
            L 148 16
            Z
          "
          fill="#f4f4f5"
          stroke="#d4d4d8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* State boundary lines (simplified) */}
        <path d="M 160 18 L 160 120 M 200 442 L 200 360 M 120 180 L 200 210 L 280 180" stroke="#e4e4e7" strokeWidth="0.8" strokeDasharray="3 3" />

        {/* Major city dots */}
        {[
          { cx: 168, cy: 95, label: "Delhi" },
          { cx: 148, cy: 210, label: "Mumbai" },
          { cx: 218, cy: 195, label: "Kolkata" },
          { cx: 200, cy: 310, label: "Bengaluru" },
          { cx: 185, cy: 270, label: "Chennai" },
          { cx: 155, cy: 168, label: "Ahmedabad" },
          { cx: 195, cy: 252, label: "Hyderabad" },
        ].map((dot) => (
          <g key={dot.label}>
            <circle cx={dot.cx} cy={dot.cy} r="4" fill="#09090b" opacity="0.7" />
            <circle cx={dot.cx} cy={dot.cy} r="7" fill="#09090b" opacity="0.12" />
          </g>
        ))}

        {/* Rupee symbol in centre of India */}
        <text
          x="188"
          y="228"
          fontSize="26"
          fontWeight="700"
          fill="#09090b"
          opacity="0.08"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
        >
          ₹
        </text>
      </svg>

      {/* Floating stat chips around the map */}
      <div className="absolute top-8 right-4 bg-white border border-zinc-100 rounded-xl px-3 py-2 shadow-sm text-center">
        <p className="text-xs font-semibold text-zinc-950">1,200+</p>
        <p className="text-[10px] text-zinc-400">businesses</p>
      </div>
      <div className="absolute bottom-16 left-2 bg-white border border-zinc-100 rounded-xl px-3 py-2 shadow-sm text-center">
        <p className="text-xs font-semibold text-zinc-950">28 states</p>
        <p className="text-[10px] text-zinc-400">served</p>
      </div>
      <div className="absolute top-1/2 right-2 bg-[#0d0d0d] rounded-xl px-3 py-2 shadow-sm text-center -translate-y-8">
        <p className="text-xs font-semibold text-white">₹4,200 Cr+</p>
        <p className="text-[10px] text-zinc-400">processed</p>
      </div>
    </div>
  );
}
