import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { LEVELS } from '../game/engine.js';

const AVATARS = ['⚽', '🧤', '🦁', '🐺', '🦅', '🔥', '⭐', '👑', '🐉', '🚀', '🐯', '⚡'];

// SQLite UTC vaqtini mahalliy vaqtga
const formatDate = (s, withTime = true) =>
  new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  });

export default function Profile() {
  const { request } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/profile').then(setData).catch((e) => setError(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="panel error">{error}</div>;
  if (!data) return <div className="panel">Yuklanmoqda...</div>;

  const { stats, recent } = data;

  return (
    <div className="profile">
      <ProfileCard />

      <section className="panel">
        <h3>Statistika</h3>
        <div className="stats-grid">
          <Stat value={stats.games} label="O'yinlar" />
          <Stat value={stats.wins} label="G'alabalar" />
          <Stat value={stats.losses} label="Mag'lubiyatlar" />
          <Stat value={`${stats.winRate}%`} label="G'alaba foizi" />
          <Stat value={stats.goalsFor} label="Urilgan gollar" />
          <Stat value={`${stats.accuracy}%`} label={`Zarba aniqligi (${stats.shots} zarba)`} />
          <Stat value={stats.saves} label={`Qaytarilgan zarbalar (${stats.saveRate}%)`} />
          <Stat value={stats.bestStreak} label="Eng uzun g'alaba seriyasi" />
        </div>

        <table className="table">
          <thead>
            <tr><th>Daraja</th><th>O'yinlar</th><th>G'alabalar</th><th>Foiz</th></tr>
          </thead>
          <tbody>
            {Object.entries(LEVELS).map(([key, l]) => {
              const s = stats.byLevel[key];
              return (
                <tr key={key}>
                  <td><span className={`badge level-${key}`}>{l.label}</span></td>
                  <td>{s.games}</td>
                  <td>{s.wins}</td>
                  <td>{s.games ? Math.round((s.wins / s.games) * 100) : 0}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>So'nggi o'yinlar</h3>
        {recent.length === 0 ? (
          <p className="muted">
            Hali o'yin yo'q. <Link to="/">Birinchi o'yinni boshlang</Link>
          </p>
        ) : (
          <ul className="history">
            {recent.map((g) => (
              <li key={g.id} className={g.result}>
                <span className="h-result">{g.result === 'win' ? "G'alaba" : "Mag'lubiyat"}</span>
                <span className="h-score">{g.playerGoals} : {g.cpuGoals}</span>
                <span className={`badge level-${g.difficulty}`}>{LEVELS[g.difficulty].label}</span>
                <span className="h-kicks">
                  {g.player.map((k, i) => (
                    <span key={i} className={`dot ${k === 'goal' ? 'goal' : 'fail'}`} />
                  ))}
                </span>
                <span className="h-date">{formatDate(g.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PasswordForm />
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function ProfileCard() {
  const { user, setUser, request } = useAuth();
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState(user.avatar);
  const [team, setTeam] = useState(user.favoriteTeam);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await request('/profile', { method: 'PUT', body: { avatar, favoriteTeam: team } });
      setUser(d.user);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setAvatar(user.avatar);
    setTeam(user.favoriteTeam);
    setError('');
    setEditing(false);
  }

  return (
    <section className="panel profile-card">
      <div className="profile-head">
        <div className="profile-avatar">{editing ? avatar : user.avatar}</div>
        <div>
          <h2>{user.username}</h2>
          <div className="muted">{user.email}</div>
          <div className="muted">
            Sevimli klub: <b>{user.favoriteTeam || '—'}</b> · A'zo: {formatDate(user.createdAt, false)}
          </div>
        </div>
        {!editing && (
          <button className="secondary small" onClick={() => setEditing(true)}>Tahrirlash</button>
        )}
      </div>

      {editing && (
        <form className="form" onSubmit={save}>
          <div>
            <div className="field-label">Avatar</div>
            <div className="avatar-picker">
              {AVATARS.map((a) => (
                <button type="button" key={a} className={a === avatar ? 'selected' : ''} onClick={() => setAvatar(a)}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <label>
            Sevimli klub
            <input value={team} onChange={(e) => setTeam(e.target.value)} maxLength={40} placeholder="masalan: Paxtakor" />
          </label>
          {error && <div className="error">{error}</div>}
          <div className="actions">
            <button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            <button type="button" className="secondary" onClick={cancel}>Bekor qilish</button>
          </div>
        </form>
      )}
    </section>
  );
}

function PasswordForm() {
  const { request } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) return setMsg({ error: true, text: 'Yangi parollar mos emas' });
    setBusy(true);
    setMsg(null);
    try {
      await request('/password', { method: 'PUT', body: { current: form.current, next: form.next } });
      setForm({ current: '', next: '', confirm: '' });
      setMsg({ text: "Parol o'zgartirildi ✓" });
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3>Parolni o'zgartirish</h3>
      <form className="form narrow" onSubmit={submit}>
        <label>
          Joriy parol
          <input type="password" value={form.current} onChange={set('current')} required />
        </label>
        <label>
          Yangi parol
          <input type="password" value={form.next} onChange={set('next')} minLength={6} required />
        </label>
        <label>
          Yangi parolni takrorlang
          <input type="password" value={form.confirm} onChange={set('confirm')} minLength={6} required />
        </label>
        {msg && <div className={msg.error ? 'error' : 'success'}>{msg.text}</div>}
        <button type="submit" disabled={busy}>{busy ? 'Kuting...' : "O'zgartirish"}</button>
      </form>
    </section>
  );
}
