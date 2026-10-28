import React from 'react';
import { SixHoles, HoleState } from '../types/dizi';

interface DiziFingeringDiagramProps {
  holes: SixHoles; // [H1, H2, H3, H4, H5, H6] where H1 is bottom, H6 is top
  isCompact?: boolean;
  interactive?: boolean;
  onHoleToggle?: (holeIndex: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DiziFingeringDiagram: React.FC<DiziFingeringDiagramProps> = ({
  holes,
  isCompact = false,
  interactive = false,
  onHoleToggle,
  className = '',
  size = 'md'
}) => {
  // If compact, render a simple horizontal row of 6 dots (useful for upcoming note preview)
  if (isCompact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* Render holes in physical order: Hole 6, 5, 4 (left hand) then 3, 2, 1 (right hand) */}
        {[5, 4, 3, 2, 1, 0].map((idx) => {
          const state = holes[idx];
          return (
            <div
              key={idx}
              className={`w-2.5 h-2.5 rounded-full border transition-all ${
                state === 1
                  ? 'bg-[#B4F45A] border-[#B4F45A]'
                  : state === 0.5
                  ? 'bg-gradient-to-r from-[#B4F45A] to-transparent border-[#B4F45A]'
                  : 'bg-transparent border-[#94A3A7]'
              }`}
              title={`孔 ${idx + 1}: ${state === 1 ? '闭' : state === 0.5 ? '半' : '开'}`}
            />
          );
        })}
      </div>
    );
  }

  // Full realistic Bamboo Flute SVG rendering
  // Flute dimensions
  const width = size === 'sm' ? 44 : size === 'lg' ? 64 : 54;
  const height = size === 'sm' ? 360 : size === 'lg' ? 480 : 420;

  // Hole positions from top (y coordinates)
  // Hole 6 (top) down to Hole 1 (bottom)
  const holeYPositions = [
    { idx: 5, y: 140, label: '6', hand: '左手食指' },
    { idx: 4, y: 178, label: '5', hand: '左手中指' },
    { idx: 3, y: 216, label: '4', hand: '左手无名指' },
    { idx: 2, y: 262, label: '3', hand: '右手食指' },
    { idx: 1, y: 300, label: '2', hand: '右手中指' },
    { idx: 0, y: 338, label: '1', hand: '右手无名指' }
  ];

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 70 460"
        className="overflow-visible filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Authentic mottled bamboo texture gradient */}
          <linearGradient id="bambooShine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2E1C12" />
            <stop offset="18%" stopColor="#6C4126" />
            <stop offset="35%" stopColor="#9E693D" />
            <stop offset="55%" stopColor="#C48E59" />
            <stop offset="75%" stopColor="#87532D" />
            <stop offset="92%" stopColor="#4A2A17" />
            <stop offset="100%" stopColor="#24140B" />
          </linearGradient>

          {/* Bone horn inlay binding gradient for ends */}
          <linearGradient id="boneCap" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8A8576" />
            <stop offset="35%" stopColor="#E8E4D8" />
            <stop offset="65%" stopColor="#FAF7EE" />
            <stop offset="100%" stopColor="#9C9585" />
          </linearGradient>

          {/* Black thread binding (缠丝) gradient */}
          <linearGradient id="threadBinding" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B0D0F" />
            <stop offset="50%" stopColor="#2A3036" />
            <stop offset="100%" stopColor="#0B0D0F" />
          </linearGradient>

          {/* Hole interior drop shadow */}
          <radialGradient id="holeInnerShadow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#0A0B0C" />
            <stop offset="85%" stopColor="#1E1712" />
            <stop offset="100%" stopColor="#4A3423" />
          </radialGradient>

          {/* Open hole ivory look */}
          <radialGradient id="holeOpen" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FAF5E8" />
            <stop offset="70%" stopColor="#DDD4BC" />
            <stop offset="100%" stopColor="#9C8B72" />
          </radialGradient>
        </defs>

        {/* --- Flute Bamboo Body Tube --- */}
        <rect
          x="14"
          y="18"
          width="42"
          height="424"
          rx="5"
          fill="url(#bambooShine)"
          stroke="#1F130B"
          strokeWidth="1"
        />

        {/* Bamboo knots / Joint ridges */}
        <line x1="14" y1="105" x2="56" y2="105" stroke="#22140A" strokeWidth="2.5" opacity="0.6" />
        <line x1="14" y1="239" x2="56" y2="239" stroke="#22140A" strokeWidth="2.5" opacity="0.6" />
        <line x1="14" y1="380" x2="56" y2="380" stroke="#22140A" strokeWidth="2.5" opacity="0.6" />

        {/* Top White Bone Cap (牛骨顶镶) */}
        <rect x="13" y="10" width="44" height="12" rx="3" fill="url(#boneCap)" stroke="#3E3831" strokeWidth="0.8" />
        {/* Bottom Bone Cap */}
        <rect x="13" y="438" width="44" height="12" rx="3" fill="url(#boneCap)" stroke="#3E3831" strokeWidth="0.8" />

