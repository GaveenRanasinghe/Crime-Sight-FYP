import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CrimeMap from "./pages/CrimeMap";
import Predictions from "./pages/Predictions";
import LoginPage from "./pages/Login";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-900 font-bold">CP</span>
            </div>
            <span className="text-xl font-bold">CrimeSight</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-blue-200 transition">
              Home
            </Link>
            <Link href="/dashboard" className="hover:text-blue-200 transition">
              Dashboard
            </Link>
            <Link href="/map" className="hover:text-blue-200 transition">
              Crime Map
            </Link>
            <Link href="/predictions" className="hover:text-blue-200 transition">
              Predictions
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-4 border-l border-blue-700 pl-4">
                <span className="text-sm">{user?.email}</span>
                <Button
                  onClick={() => logout()}
                  variant="outline"
                  size="sm"
                  className="bg-white text-blue-900 hover:bg-blue-50"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="bg-white text-blue-900 px-4 py-2 rounded font-semibold hover:bg-blue-50"
              >
                Login
              </Link>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-3 pb-4">
            <Link href="/" className="block hover:text-blue-200 transition">
              Home
            </Link>
            <Link href="/dashboard" className="block hover:text-blue-200 transition">
              Dashboard
            </Link>
            <Link href="/map" className="block hover:text-blue-200 transition">
              Crime Map
            </Link>
            <Link href="/predictions" className="block hover:text-blue-200 transition">
              Predictions
            </Link>

            {isAuthenticated ? (
              <div className="flex flex-col gap-2 border-t border-blue-700 pt-3">
                <span className="text-sm">{user?.email}</span>
                <Button
                  onClick={() => logout()}
                  variant="outline"
                  size="sm"
                  className="bg-white text-blue-900 hover:bg-blue-50 w-full"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="block bg-white text-blue-900 px-4 py-2 rounded font-semibold hover:bg-blue-50 text-center"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function Router() {
  return (
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Navigation />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;