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

function Navigation({ onSidebarStateChange }: { onSidebarStateChange: (open: boolean) => void }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = (open: boolean) => {
    setSidebarOpen(open);
    onSidebarStateChange(open);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/"); // redirect to home
  };

  return (
    <>
      <div className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl transition-all duration-300 z-50 ${
        sidebarOpen ? "w-64" : "w-20"
      }`}>
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="p-6 border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
        <img
          src="/logo.png"
          alt="CrimeSight Logo"
          className="w-10 h-10 object-contain"
  />
</div>
              {sidebarOpen && (
                <span className="text-xl font-bold whitespace-nowrap">CrimeSight</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">

            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-700 transition">
              <span className="text-lg">🏠</span>
              {sidebarOpen && <span>Home</span>}
            </Link>

            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-700 transition">
              <span className="text-lg">📊</span>
              {sidebarOpen && <span>Dashboard</span>}
            </Link>

            <Link href="/map" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-700 transition">
              <span className="text-lg">🗺️</span>
              {sidebarOpen && <span>Crime Map</span>}
            </Link>

            <Link href="/predictions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-700 transition">
              <span className="text-lg">🔮</span>
              {sidebarOpen && <span>Predictions</span>}
            </Link>

          </nav>

          {/* User section */}
          <div className="border-t border-blue-700 p-3 space-y-3">
            {isAuthenticated ? (
              <>
                {sidebarOpen && (
                  <div className="px-4 py-2 text-sm truncate">
                    <p className="text-blue-200 text-xs">Logged in as</p>
                    <p className="font-semibold truncate">{user?.email}</p>
                  </div>
                )}

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="bg-white text-blue-900 hover:bg-blue-50 w-full"
                >
                  {sidebarOpen ? "Logout" : "🚪"}
                </Button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block bg-white text-blue-900 px-4 py-2 rounded font-semibold hover:bg-blue-50 text-center"
              >
                {sidebarOpen ? "Login" : "🔐"}
              </Link>
            )}
          </div>

          {/* Sidebar Toggle */}
          <button
            onClick={() => handleToggleSidebar(!sidebarOpen)}
            className="w-full p-4 border-t border-blue-700 hover:bg-blue-700 transition flex items-center justify-center"
          >
            {sidebarOpen ? <span>‹</span> : <span>›</span>}
          </button>

        </div>
      </div>
    </>
  );
}

function Router({ sidebarOpen }: { sidebarOpen: boolean }) {
  return (
    <main
      style={{
        marginLeft: sidebarOpen ? "256px" : "80px",
        transition: "margin-left 0.3s ease",
      }}
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth/login" component={LoginPage} />

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

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Navigation onSidebarStateChange={setSidebarOpen} />
          <Router sidebarOpen={sidebarOpen} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;