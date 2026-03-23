import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Link, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CrimeMap from "./pages/CrimeMap";
import Predictions from "./pages/Predictions";
import LoginPage from "./pages/Login";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

const sidebarStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap');

  .sentinel-sidebar {
    position: fixed;
    left: 0; top: 0;
    height: 100vh;
    background: #080a0d;
    border-right: 1px solid rgba(255,107,74,0.15);
    display: flex;
    flex-direction: column;
    z-index: 50;
    transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }

  .sentinel-sidebar.open { width: 220px; }
  .sentinel-sidebar.closed { width: 56px; }

  /* Top grid line accent */
  .sidebar-top-accent {
    height: 2px;
    background: linear-gradient(90deg, #ff6b4a 0%, rgba(255,107,74,0.2) 60%, transparent 100%);
    flex-shrink: 0;
  }

  /* Logo area */
  .sidebar-logo {
    padding: 1.25rem 1rem;
    border-bottom: 1px solid rgba(255,107,74,0.1);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
    min-height: 64px;
  }
  .sidebar-logo-icon {
    width: 32px; height: 32px;
    background: #ff6b4a;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem; color: #0a0c0f; letter-spacing: 0.05em;
  }
  .sidebar-logo-text {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.1rem; letter-spacing: 0.15em;
    color: #fff; white-space: nowrap; overflow: hidden;
  }
  .sidebar-logo-sub {
    font-family: 'Space Mono', monospace;
    font-size: 0.48rem; letter-spacing: 0.18em;
    color: #555e6a; text-transform: uppercase;
    margin-top: 1px; white-space: nowrap;
  }

  /* Status indicator */
  .sidebar-status {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid rgba(255,107,74,0.08);
    display: flex; align-items: center; gap: 0.5rem;
    flex-shrink: 0; overflow: hidden;
  }
  .status-pulse {
    width: 5px; height: 5px; border-radius: 50%;
    background: #4ade80; flex-shrink: 0;
    animation: s-pulse 2s infinite;
  }
  @keyframes s-pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
  .status-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.5rem; letter-spacing: 0.12em;
    color: #4ade80; text-transform: uppercase; white-space: nowrap;
  }

  /* Section label */
  .nav-section-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.48rem; letter-spacing: 0.18em;
    color: #3d444d; text-transform: uppercase;
    padding: 1rem 1rem 0.4rem;
    white-space: nowrap; overflow: hidden;
  }

  /* Nav links */
  .sidebar-nav {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0.5rem 0.5rem;
    display: flex; flex-direction: column; gap: 2px;
  }
  .sidebar-nav::-webkit-scrollbar { width: 2px; }
  .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
  .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,107,74,0.2); }

  .nav-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    text-decoration: none; color: #8b949e;
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem; letter-spacing: 0.06em;
    text-transform: uppercase; white-space: nowrap;
    position: relative; overflow: hidden;
    border: 1px solid transparent;
    transition: all 0.18s;
  }
  .nav-item::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 2px; background: #ff6b4a;
    transform: scaleY(0); transition: transform 0.18s;
  }
  .nav-item:hover {
    color: #e2e8f0;
    background: rgba(255,107,74,0.05);
    border-color: rgba(255,107,74,0.1);
  }
  .nav-item:hover::before { transform: scaleY(1); }
  .nav-item.active {
    color: #ff6b4a;
    background: rgba(255,107,74,0.08);
    border-color: rgba(255,107,74,0.15);
  }
  .nav-item.active::before { transform: scaleY(1); }

  .nav-icon {
    width: 18px; height: 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }

  /* Divider */
  .nav-divider {
    height: 1px; background: rgba(255,107,74,0.08);
    margin: 0.5rem 0.75rem;
  }

  /* User section */
  .sidebar-user {
    border-top: 1px solid rgba(255,107,74,0.1);
    padding: 0.75rem 0.5rem;
    flex-shrink: 0;
  }
  .user-info {
    padding: 0.5rem 0.75rem 0.75rem;
    overflow: hidden;
  }
  .user-role {
    font-family: 'Space Mono', monospace;
    font-size: 0.48rem; letter-spacing: 0.14em;
    color: #555e6a; text-transform: uppercase; margin-bottom: 0.2rem;
  }
  .user-email {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem; color: #c9d1d9;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sidebar-logout {
    width: 100%;
    background: rgba(255,107,74,0.1);
    border: 1px solid rgba(255,107,74,0.25);
    color: #ff6b4a;
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.6rem; cursor: pointer;
    transition: all 0.18s; display: flex; align-items: center;
    justify-content: center; gap: 0.5rem; text-decoration: none;
  }
  .sidebar-logout:hover {
    background: rgba(255,107,74,0.18);
    border-color: rgba(255,107,74,0.5);
    color: #ff8c74;
  }
  .sidebar-login {
    width: 100%;
    background: #ff6b4a; color: #0a0c0f;
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.6rem; cursor: pointer;
    transition: all 0.18s; display: flex; align-items: center;
    justify-content: center; gap: 0.5rem; text-decoration: none;
    border: none;
  }
  .sidebar-login:hover { background: #ff8c74; }

  /* Toggle button */
  .sidebar-toggle {
    border-top: 1px solid rgba(255,107,74,0.08);
    padding: 0.75rem;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; background: transparent; border-left: none;
    border-right: none; border-bottom: none; width: 100%;
    color: #555e6a; transition: all 0.18s; flex-shrink: 0;
  }
  .sidebar-toggle:hover { background: rgba(255,107,74,0.05); color: #ff6b4a; }
  .toggle-chevron {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem; transition: transform 0.3s;
    display: flex; align-items: center; gap: 0.5rem;
  }

  /* Tooltip for collapsed state */
  .nav-item-tooltip {
    position: absolute; left: calc(100% + 12px);
    background: #161b22; border: 1px solid rgba(255,107,74,0.2);
    color: #e2e8f0; padding: 0.35rem 0.6rem;
    font-family: 'Space Mono', monospace; font-size: 0.6rem;
    letter-spacing: 0.08em; text-transform: uppercase;
    white-space: nowrap; pointer-events: none;
    opacity: 0; transition: opacity 0.15s; z-index: 100;
    top: 50%; transform: translateY(-50%);
  }
  .sentinel-sidebar.closed .nav-item:hover .nav-item-tooltip { opacity: 1; }
`;

// SVG icons inline — no external deps
const Icons = {
  Home: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Map: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  Predictions: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Logout: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Login: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

function Navigation({ onSidebarStateChange }: { onSidebarStateChange: (open: boolean) => void }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = (open: boolean) => {
    setSidebarOpen(open);
    onSidebarStateChange(open);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = [
    { href: "/", label: "Home", Icon: Icons.Home },
    { href: "/dashboard", label: "Dashboard", Icon: Icons.Dashboard },
    { href: "/map", label: "Crime Map", Icon: Icons.Map },
    { href: "/predictions", label: "Predictions", Icon: Icons.Predictions },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <>
      <style>{sidebarStyles}</style>
      <aside className={`sentinel-sidebar ${sidebarOpen ? "open" : "closed"}`}>

        {/* Top accent line */}
        <div className="sidebar-top-accent" />

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">SL</div>
          {sidebarOpen && (
            <div style={{ overflow: "hidden" }}>
              <div className="sidebar-logo-text">CRIME SIGHT</div>
              <div className="sidebar-logo-sub">Crime Prediction Hub </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="sidebar-status">
          <div className="status-pulse" />
          {sidebarOpen && <span className="status-label">System Online</span>}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {sidebarOpen && <div className="nav-section-label">Navigation</div>}

          {navItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? "active" : ""}`}
            >
              <span className="nav-icon"><Icon /></span>
              {sidebarOpen && <span>{label}</span>}
              {!sidebarOpen && (
                <span className="nav-item-tooltip">{label}</span>
              )}
            </Link>
          ))}

          <div className="nav-divider" />

          {sidebarOpen && <div className="nav-section-label">Data Layers</div>}
          <div style={{
            padding: sidebarOpen ? "0.4rem 0.75rem" : "0.4rem",
            display: "flex", flexDirection: "column", gap: "0.3rem"
          }}>
            {[["25", "Districts"], ["13", "Crime Types"], ["2021–23", "Period"]].map(([val, lbl]) => (
              <div key={lbl} style={{
                display: "flex", alignItems: "center",
                justifyContent: sidebarOpen ? "space-between" : "center",
                padding: "0.3rem 0",
                borderBottom: "1px solid rgba(255,107,74,0.05)"
              }}>
                {sidebarOpen ? (
                  <>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: "#555e6a", letterSpacing: "0.1em", textTransform: "uppercase" }}>{lbl}</span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "0.95rem", color: "#ff6b4a", lineHeight: 1 }}>{val}</span>
                  </>
                ) : (
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "0.85rem", color: "#ff6b4a", lineHeight: 1 }}>{val.replace("–23", "")}</span>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* User / Auth */}
        <div className="sidebar-user">
          {isAuthenticated ? (
            <>
              {sidebarOpen && (
                <div className="user-info">
                  <div className="user-role">Logged in as</div>
                  <div className="user-email">{user?.email}</div>
                </div>
              )}
              <button className="sidebar-logout" onClick={handleLogout}>
                <Icons.Logout />
                {sidebarOpen && <span>Logout</span>}
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="sidebar-login">
              <Icons.Login />
              {sidebarOpen && <span>Login</span>}
            </Link>
          )}
        </div>

        {/* Toggle */}
        <button
          className="sidebar-toggle"
          onClick={() => handleToggleSidebar(!sidebarOpen)}
          title={sidebarOpen ? "Collapse" : "Expand"}
        >
          <span className="toggle-chevron">
            {sidebarOpen ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
            {sidebarOpen && (
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Collapse
              </span>
            )}
          </span>
        </button>

      </aside>
    </>
  );
}

