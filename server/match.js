// Penalti seriyasi qoidalari — client/src/game/engine.js dagi matchStatus bilan bir xil
export const REGULAR_KICKS = 5;
export const OUTCOMES = ['goal', 'saved', 'miss', 'post'];

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

// Zarbalar ketma-ketligi haqiqiy tugagan o'yinmi: o'yinchi birinchi uradi,
// navbat almashadi va natija aynan oxirgi zarbada aniqlanadi.
export function validateMatch(player, cpu) {
  if (!Array.isArray(player) || !Array.isArray(cpu)) return null;
  if (player.length > 30 || cpu.length > 30) return null;
  if (![...player, ...cpu].every((o) => OUTCOMES.includes(o))) return null;
  if (player.length !== cpu.length && player.length !== cpu.length + 1) return null;

  const total = player.length + cpu.length;
  for (let n = 1; n < total; n++) {
    const prefix = { player: player.slice(0, Math.ceil(n / 2)), cpu: cpu.slice(0, Math.floor(n / 2)) };
    if (matchStatus(prefix)) return null;
  }
  return matchStatus({ player, cpu });
}
