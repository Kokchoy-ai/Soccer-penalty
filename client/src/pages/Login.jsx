import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Kirish">
      <form onSubmit={onSubmit} className="form">
        <label>
          Login yoki email
          <input value={form.login} onChange={set('login')} required />
        </label>
        <label>
          Parol
          <input type="password" value={form.password} onChange={set('password')} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? 'Kuting...' : 'Kirish'}</button>
      </form>
      <p className="switch">
        Akkauntingiz yo'qmi? <Link to="/register">Ro'yxatdan o'tish</Link>
      </p>
    </AuthLayout>
  );
}
