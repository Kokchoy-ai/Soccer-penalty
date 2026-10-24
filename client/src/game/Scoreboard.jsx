import { LEVELS, REGULAR_KICKS, goalsOf } from './engine.js';

function Row({ name, avatar, kicks, slots, active }) {
  return (
    <div className={`sb-row ${active ? 'active' : ''}`}>
      <span className="sb-name">
        <span className="sb-avatar">{avatar}</span> {name}
      </span>
      <span className="sb-kicks">
        {Array.from({ length: slots }, (_, i) => {
          const k = kicks[i];
          return (
            <span key={i} className={`kick ${k ? (k === 'goal' ? 'goal' : 'fail') : ''}`}>
              {k ? (k === 'goal' ? '✓' : '✕') : ''}
            </span>
          );
        })}
      </span>
      <span className="sb-goals">{goalsOf(kicks)}</span>
    </div>
  );
}

export default function Scoreboard({ user, match, level, turn }) {
  const slots = Math.max(REGULAR_KICKS, match.player.length, match.cpu.length);
  const sudden = Math.min(match.player.length, match.cpu.length) >= REGULAR_KICKS;
  return (
    <div className="scoreboard">
      <div className="sb-head">
        <span className={`badge level-${level}`}>{LEVELS[level].label}</span>
        <span>{sudden ? "Qo'shimcha seriya ⚡" : `Raund ${Math.min(match.cpu.length + 1, REGULAR_KICKS)} / ${REGULAR_KICKS}`}</span>
      </div>
      <Row name={user.username} avatar={user.avatar} kicks={match.player} slots={slots} active={turn === 'player'} />
      <Row name="Kompyuter" avatar="🤖" kicks={match.cpu} slots={slots} active={turn === 'cpu'} />
    </div>
  );
}
