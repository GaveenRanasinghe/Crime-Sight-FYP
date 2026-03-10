import { useAuth } from "@/_core/hooks/useAuth";
import { Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { getLoginUrl } from "@/const";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  requiredRole?: "admin" | "user";
}

export default function ProtectedRoute({ component: Component, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to access this page.</p>
          <a href="/" className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return <Component />;
}
