import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'sp_token';

export async function api(path, { method, body, token } = {}) {
  const res = await fetch(`/api${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Server bilan aloqa xatosi');
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    api('/me', { token })
      .then((d) => setUser(d.user))
      .catch(() => saveToken(null))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function saveToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    setToken(t);
  }

  // token bilan so'rov yuborish (profil, o'yin natijalari)
  const request = useCallback((path, opts = {}) => api(path, { ...opts, token }), [token]);

  async function register(form) {
    const d = await api('/register', { body: form });
    saveToken(d.token);
    setUser(d.user);
  }

  async function login(form) {
    const d = await api('/login', { body: form });
    saveToken(d.token);
    setUser(d.user);
  }

  async function logout() {
    await api('/logout', { body: {}, token }).catch(() => {});
    saveToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, request, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
