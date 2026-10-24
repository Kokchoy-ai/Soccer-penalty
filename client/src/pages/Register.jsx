import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Parollar mos emas');
    setBusy(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Ro'yxatdan o'tish">
      <form onSubmit={onSubmit} className="form">
        <label>
          Login
          <input value={form.username} onChange={set('username')} placeholder="masalan: messi10" required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} placeholder="siz@mail.uz" required />
        </label>
        <label>
          Parol
          <input type="password" value={form.password} onChange={set('password')} minLength={6} required />
        </label>
        <label>
          Parolni takrorlang
          <input type="password" value={form.confirm} onChange={set('confirm')} minLength={6} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? 'Kuting...' : "Ro'yxatdan o'tish"}</button>
      </form>
      <p className="switch">
        Akkauntingiz bormi? <Link to="/login">Kirish</Link>
      </p>
    </AuthLayout>
  );
}