        {/* Traditional Black Thread Bindings (缠丝固定) */}
        <rect x="13.5" y="24" width="43" height="8" fill="url(#threadBinding)" />
        <rect x="13.5" y="65" width="43" height="7" fill="url(#threadBinding)" />
        <rect x="13.5" y="115" width="43" height="7" fill="url(#threadBinding)" />
        <rect x="13.5" y="243" width="43" height="7" fill="url(#threadBinding)" />
        <rect x="13.5" y="360" width="43" height="7" fill="url(#threadBinding)" />
        <rect x="13.5" y="426" width="43" height="8" fill="url(#threadBinding)" />

        {/* 1. Blow Hole (吹孔 Chui Kong) */}
        <g transform="translate(35, 48)">
          <ellipse cx="0" cy="0" rx="9" ry="7" fill="url(#holeInnerShadow)" stroke="#3E2413" strokeWidth="1.2" />
          <ellipse cx="0" cy="0" rx="8" ry="5.8" fill="#080809" opacity="0.95" />
          {/* Subtle rim highlight */}
          <path d="M -7 -2 Q 0 -5 7 -2" stroke="#D3B08C" strokeWidth="0.8" fill="none" opacity="0.6" />
        </g>

        {/* 2. Membrane Hole (膜孔 Mo Kong) with wrinkled dimo membrane */}
        <g transform="translate(35, 88)">
          <ellipse cx="0" cy="0" rx="7.5" ry="6.2" fill="#2E241B" stroke="#25170F" strokeWidth="1" />
          {/* Translucent parchment/dimo membrane paper */}
          <ellipse cx="0" cy="0" rx="7.2" ry="5.8" fill="#F4ECE1" opacity="0.85" />
          {/* Authentic delicate micro wrinkles in the dimo */}
          <path d="M -5 -2 Q 0 -1 5 -3" stroke="#C5B8A5" strokeWidth="0.6" fill="none" />
          <path d="M -6 1 Q 0 0 6 2" stroke="#C5B8A5" strokeWidth="0.6" fill="none" />
          <path d="M -4 3.5 Q 1 2.5 4 4" stroke="#C5B8A5" strokeWidth="0.5" fill="none" />
        </g>

        {/* 3. The 6 Main Finger Holes (孔6 down to 孔1) */}
        {holeYPositions.map(({ idx, y, label }) => {
          const state: HoleState = holes[idx];
          return (
            <g
              key={idx}
              transform={`translate(35, ${y})`}
              className={interactive ? 'cursor-pointer hover:opacity-90' : ''}
              onClick={() => interactive && onHoleToggle && onHoleToggle(idx)}
            >
              {/* Hole outer border / bamboo cut recess */}
              <circle cx="0" cy="0" r="9.5" fill="#2A1B12" stroke="#1A0F09" strokeWidth="1" />

              {state === 1 && (
                /* Closed Hole: Finger securely pressed down */
                <g>
                  <circle cx="0" cy="0" r="8.2" fill="#0D1114" stroke="#1D2A30" strokeWidth="1.2" />
                  {/* Subtle pressed glow highlight */}
                  <circle cx="-2.5" cy="-2.5" r="3" fill="#283B42" opacity="0.4" />
                </g>
              )}

              {state === 0 && (
                /* Open Hole: Clean ivory reflection looking into the bamboo body */
                <g>
                  <circle cx="0" cy="0" r="8.2" fill="url(#holeOpen)" stroke="#524334" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="6.2" fill="url(#holeInnerShadow)" opacity="0.85" />
                </g>
              )}

              {state === 0.5 && (
                /* Half Hole (半孔): Half pressed, half open */
                <g>
                  <circle cx="0" cy="0" r="8.2" fill="url(#holeOpen)" />
                  <path d="M 0 -8.2 A 8.2 8.2 0 0 1 0 8.2 Z" fill="#0D1114" />
                  <line x1="0" y1="-8.2" x2="0" y2="8.2" stroke="#1D2A30" strokeWidth="1" />
                </g>
              )}

              {/* Hole number label on the side */}
              <text
                x="20"
                y="4"
                fill="#94A3A7"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                className="select-none font-medium opacity-80"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* 4. Bottom Auxiliary Sound Holes (基音孔 / 助音孔) */}
        <g transform="translate(35, 396)">
          <ellipse cx="-8" cy="0" rx="4" ry="5.5" fill="#140C07" stroke="#25170F" strokeWidth="0.8" />
          <ellipse cx="8" cy="0" rx="4" ry="5.5" fill="#140C07" stroke="#25170F" strokeWidth="0.8" />
        </g>
      </svg>
    </div>
  );
};
