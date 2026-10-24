import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { LEVELS } from '../game/engine.js';

const LEVEL_KEY = 'sp_level';

export default function Home() {
  const { user, request } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState(() => (LEVELS[localStorage.getItem(LEVEL_KEY)] ? localStorage.getItem(LEVEL_KEY) : 'medium'));
  const [stats, setStats] = useState(null);

  useEffect(() => {
    request('/profile').then((d) => setStats(d.stats)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function play() {
    localStorage.setItem(LEVEL_KEY, level);
    navigate(`/play?level=${level}`);
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="big-emoji">⚽🥅</div>
        <h1>Salom, {user.username}!</h1>
        <p>Kompyuterga qarshi penaltilar seriyasi. Darajani tanlang va maydonga chiqing.</p>
      </section>

      <section className="panel">
        <h3>Qiyinlik darajasi</h3>
        <div className="levels">
          {Object.entries(LEVELS).map(([key, l]) => (
            <button
              key={key}
              type="button"
              className={`level-card level-${key} ${level === key ? 'selected' : ''}`}
              onClick={() => setLevel(key)}
            >
              <span className="level-title">{l.label}</span>
              <span className="level-desc">{l.desc}</span>
              {stats && (
                <span className="level-stat">
                  {stats.byLevel[key].wins} g'alaba / {stats.byLevel[key].games} o'yin
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="play-btn" onClick={play}>O'ynash ▶</button>
      </section>

      {stats && (
        <section className="quick-stats">
          <div><b>{stats.games}</b><span>O'yinlar</span></div>
          <div><b>{stats.wins}</b><span>G'alabalar</span></div>
          <div><b>{stats.accuracy}%</b><span>Zarba aniqligi</span></div>
          <div><b>{stats.currentStreak}</b><span>Joriy seriya</span></div>
        </section>
      )}
    </div>
  );
}
