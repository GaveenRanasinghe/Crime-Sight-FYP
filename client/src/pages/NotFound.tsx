import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";

export default function UnauthorizedPage() {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setLocation("/auth/login");
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0c0f",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap');

        .unauth-card {
          width: 100%; max-width: 480px; margin: 1rem;
          background: #0d1117;
          border: 1px solid rgba(255,107,74,0.2);
          position: relative; overflow: hidden;
        }
        .unauth-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff6b4a, rgba(255,107,74,0.3), transparent);
        }
        .unauth-card-corner {
          position: absolute; top: 0; right: 0;
          width: 24px; height: 24px;
          border-top: 2px solid #ff6b4a;
          border-right: 2px solid #ff6b4a;
        }

        .unauth-icon-wrap {
          width: 80px; height: 80px; margin: 0 auto 2rem;
          background: rgba(255,107,74,0.08);
          border: 1px solid rgba(255,107,74,0.2);
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .unauth-icon-wrap::after {
          content: '';
          position: absolute; inset: -6px;
          border: 1px solid rgba(255,107,74,0.1);
        }
        .unauth-lock-badge {
          position: absolute; bottom: -6px; right: -6px;
          width: 22px; height: 22px;
          background: #ff6b4a;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem;
        }

        .unauth-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.6rem; line-height: 0.95;
          letter-spacing: 0.04em; color: #fff;
          margin-bottom: 1rem; text-align: center;
        }

        .unauth-desc {
          font-size: 0.88rem; color: #8b949e;
          line-height: 1.7; text-align: center;
          max-width: 340px; margin: 0 auto 2rem;
        }

        .unauth-codes {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0.75rem; margin-bottom: 2rem;
        }
        .unauth-code-block {
          background: #0a0c0f;
          border: 1px solid rgba(255,107,74,0.12);
          padding: 0.75rem 1rem;
        }
        .unauth-code-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.5rem; letter-spacing: 0.14em;
          color: #555e6a; text-transform: uppercase; margin-bottom: 0.3rem;
        }
        .unauth-code-val {
          font-family: 'Space Mono', monospace;
          font-size: 0.68rem; color: #ff6b4a; letter-spacing: 0.06em;
        }
        .unauth-code-val.amber { color: #facc15; }

        .btn-unauth-primary {
          width: 100%;
          background: #ff6b4a; color: #0a0c0f;
          font-family: 'Space Mono', monospace;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
          padding: 1rem; border: none; cursor: pointer;
          text-transform: uppercase; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .btn-unauth-primary:hover { background: #ff8c74; }

        .btn-unauth-secondary {
          width: 100%; background: transparent;
          border: 1px solid rgba(255,107,74,0.25); color: #ff6b4a;
          font-family: 'Space Mono', monospace;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em;
          padding: 0.75rem; cursor: pointer;
          text-transform: uppercase; transition: all 0.18s;
        }
        .btn-unauth-secondary:hover {
          background: rgba(255,107,74,0.06);
          border-color: rgba(255,107,74,0.5);
        }

        .unauth-footer {
          margin-top: 1.5rem; padding-top: 1.25rem;
          border-top: 1px solid rgba(255,107,74,0.08);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .unauth-footer-text {
          font-family: 'Space Mono', monospace;
          font-size: 0.52rem; letter-spacing: 0.12em;
          color: #3d444d; text-transform: uppercase;
        }
      `}</style>

      <div className="unauth-card" style={{ borderRadius: 0 }}>
        <div className="unauth-card-corner" />

        <div style={{ padding: "3rem 2.5rem 2.5rem" }}>

          {/* Icon */}
          <div className="unauth-icon-wrap">
            <Lock style={{ width: 32, height: 32, color: "#ff6b4a" }} />
            <div className="unauth-lock-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#0a0c0f" stroke="#0a0c0f" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="unauth-title">
            Authorization<br/>Required
          </h1>

          {/* Description */}
          <p className="unauth-desc">
            You need to be logged in to access this page.
            This page is for authorized users only.
          </p>

          
          {/* CTA */}
          <button className="btn-unauth-primary" onClick={handleLogin}>
            <Lock style={{ width: 13, height: 13 }} />
            Go to Login
          </button>

         

          {/* Footer */}
          <div className="unauth-footer">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3d444d" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="unauth-footer-text">Secured by Sri Lanka Police</span>
          </div>

        </div>
      </div>
    </div>
  );
}