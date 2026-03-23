import { useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (allowedEmail && email !== allowedEmail) {
        setError("This account is not allowed to access the system.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setError("Login failed. No session returned.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError("Something went wrong during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "#0a0c0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "2rem", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap');

        /* Grid background */
        .login-bg-grid {
          position: fixed; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,107,74,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,107,74,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .login-bg-glow {
          position: fixed; top: -30%; left: 50%; transform: translateX(-50%);
          width: 600px; height: 500px; pointer-events: none;
          background: radial-gradient(ellipse, rgba(255,107,74,0.05) 0%, transparent 65%);
        }

        /* Vertical side text */
        .login-side-text {
          position: fixed; left: 1.5rem; top: 50%; transform: translateY(-50%) rotate(-90deg);
          font-family: 'Space Mono', monospace;
          font-size: 0.5rem; letter-spacing: 0.28em;
          color: #2a2f38; text-transform: uppercase; white-space: nowrap;
          pointer-events: none;
        }
        .login-node-text {
          position: fixed; right: 1.75rem; bottom: 2rem;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3rem; color: rgba(255,107,74,0.08);
          line-height: 1; pointer-events: none; letter-spacing: 0.05em;
        }
        .login-node-sub {
          font-family: 'Space Mono', monospace;
          font-size: 0.45rem; color: #2a2f38; letter-spacing: 0.15em;
          text-align: right; text-transform: uppercase;
        }

        /* Back link */
        .login-back {
          position: fixed; top: 1.5rem; left: 1.5rem;
          font-family: 'Space Mono', monospace;
          font-size: 0.62rem; letter-spacing: 0.08em;
          color: #555e6a; text-decoration: none; text-transform: uppercase;
          display: flex; align-items: center; gap: 0.4rem;
          transition: color 0.18s;
        }
        .login-back:hover { color: #ff6b4a; }

        /* Header */
        .login-header { text-align: center; margin-bottom: 2.5rem; position: relative; z-index: 1; }
        .login-header-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(2rem, 5vw, 3rem);
          letter-spacing: 0.08em; color: #fff; line-height: 1; margin-bottom: 0.5rem;
        }
        .login-header-node {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-family: 'Space Mono', monospace;
          font-size: 0.6rem; letter-spacing: 0.2em;
          color: #ff6b4a; text-transform: uppercase;
        }
        .login-header-node::before,
        .login-header-node::after {
          content: ''; display: block; width: 32px; height: 1px; background: #ff6b4a;
        }

        /* Card */
        .login-card {
          width: 100%; max-width: 440px;
          background: #0d1117;
          border: 1px solid rgba(255,107,74,0.18);
          position: relative; z-index: 1;
        }
        .login-card-top-bar {
          height: 3px;
          background: linear-gradient(90deg, #ff6b4a 0%, rgba(255,107,74,0.3) 60%, transparent 100%);
        }
        .login-card-corner {
          position: absolute; top: 3px; right: 0;
          width: 20px; height: 20px;
          border-top: 2px solid #ff6b4a; border-right: 2px solid #ff6b4a;
        }
        .login-card-body { padding: 2rem 2rem 0; }

        /* Card header */
        .login-card-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.8rem; color: #fff; letter-spacing: 0.05em; margin-bottom: 0.15rem;
        }
        .login-card-sub {
          font-family: 'Space Mono', monospace;
          font-size: 0.6rem; letter-spacing: 0.16em;
          color: #555e6a; text-transform: uppercase; margin-bottom: 1.75rem;
        }

        /* Error */
        .login-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          padding: 0.65rem 0.875rem; margin-bottom: 1.25rem;
          font-family: 'Space Mono', monospace;
          font-size: 0.62rem; color: #f87171; letter-spacing: 0.04em;
          display: flex; align-items: center; gap: 0.5rem;
        }

        /* Field */
        .login-field { margin-bottom: 1.25rem; }
        .login-field-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.55rem; letter-spacing: 0.16em;
          color: #555e6a; text-transform: uppercase; margin-bottom: 0.5rem; display: block;
        }
        .login-input-wrap {
          display: flex; align-items: center;
          background: #0a0c0f;
          border: 1px solid rgba(255,107,74,0.12);
          padding: 0 0.875rem;
          transition: border-color 0.18s;
        }
        .login-input-wrap:focus-within {
          border-color: rgba(255,107,74,0.4);
          box-shadow: 0 0 0 1px rgba(255,107,74,0.1);
        }
        .login-input-icon { color: #555e6a; flex-shrink: 0; }
        .login-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem; color: #e2e8f0; letter-spacing: 0.04em;
          padding: 0.875rem 0.75rem;
        }
        .login-input::placeholder { color: #3d444d; }

        /* Extras row */
        .login-extras {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .login-trust {
          display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
        }
        .login-trust-box {
          width: 12px; height: 12px;
          border: 1px solid rgba(255,107,74,0.3);
          background: transparent; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .login-trust-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.55rem; letter-spacing: 0.1em;
          color: #555e6a; text-transform: uppercase;
        }
        .login-bypass {
          font-family: 'Space Mono', monospace;
          font-size: 0.55rem; letter-spacing: 0.1em;
          color: #ff6b4a; text-transform: uppercase; text-decoration: none;
          transition: color 0.18s;
        }
        .login-bypass:hover { color: #ff8c74; }

        /* Submit */
        .login-submit {
          width: 100%;
          background: #ff6b4a; color: #0a0c0f;
          font-family: 'Space Mono', monospace;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em;
          padding: 1rem; border: none; cursor: pointer;
          text-transform: uppercase; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          margin-bottom: 0;
        }
        .login-submit:hover:not(:disabled) { background: #ff8c74; }
        .login-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .spin {
          width: 14px; height: 14px;
          border: 2px solid rgba(10,12,15,0.3);
          border-top-color: #0a0c0f;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Warning footer */
        .login-warning {
          background: rgba(255,107,74,0.06);
          border-top: 1px solid rgba(255,107,74,0.12);
          padding: 1.25rem 2rem;
          display: flex; gap: 0.75rem; align-items: flex-start;
          margin-top: 1.5rem;
        }
        .login-warning-icon { color: #ff6b4a; flex-shrink: 0; margin-top: 1px; }
        .login-warning-title {
          font-family: 'Space Mono', monospace;
          font-size: 0.58rem; font-weight: 700; letter-spacing: 0.12em;
          color: #ff6b4a; text-transform: uppercase; margin-bottom: 0.35rem;
        }
        .login-warning-text {
          font-family: 'Space Mono', monospace;
          font-size: 0.55rem; letter-spacing: 0.06em; line-height: 1.65;
          color: #555e6a; text-transform: uppercase;
        }

        /* Bottom status bar */
        .login-status-bar {
          width: 100%; max-width: 440px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 0; position: relative; z-index: 1;
          border-top: 1px solid rgba(255,107,74,0.06);
          margin-top: 0;
        }
        .login-status-item {
          display: flex; flex-direction: column; gap: 0.15rem;
        }
        .login-status-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.48rem; letter-spacing: 0.14em;
          color: #3d444d; text-transform: uppercase;
        }
        .login-status-val {
          font-family: 'Space Mono', monospace;
          font-size: 0.6rem; letter-spacing: 0.08em; color: #4ade80;
        }
        .login-status-val.white { color: #8b949e; }
      `}</style>

      {/* Backgrounds */}
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />
      <div className="login-side-text">Secure Command Control</div>
      <div className="login-node-text">
        0734
        <div className="login-node-sub">Forensic Node</div>
      </div>

      {/* Back */}
      <Link href="/" className="login-back">
        ← Back to Home
      </Link>

      {/* Header */}
      <div className="login-header">
        <div className="login-header-title"> Crime sight</div>
        <div className="login-header-node">Admin Login</div>
      </div>

      {/* Card */}
      <div className="login-card">
        <div className="login-card-top-bar" />
        <div className="login-card-corner" />

        <div className="login-card-body">
          

          {/* Error */}
          {error && (
            <div className="login-error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="login-field">
              <label className="login-field-label">Security Email</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 1 0 3.5 19.3"/></svg>
                <input
                  type="email"
                  placeholder="security@crimesight.lk"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-field-label">Access Cipher</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Extras */}
            <div className="login-extras">
              <label className="login-trust">
                <div className="login-trust-box" />
                <span className="login-trust-label">Trust this terminal</span>
              </label>
             
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="login-submit">
              {loading ? (
                <>
                  <div className="spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Initiate Session
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Warning block */}
        <div className="login-warning">
          <svg className="login-warning-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <div className="login-warning-title">Authorized Personnel Only</div>
            <div className="login-warning-text">
              All system activities are monitoring 24/7.
              <br />
              Unauthorized access attempts will be intercepted by the
              Sri Lanka Police Crime Unit.
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}