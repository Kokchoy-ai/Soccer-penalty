import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <header className="nav">
        <NavLink to="/" className="nav-brand">⚽ Soccer Penalty</NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>O'ynash</NavLink>
          <NavLink to="/profile">Profil</NavLink>
        </nav>
        <div className="nav-user">
          <span className="nav-avatar">{user.avatar}</span>
          <span className="nav-name">{user.username}</span>
          <button className="link-btn" onClick={onLogout}>Chiqish</button>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
