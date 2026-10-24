import { AIM_BOX, GOAL, KEEPER_ORIGIN, SPOT, SWEET, ZONES, ZONE_H, ZONE_W } from './engine.js';

const CROWD = ['#e63946', '#f1faee', '#ffd166', '#457b9d', '#2a9d8f', '#f4a261'];

function toSvgPoint(e) {
  const svg = e.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function Keeper({ color }) {
  return (
    <g>
      <path d="M-6 0 L-12 52 M6 0 L12 52" stroke="#1d1d1d" strokeWidth="9" strokeLinecap="round" />
      <rect x="-14" y="-4" width="28" height="16" rx="4" fill="#222" />
      <path d="M-12 -38 L-24 -66 M12 -38 L24 -66" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <rect x="-15" y="-44" width="30" height="42" rx="8" fill={color} />
      <text y="-17" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">1</text>
      <circle cy="-55" r="10" fill="#f1c27d" />
      <circle cx="-25" cy="-69" r="7" fill="#fff" stroke="#888" />
      <circle cx="25" cy="-69" r="7" fill="#fff" stroke="#888" />
    </g>
  );
}

function Ball() {
  return (
    <g>
      <circle r="14" fill="#fff" stroke="#333" strokeWidth="1.5" />
      <path d="M0 -5 L5 -1.5 L3 4.5 L-3 4.5 L-5 -1.5Z" fill="#222" />
      <path d="M0 -14 L0 -5 M5 -1.5 L13 -4 M3 4.5 L8 11 M-3 4.5 L-8 11 M-5 -1.5 L-13 -4" stroke="#333" strokeWidth="1.2" />
    </g>
  );
}

function PowerMeter({ power }) {
  const x = 730, y = 120, w = 26, h = 260;
  const level = (v) => y + h - (v / 100) * h;
  return (
    <g>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="8" fill="rgba(0,0,0,.45)" />
      <rect x={x} y={y} width={w} height={h} rx="5" fill="url(#powerGrad)" />
      <rect x={x} y={level(SWEET[1])} width={w} height={level(SWEET[0]) - level(SWEET[1])} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
      <rect x={x - 8} y={level(power) - 3} width={w + 16} height="6" rx="3" fill="#fff" stroke="#111" />
      <text x={x + w / 2} y={y + h + 26} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">KUCH</text>
    </g>
  );
}

export default function Pitch({ phase, cursor, aim, power, keeperColor, keepLeft, onPoint, onMove, onZone, ballRef, keeperRef }) {
  const handle = (fn) => (e) => fn?.(toSvgPoint(e));

  return (
    <svg
      viewBox="0 0 800 500"
      className={`pitch phase-${phase}`}
      onPointerMove={handle(onMove)}
      onClick={handle(onPoint)}
    >
      <defs>
        <pattern id="net" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 0 L14 14 M14 0 L0 14" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
        </pattern>
        <pattern id="crowd" width="36" height="22" patternUnits="userSpaceOnUse">
          {CROWD.map((c, i) => (
            <circle key={i} cx={3 + i * 6} cy={i % 2 ? 6 : 16} r="3.2" fill={c} opacity=".8" />
          ))}
        </pattern>
        <linearGradient id="powerGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#4cc9f0" />
          <stop offset=".55" stopColor="#38b000" />
          <stop offset=".85" stopColor="#ffd60a" />
          <stop offset="1" stopColor="#e63946" />
        </linearGradient>
      </defs>

      {/* tribuna */}
      <rect width="800" height="112" fill="#1b263b" />
      <rect width="800" height="100" fill="url(#crowd)" />
      <rect y="100" width="800" height="12" fill="#0d1b2a" />

      {/* maydon */}
      <rect y="112" width="800" height="388" fill="#2e8b3e" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={112 + i * 56} width="800" height="28" fill="#2a8038" />
      ))}
      <g stroke="#fff" strokeOpacity=".85" strokeWidth="3" fill="none">
        <line x1="0" y1="280" x2="800" y2="280" />
        <polyline points="140,280 112,338 688,338 660,280" />
        <line x1="60" y1="280" x2="10" y2="500" />
        <line x1="740" y1="280" x2="790" y2="500" />
      </g>
      <circle cx={SPOT.x} cy={SPOT.y} r="4" fill="#fff" />

      {/* darvoza */}
      <rect x={GOAL.x} y={GOAL.y} width={GOAL.w} height={GOAL.h} fill="rgba(0,0,0,.28)" />
      <rect x={GOAL.x} y={GOAL.y} width={GOAL.w} height={GOAL.h} fill="url(#net)" />
      <g fill="#fff">
        <rect x={GOAL.x - 7} y={GOAL.y - 7} width="7" height={GOAL.h + 7} />
        <rect x={GOAL.x + GOAL.w} y={GOAL.y - 7} width="7" height={GOAL.h + 7} />
        <rect x={GOAL.x - 7} y={GOAL.y - 7} width={GOAL.w + 14} height="7" />
      </g>

      {/* darvozabon sifatida sakrash zonalari */}
      {phase === 'keep' &&
        ZONES.map((z) => (
          <g
            key={z.id}
            className="zone"
            onClick={(e) => {
              e.stopPropagation();
              onZone(z);
            }}
          >
            <rect x={z.x - ZONE_W / 2 + 3} y={z.y - ZONE_H / 2 + 3} width={ZONE_W - 6} height={ZONE_H - 6} rx="8" />
            <text x={z.x} y={z.y + 8} textAnchor="middle">{z.key.toUpperCase()}</text>
          </g>
        ))}

      {/* darvozabon */}
      <g transform={`translate(${KEEPER_ORIGIN.x} ${KEEPER_ORIGIN.y})`} pointerEvents="none">
        <g ref={keeperRef}>
          <Keeper color={keeperColor} />
        </g>
      </g>

      {/* mo'ljal */}
      {phase === 'aim' && cursor && <Crosshair p={cursor} color="#ffd60a" />}
      {aim && (phase === 'power' || phase === 'flying') && <Crosshair p={aim} color="#fff" locked />}

      {/* to'p */}
      <g ref={ballRef} style={{ transform: `translate(${SPOT.x}px, ${SPOT.y}px)` }} pointerEvents="none">
        <Ball />
      </g>

      {(phase === 'aim' || phase === 'power') && <PowerMeter power={phase === 'power' ? power : 0} />}

      {phase === 'keep' && (
        <rect x={GOAL.x} y={GOAL.y + GOAL.h + 14} width={GOAL.w * keepLeft} height="8" rx="4" fill={keepLeft > 0.35 ? '#ffd60a' : '#e63946'} />
      )}

      {phase === 'aim' && (
        <rect x={AIM_BOX.x1} y={AIM_BOX.y1} width={AIM_BOX.x2 - AIM_BOX.x1} height={AIM_BOX.y2 - AIM_BOX.y1} fill="transparent" className="aim-area" />
      )}
    </svg>
  );
}

function Crosshair({ p, color, locked }) {
  return (
    <g transform={`translate(${p.x} ${p.y})`} stroke={color} strokeWidth="2.5" fill="none" pointerEvents="none">
      <circle r={locked ? 10 : 14} />
      <path d="M-20 0 H-8 M8 0 H20 M0 -20 V-8 M0 8 V20" />
    </g>
  );
}
