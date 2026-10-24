import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { LEVELS } from '../game/engine.js';

const FILTERS = [['all', 'Hammasi'], ...Object.entries(LEVELS).map(([key, l]) => [key, l.label])];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { request } = useAuth();
  const [level, setLevel] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    request(`/leaderboard?level=${level}`).then(setData).catch((e) => setError(e.message));
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  const meInTop = data?.me && data.top.some((r) => r.userId === data.me.userId);

  return (
    <div className="leaderboard">
      <section className="panel">
        <div className="lb-head">
          <h3>🏆 Reyting</h3>
          <div className="lb-filters">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                className={`small ${key === level ? '' : 'secondary'}`}
                onClick={() => setLevel(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="muted lb-note">
          Ochko: g'alaba uchun Oson — 1, O'rta — 2, Qiyin — 3. Teng bo'lsa g'alabalar va gollar soni hal qiladi.
        </p>

        {error && <div className="error">{error}</div>}
        {!data && !error && <p className="muted">Yuklanmoqda...</p>}

        {data && data.top.length === 0 && (
          <p className="muted">
            Hali hech kim o'ynamagan. <Link to="/">Birinchi bo'ling!</Link>
          </p>
        )}

        {data && data.top.length > 0 && (
          <table className="table lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>O'yinchi</th>
                <th>Ochko</th>
                <th>G'alaba</th>
                <th className="lb-hide-sm">O'yinlar</th>
                <th className="lb-hide-sm">Foiz</th>
                <th className="lb-hide-sm">Gollar</th>
              </tr>
            </thead>
            <tbody>
              {data.top.map((r) => (
                <Row key={r.userId} r={r} me={r.userId === data.me?.userId} />
              ))}
              {data.me && !meInTop && (
                <>
                  <tr className="lb-gap"><td colSpan={7}>…</td></tr>
                  <Row r={data.me} me />
                </>
              )}
            </tbody>
          </table>
        )}

        {data && !data.me && data.top.length > 0 && (
          <p className="muted lb-note">
            Siz hali reytingda yo'qsiz. <Link to="/">O'ynab, ochko to'plang!</Link>
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ r, me }) {
  return (
    <tr className={me ? 'lb-me' : ''}>
      <td className="lb-rank">{MEDALS[r.rank - 1] ?? r.rank}</td>
      <td>
        <span className="lb-player">
          <span className="lb-avatar">{r.avatar}</span>
          <span>
            <b>{r.username}</b>
            {me && <span className="muted"> (siz)</span>}
            {r.favoriteTeam && <span className="lb-team">{r.favoriteTeam}</span>}
          </span>
        </span>
      </td>
      <td><b className="lb-points">{r.points}</b></td>
      <td>{r.wins}</td>
      <td className="lb-hide-sm">{r.games}</td>
      <td className="lb-hide-sm">{r.winRate}%</td>
      <td className="lb-hide-sm">{r.goals}</td>
    </tr>
  );
}
