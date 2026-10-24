// Penalti o'yinining mantiqi. Koordinatalar SVG maydoniga (800x500) nisbatan.

export const GOAL = { x: 200, y: 80, w: 400, h: 200 };
export const SPOT = { x: 400, y: 440 };
export const KEEPER_ORIGIN = { x: 400, y: 225 }; // darvozabon belining markazi
export const SWEET = [55, 85]; // kuch shkalasidagi eng aniq zona
export const REGULAR_KICKS = 5;

const POST = 7; // ustun/to'sinning "tegish" kengligi
const BOTTOM = GOAL.y + GOAL.h;

export const LEVELS = {
  easy: {
    label: 'Oson',
    desc: "Darvozabon kam taxmin qiladi, kompyuter tez-tez xato qiladi",
    keeperRead: 0.15, keeperReach: 55, meterSpeed: 1.0, cpuMiss: 0.26, playerReach: 105, keepTime: 3200,
  },
  medium: {
    label: "O'rta",
    desc: "Teng kurash: burchaklarga aniq urish kerak",
    keeperRead: 0.25, keeperReach: 64, meterSpeed: 1.5, cpuMiss: 0.18, playerReach: 98, keepTime: 2600,
  },
  hard: {
    label: 'Qiyin',
    desc: "Darvozabon sizni o'qiydi, shkala tez, vaqt kam",
    keeperRead: 0.38, keeperReach: 76, meterSpeed: 2.1, cpuMiss: 0.12, playerReach: 88, keepTime: 2000,
  },
};

const colX = (c) => GOAL.x + (GOAL.w * (2 * c + 1)) / 6;
const rowY = (r) => GOAL.y + (GOAL.h * (2 * r + 1)) / 4;

// Darvozaning 6 ta zonasi (yuqori: Q W E, pastki: A S D)
export const ZONES = [0, 1].flatMap((row) =>
  [0, 1, 2].map((col) => ({ id: row * 3 + col, row, col, x: colX(col), y: rowY(row), key: 'qweasd'[row * 3 + col] }))
);
export const ZONE_W = GOAL.w / 3;
export const ZONE_H = GOAL.h / 2;

// Mo'ljal olish mumkin bo'lgan hudud (darvozadan biroz tashqarigacha)
export const AIM_BOX = { x1: GOAL.x - 30, y1: GOAL.y - 30, x2: GOAL.x + GOAL.w + 30, y2: BOTTOM - 8 };

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const inAimBox = (p) => p.x >= AIM_BOX.x1 - 20 && p.x <= AIM_BOX.x2 + 20 && p.y >= AIM_BOX.y1 - 20 && p.y <= AIM_BOX.y2 + 30;
export const clampAim = (p) => ({ x: clamp(p.x, AIM_BOX.x1, AIM_BOX.x2), y: clamp(p.y, AIM_BOX.y1, AIM_BOX.y2) });

export function zoneOf(p) {
  const col = clamp(Math.floor((p.x - GOAL.x) / ZONE_W), 0, 2);
  const row = p.y < GOAL.y + ZONE_H ? 0 : 1;
  return ZONES[row * 3 + col];
}

// To'p darvozaga nisbatan qayerga tushdi: 'on' (ichkariga), 'post', 'miss'
export function classify(p) {
  const L = GOAL.x, R = GOAL.x + GOAL.w, T = GOAL.y;
  const hitsPost = (Math.abs(p.x - L) <= POST || Math.abs(p.x - R) <= POST) && p.y >= T - POST;
  const hitsBar = Math.abs(p.y - T) <= POST && p.x >= L - POST && p.x <= R + POST;
  if (hitsPost || hitsBar) return 'post';
  if (p.x < L || p.x > R || p.y < T) return 'miss';
  return 'on';
}

// O'yinchi zarbasi: kuch shirin zonadan qancha uzoq bo'lsa, to'p shuncha tarqaladi.
// 90 dan yuqori kuch to'pni to'sin tomonga ko'taradi, juda kuchsiz zarbani darvozabon oson ushlaydi.
export function playerShot(aim, power, level) {
  const L = LEVELS[level];
  const off = power < SWEET[0] ? SWEET[0] - power : power > SWEET[1] ? power - SWEET[1] : 0;
  const spread = 8 + off * 1.5;
  const ball = {
    x: aim.x + gauss() * spread,
    y: Math.min(aim.y + gauss() * spread * 0.6 - Math.max(0, power - 90) * 6, BOTTOM - 8),
  };

  const weak = power < 35;
  const dive = Math.random() < L.keeperRead + (weak ? 0.3 : 0) ? zoneOf(ball) : pick(ZONES);
  const kind = classify(ball);
  const outcome = kind !== 'on' ? kind : dist(dive, ball) < L.keeperReach + (weak ? 35 : 0) ? 'saved' : 'goal';

  return { ball, dive: { x: dive.x, y: dive.y }, outcome, duration: Math.round(900 - power * 4.5) };
}

