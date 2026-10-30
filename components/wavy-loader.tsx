'use client';

import React from 'react';

/**
 * KalviumWavyLoader
 *
 * A premium SVG path-tracing loading animation that mimics a fluid, wavy
 * ribbon slithering along a scalloped circular track.
 *
 * Matches the Kalvium design system:
 *   - Background: --soft-pearl (#EFEEE8)
 *   - Track:      --warm-sand (#D3CCC7)
 *   - Accent:     --crimson-depth (#EF0606) with orange mid-state (#ff9f1c)
 *   - Text:       --obsidian-black (#000000)
 */
export default function KalviumWavyLoader() {
  // A scalloped circular path approximating a 7-petal flower shape
  const wavyPath = `
    M 100,35
    C 115,25 135,30 145,45
    C 155,60 175,65 170,85
    C 165,105 165,125 150,135
    C 135,145 125,165 105,160
    C 85,155 65,160 55,145
    C 45,130 25,120 30,100
    C 35,80 30,60 45,50
    C 60,40 80,45 100,35 Z
  `;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#EFEEE8]">
      <div className="relative w-48 h-48">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible"
        >
          {/* 1. Base Track (Light Gray Background Loop) */}
          <path
            d={wavyPath}
            fill="none"
            stroke="#D3CCC7"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* 2. Thin Complementary Accent Ribbon (Slow, Weaving) */}
          <path
            d={wavyPath}
            fill="none"
            stroke="#EF0606"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-trace-slow"
            strokeDasharray="100 400"
            style={{ strokeDashoffset: 500 }}
          />

          {/* 3. Main Thick Ribbon Tracker (Fast, Color Shifting) */}
          <path
            d={wavyPath}
            fill="none"
            stroke="#EF0606"
            strokeWidth="6"
            strokeLinecap="round"
            className="animate-trace-fast"
            strokeDasharray="80 320"
            style={{ strokeDashoffset: 500 }}
          />
        </svg>

        {/* Center Content Branding */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-black tracking-wider">K</span>
        </div>
      </div>

      <span className="mt-4 text-xs font-bold text-black tracking-[0.2em] opacity-60 uppercase animate-pulse">
        Kalvium
      </span>
    </div>
  );
}