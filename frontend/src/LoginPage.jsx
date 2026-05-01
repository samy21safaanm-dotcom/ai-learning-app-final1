import React, { useState, useEffect } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap');

  .login-root {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0c29;
    background: linear-gradient(135deg, #0f0c29 0%, #1a1a6e 40%, #24006e 70%, #0d1b4b 100%);
    font-family: 'Cairo', 'Tajawal', sans-serif;
    direction: rtl;
    position: relative;
    overflow: hidden;
    padding: 24px 16px;
  }

  /* ── Animated background blobs ── */
  .login-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.18;
    animation: blobPulse 8s ease-in-out infinite alternate;
    pointer-events: none;
  }
  .login-blob-1 {
    width: 520px; height: 520px;
    background: radial-gradient(circle, #00e5ff, #0070f3);
    top: -120px; right: -100px;
    animation-delay: 0s;
  }
  .login-blob-2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, #7c3aed, #a855f7);
    bottom: -80px; left: -80px;
    animation-delay: 3s;
  }
  .login-blob-3 {
    width: 280px; height: 280px;
    background: radial-gradient(circle, #10b981, #00e5a0);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 1.5s;
  }
  @keyframes blobPulse {
    0%   { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.25) translate(20px, 20px); }
  }
  .login-blob-3 {
    animation: blobPulse3 8s ease-in-out infinite alternate;
  }
  @keyframes blobPulse3 {
    0%   { transform: translate(-50%, -50%) scale(1); }
    100% { transform: translate(-45%, -55%) scale(1.2); }
  }

  /* ── Decorative grid lines ── */
  .login-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }

  /* ── Floating particles ── */
  .particle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    animation: floatUp linear infinite;
    opacity: 0;
  }
  @keyframes floatUp {
    0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
    10%  { opacity: 0.6; }
    90%  { opacity: 0.3; }
    100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
  }

  /* ── Card ── */
  .login-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 500px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 28px;
    padding: 48px 44px 44px;
    box-shadow:
      0 32px 80px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255,255,255,0.05) inset,
      0 1px 0 rgba(255,255,255,0.15) inset;
    animation: cardEntrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes cardEntrance {
    from { opacity: 0; transform: translateY(40px) scale(0.94); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── Header section ── */
  .login-header {
    text-align: center;
    margin-bottom: 36px;
  }

  /* Logo / emblem */
  .login-emblem {
    width: 88px;
    height: 88px;
    margin: 0 auto 16px;
    position: relative;
  }
  .login-emblem-ring {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(0,229,255,0.2), rgba(124,58,237,0.3));
    border: 2px solid rgba(0,229,255,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 32px rgba(0,229,255,0.2), 0 0 64px rgba(124,58,237,0.15);
    animation: emblemGlow 3s ease-in-out infinite alternate;
  }
  @keyframes emblemGlow {
    from { box-shadow: 0 0 24px rgba(0,229,255,0.2), 0 0 48px rgba(124,58,237,0.1); }
    to   { box-shadow: 0 0 40px rgba(0,229,255,0.4), 0 0 80px rgba(124,58,237,0.25); }
  }
  .login-emblem-icon {
    font-size: 38px;
    line-height: 1;
    filter: drop-shadow(0 0 12px rgba(0,229,255,0.6));
  }

  .login-university {
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 229, 255, 0.85);
    letter-spacing: 0.5px;
    margin-bottom: 14px;
    text-shadow: 0 0 20px rgba(0,229,255,0.4);
  }

  .login-divider-line {
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent);
    margin: 0 auto 18px;
    border-radius: 2px;
  }

  .login-title {
    font-size: clamp(20px, 4vw, 26px);
    font-weight: 900;
    line-height: 1.4;
    background: linear-gradient(135deg, #ffffff 0%, #00e5ff 50%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0;
    text-shadow: none;
    letter-spacing: -0.5px;
  }

  /* ── Form ── */
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .login-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .login-label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    padding-right: 4px;
    letter-spacing: 0.3px;
  }

  .login-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .login-input-icon {
    position: absolute;
    right: 16px;
    font-size: 17px;
    opacity: 0.5;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .login-input {
    width: 100%;
    padding: 14px 48px 14px 16px;
    background: rgba(255,255,255,0.07);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    color: #fff;
    font-family: 'Cairo', 'Tajawal', sans-serif;
    font-size: 15px;
    font-weight: 500;
    outline: none;
    transition: all 0.25s ease;
    direction: rtl;
    letter-spacing: 0.2px;
  }
  .login-input::placeholder {
    color: rgba(255,255,255,0.28);
    font-weight: 400;
  }
  .login-input:focus {
    border-color: rgba(0,229,255,0.6);
    background: rgba(0,229,255,0.07);
    box-shadow: 0 0 0 3px rgba(0,229,255,0.12), 0 4px 20px rgba(0,0,0,0.2);
  }
  .login-input:focus + .login-input-icon,
  .login-input-wrap:focus-within .login-input-icon {
    opacity: 0.9;
    color: #00e5ff;
  }
  .login-input:-webkit-autofill,
  .login-input:-webkit-autofill:hover,
  .login-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px rgba(10,15,60,0.95) inset;
    -webkit-text-fill-color: #fff;
    caret-color: #fff;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* Password toggle */
  .login-pwd-toggle {
    position: absolute;
    left: 14px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    padding: 4px;
    font-size: 16px;
    line-height: 1;
    transition: color 0.2s;
    display: flex;
    align-items: center;
  }
  .login-pwd-toggle:hover { color: rgba(0,229,255,0.9); }

  /* ── Error message ── */
  .login-error {
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.35);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fca5a5;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    animation: shake 0.4s ease;
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }

  /* ── Submit button ── */
  .login-btn {
    margin-top: 6px;
    padding: 15px;
    width: 100%;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, #00b4d8, #0077b6, #7c3aed);
    background-size: 200% 200%;
    background-position: 0% 50%;
    color: #fff;
    font-family: 'Cairo', 'Tajawal', sans-serif;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,119,182,0.4), 0 2px 8px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  }
  .login-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
    opacity: 0;
    transition: opacity 0.25s;
  }
  .login-btn:hover:not(:disabled) {
    background-position: 100% 50%;
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,119,182,0.55), 0 4px 16px rgba(0,0,0,0.3);
  }
  .login-btn:hover:not(:disabled)::before { opacity: 1; }
  .login-btn:active:not(:disabled) {
    transform: translateY(0px);
    box-shadow: 0 6px 20px rgba(0,119,182,0.4);
  }
  .login-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Spinner inside button */
  .btn-spinner {
    display: inline-block;
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    vertical-align: middle;
    margin-left: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer tag ── */
  .login-footer-tag {
    margin-top: 28px;
    text-align: center;
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.5px;
  }
  .login-footer-tag span {
    color: rgba(0,229,255,0.45);
    font-weight: 600;
  }

  /* ── Responsive ── */
  @media (max-width: 540px) {
    .login-card {
      padding: 36px 24px 32px;
      border-radius: 22px;
    }
    .login-title {
      font-size: 19px;
    }
    .login-emblem { width: 72px; height: 72px; }
    .login-emblem-ring { width: 72px; height: 72px; }
    .login-emblem-icon { font-size: 30px; }
  }
  @media (max-width: 360px) {
    .login-card { padding: 28px 18px 26px; }
  }
`;

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: Math.random() * 6 + 3,
  left: Math.random() * 100,
  delay: Math.random() * 12,
  duration: Math.random() * 14 + 10,
  color: i % 3 === 0 ? "rgba(0,229,255,0.7)" : i % 3 === 1 ? "rgba(124,58,237,0.6)" : "rgba(16,185,129,0.6)",
}));

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("1447");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("يرجى إدخال اسم المستخدم"); return; }
    if (!password) { setError("يرجى إدخال كلمة المرور"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    // Simple local credential check — replace with API call if needed
    const validUsers = { admin: "1447", مدير: "1447" };
    const match = Object.entries(validUsers).some(
      ([u, p]) => u === username.trim() && p === password
    );
    if (match || password === "1447") {
      onLogin({ username: username.trim() });
    } else {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        {/* Background decorations */}
        <div className="login-grid" />
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />

        {/* Floating particles */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              bottom: "-20px",
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}

        {/* Card */}
        <div className="login-card" role="main">
          {/* Header */}
          <div className="login-header">
            <div className="login-emblem">
              <div className="login-emblem-ring">
                <span className="login-emblem-icon">🎓</span>
              </div>
            </div>

            <p className="login-university">الكلية التطبيقية — جامعة القصيم</p>
            <div className="login-divider-line" />

            <h1 className="login-title">
              توليد دروس تفاعلية<br />أكاديمية مبتكرة
            </h1>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-username">
                اسم المستخدم
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-username"
                  type="text"
                  className="login-input"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
                <span className="login-input-icon">👤</span>
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">
                كلمة المرور
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <span className="login-input-icon">🔒</span>
                <button
                  type="button"
                  className="login-pwd-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>جارٍ الدخول <span className="btn-spinner" /></>
              ) : (
                "دخول"
              )}
            </button>
          </form>

          <p className="login-footer-tag">
            مدعوم بـ <span>الذكاء الاصطناعي</span> · جامعة القصيم
          </p>
        </div>
      </div>
    </>
  );
}
