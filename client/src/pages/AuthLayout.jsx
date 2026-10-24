export default function AuthLayout({ title, children }) {
  return (
    <div className="auth-page">
      <div className="card">
        <div className="logo">⚽</div>
        <h1 className="brand">Soccer Penalty</h1>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
