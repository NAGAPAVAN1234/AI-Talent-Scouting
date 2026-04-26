import React from 'react';

const PALETTE = {
  match:    { high: '#10b981', med: '#f59e0b', low: '#ef4444', track: 'rgba(16,185,129,0.12)' },
  interest: { high: '#8b5cf6', med: '#a78bfa', low: '#c4b5fd', track: 'rgba(139,92,246,0.12)' },
  final:    { high: '#3b82f6', med: '#60a5fa', low: '#93c5fd', track: 'rgba(59,130,246,0.12)' },
};

function getColor(type, score) {
  const p = PALETTE[type] || PALETTE.match;
  return score >= 70 ? p.high : score >= 45 ? p.med : p.low;
}

export default function ScoreRing({ score = 0, label = '', type = 'match', size = 72, stroke = 5 }) {
  const clamped = Math.min(100, Math.max(0, score ?? 0));
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const color = getColor(type, clamped);
  const cx = size / 2;
  const p = PALETTE[type] || PALETTE.match;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={cx} cy={cx} r={radius} stroke={p.track} strokeWidth={stroke} fill="none" />
          <circle
            cx={cx} cy={cx} r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 3px ${color}60)` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size < 58 ? '0.68rem' : '0.92rem',
          fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
          color,
          letterSpacing: '-0.02em',
        }}>
          {Math.round(clamped)}
        </div>
      </div>
      <span style={{
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {label}
      </span>
    </div>
  );
}