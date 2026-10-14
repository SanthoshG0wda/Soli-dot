"use client";

export function GrowthStats() {
  return (
    <section id="growth" className="relative py-20 sm:py-28 border-t border-[#4a2b15]/12 bg-[#f4ead7] text-[#17100a]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="max-w-3xl">
          <h2 className="font-serif text-[32px] sm:text-[44px] font-normal tracking-tight text-[#17100a]">
            The sovereign legal intelligence benchmark
          </h2>
          <div className="mt-4 flex items-start gap-3">
            <span className="font-mono text-[13px] text-amber-400 select-none mt-0.5">
              [*]
            </span>
            <p className="text-[15px] sm:text-[17px] text-[#3c2d1f]/72 leading-relaxed">
              With over <strong className="text-[#17100a]">5,200,000</strong> indexed judgments, <strong className="text-[#17100a]">98.4%</strong> verified citation precision, and rigorous Section 531 BNSS transitional logic, Soli is relied upon by over <strong className="text-[#17100a]">4,200</strong> advocate chambers and litigation teams every week.
            </p>
          </div>
        </div>

        {/* Technical Diagram Figures (Fig 1, Fig 2, Fig 3) in OpenCode Style */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Fig 1: Area Curve Chart */}
          <div className="motion-card rounded-xl border border-[#4a2b15]/10 bg-[#fffaf0] p-6 flex flex-col justify-between overflow-hidden relative group hover:border-[#9a5f22]/35 transition-all shadow-[0_18px_60px_-42px_rgba(74,43,21,0.6)]">
            <div className="h-[200px] w-full flex items-center justify-center opacity-70 group-hover:opacity-90 transition-opacity">
              <svg width="100%" height="180" viewBox="0 0 205 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                <defs>
                  <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Background grid lines */}
                <line x1="0" y1="30" x2="205" y2="30" stroke="#d9ccb4" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="205" y2="75" stroke="#d9ccb4" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="205" y2="120" stroke="#d9ccb4" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1="165" x2="205" y2="165" stroke="#d9ccb4" strokeWidth="0.8" />
                {/* Shaded Area */}
                <path
                  d="M0 165 C 40 160, 60 145, 90 115 C 120 85, 150 45, 205 15 L 205 165 Z"
                  fill="url(#curveGrad)"
                />
                {/* Primary Trend Line */}
                <path
                  d="M0 165 C 40 160, 60 145, 90 115 C 120 85, 150 45, 205 15"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Highlight Points */}
                <circle cx="90" cy="115" r="3.5" fill="#f59e0b" />
                <circle cx="205" cy="15" r="4.5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
              </svg>
            </div>
            <div className="pt-4 border-t border-[#4a2b15]/10 flex items-baseline justify-between">
              <span className="font-mono text-[12px] text-[#3c2d1f]/55">
                <span className="text-amber-400 font-semibold mr-1.5">Fig 1.</span> Indexed Precedents
              </span>
              <strong className="font-mono text-[17px] font-bold text-[#17100a]">5.2M+</strong>
            </div>
          </div>

          {/* Fig 2: Matrix Grid of Citation Confidence */}
          <div className="motion-card rounded-xl border border-[#4a2b15]/10 bg-[#fffaf0] p-6 flex flex-col justify-between overflow-hidden relative group hover:border-[#9a5f22]/35 transition-all shadow-[0_18px_60px_-42px_rgba(74,43,21,0.6)]">
            <div className="h-[200px] w-full flex items-center justify-center opacity-70 group-hover:opacity-90 transition-opacity">
              <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                {Array.from({ length: 8 }).map((_, row) =>
                  Array.from({ length: 10 }).map((_, col) => {
                    const raw = Math.sin(row * 0.7 + col * 0.5) * 0.4 + 0.5;
                    const opacity = Math.round(raw * 100) / 100;
                    const isLit = (row * 10 + col) % 3 === 0;
                    return (
                      <rect
                        key={`${row}-${col}`}
                        x={col * 20 + 2}
                        y={row * 20 + 2}
                        width="7"
                        height="7"
                        rx="1.5"
                        fill={isLit ? "#8c5a2b" : "#b8aa91"}
                        opacity={opacity}
                      />
                    );
                  })
                )}
              </svg>
            </div>
            <div className="pt-4 border-t border-[#4a2b15]/10 flex items-baseline justify-between">
              <span className="font-mono text-[12px] text-[#3c2d1f]/55">
                <span className="text-amber-400 font-semibold mr-1.5">Fig 2.</span> Verified Ratio Precision
              </span>
              <strong className="font-mono text-[17px] font-bold text-[#17100a]">98.4%</strong>
            </div>
          </div>

          {/* Fig 3: Bar Frequency Chart of Daily Chamber Queries */}
          <div className="motion-card rounded-xl border border-[#4a2b15]/10 bg-[#fffaf0] p-6 flex flex-col justify-between overflow-hidden relative group hover:border-[#9a5f22]/35 transition-all shadow-[0_18px_60px_-42px_rgba(74,43,21,0.6)]">
            <div className="h-[200px] w-full flex items-end justify-between px-2 pb-2 opacity-70 group-hover:opacity-90 transition-opacity">
              {[
                25, 35, 42, 38, 55, 62, 58, 75, 80, 92, 88, 110, 125, 140, 132, 160, 175,
              ].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1 w-2">
                  <div
                    className={`bar-rise w-full rounded-t-xs transition-all ${
                      i >= 14 ? "bg-brand" : "bg-[#b8aa91]"
                    }`}
                    style={{ height: `${Math.round((h / 180) * 150)}px`, animationDelay: `${i * 45}ms` }}
                  />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-[#4a2b15]/10 flex items-baseline justify-between">
              <span className="font-mono text-[12px] text-[#3c2d1f]/55">
                <span className="text-amber-400 font-semibold mr-1.5">Fig 3.</span> Weekly Chamber Active
              </span>
              <strong className="font-mono text-[17px] font-bold text-[#17100a]">4,200+</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