function Router({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Public routes that don't require auth
  const isPublicRoute = location === "/auth/login" || location === "/404";

  // Redirect unauthenticated users to login for any non-public route
  if (!isAuthenticated && !isPublicRoute) {
    return <LoginPage />;
  }

  return (
    <main
      style={{
        marginLeft: isPublicRoute ? "0" : sidebarOpen ? "220px" : "56px",
        transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)",
        minHeight: "100vh",
        background: "#0a0c0f",
      }}
    >
      <Switch>
        <Route path="/auth/login" component={LoginPage} />

        <Route path="/">
          {() => <ProtectedRoute component={Home} />}
        </Route>

        <Route path="/dashboard">
          {() => <ProtectedRoute component={Dashboard} />}
        </Route>

        <Route path="/map">
          {() => <ProtectedRoute component={CrimeMap} />}
        </Route>

        <Route path="/predictions">
          {() => <ProtectedRoute component={Predictions} />}
        </Route>

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </main>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  const isPublicRoute = location === "/auth/login" || location === "/404";

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {/* Hide sidebar on login/public pages and when not authenticated */}
          {isAuthenticated && !isPublicRoute && (
            <Navigation onSidebarStateChange={setSidebarOpen} />
          )}
          <Router sidebarOpen={isAuthenticated && !isPublicRoute ? sidebarOpen : false} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;