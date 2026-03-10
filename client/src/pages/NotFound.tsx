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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse" />
              <Lock className="relative h-16 w-16 text-amber-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Authorization Required
          </h1>

          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            Please log in to continue
          </h2>

          <p className="text-slate-600 mb-8 leading-relaxed">
            You need to be logged in to access this page.
            <br />
            This page is for authorized users only.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Lock className="w-4 h-4 mr-2" />
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