// Kompyuter zarbasi: tasodifiy zona, ba'zan mo'ljaldan tashqari
export function cpuShot(level) {
  const L = LEVELS[level];
  const z = pick(ZONES);
  const ball = { x: z.x + rand(-55, 55), y: z.y + rand(-38, 38) };
  if (Math.random() < L.cpuMiss) {
    if (z.row === 0 && Math.random() < 0.5) ball.y = GOAL.y - rand(2, 50);
    else {
      const left = z.col === 0 || (z.col === 1 && Math.random() < 0.5);
      ball.x = left ? GOAL.x - rand(2, 55) : GOAL.x + GOAL.w + rand(2, 55);
    }
  }
  ball.y = Math.min(ball.y, BOTTOM - 8);
  return ball;
}

// O'yinchi darvozabon: dive = tanlangan zona markazi yoki null (joyida qoldi)
export function resolveSave(ball, dive, level) {
  const kind = classify(ball);
  if (kind !== 'on') return kind;
  const reach = LEVELS[level].playerReach;
  const at = dive ?? { x: KEEPER_ORIGIN.x, y: GOAL.y + GOAL.h * 0.6 };
  return dist(at, ball) < (dive ? reach : reach * 0.7) ? 'saved' : 'goal';
}

// Darvozabon qo'llari (belidan ~70 birlik yuqorida) nishonga yetishi uchun siljish va burilish
export function keeperPose(target) {
  if (!target) return { tx: 0, ty: 0, deg: 0 };
  const vx = target.x - KEEPER_ORIGIN.x;
  const vy = target.y - KEEPER_ORIGIN.y;
  const len = Math.hypot(vx, vy);
  if (len <= 70) return { tx: 0, ty: 0, deg: 0 };
  const k = 1 - 70 / len;
  return { tx: vx * k, ty: vy * k, deg: clamp((Math.atan2(vx, -vy) * 180) / Math.PI, -100, 100) };
}

// To'p harakati kadrlari: {x, y, s (masshtab), offset?}
export function ballPath(kick) {
  const scaleAt = (y) => 1 - 0.45 * clamp((SPOT.y - y) / (SPOT.y - GOAL.y), 0, 1.3);
  const B = kick.ball;
  const start = { ...SPOT, s: 1 };
  const hit = { ...B, s: scaleAt(B.y) };
  const side = B.x < KEEPER_ORIGIN.x ? -1 : 1;

  switch (kick.outcome) {
    case 'goal':
      return [start, { ...hit, offset: 0.8 }, { x: B.x + side * 6, y: Math.min(B.y + 10, BOTTOM - 4), s: hit.s * 0.88 }];
    case 'saved':
      return [start, { ...hit, offset: 0.7 }, { x: side < 0 ? GOAL.x - 50 : GOAL.x + GOAL.w + 50, y: BOTTOM + 40, s: 0.75 }];
    case 'post':
      return [start, { ...hit, offset: 0.7 }, { x: B.x - side * 70, y: BOTTOM + 120, s: 0.85 }];
    default:
      return [start, { x: B.x + (B.x - KEEPER_ORIGIN.x) * 0.25, y: B.y - 30, s: hit.s * 0.85 }];
  }
}

// --- Seriya qoidalari (server/match.js bilan bir xil) ---
export const goalsOf = (kicks) => kicks.filter((o) => o === 'goal').length;

export function matchStatus({ player, cpu }) {
  const pg = goalsOf(player);
  const cg = goalsOf(cpu);
  if (player.length <= REGULAR_KICKS && cpu.length <= REGULAR_KICKS) {
    if (pg > cg + (REGULAR_KICKS - cpu.length)) return 'win';
    if (cg > pg + (REGULAR_KICKS - player.length)) return 'loss';
    return null;
  }
  if (player.length === cpu.length && pg !== cg) return pg > cg ? 'win' : 'loss';
  return null;
}
