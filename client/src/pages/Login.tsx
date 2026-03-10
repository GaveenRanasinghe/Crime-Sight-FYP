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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 px-6">

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-white/80 hover:text-white text-sm"
      >
        ← Back to Home
      </Link>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-8">

        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-900 text-white p-3 rounded-xl mb-3">
            <Shield size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">CrimeSight Login</h2>
          <p className="text-sm text-gray-500 mt-1">
            Admin Access
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* Email */}
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <div className="flex items-center border rounded-lg px-3 mt-1 focus-within:ring-2 focus-within:ring-blue-600">
              <Mail className="text-gray-400 mr-2" size={18} />
              <input
                type="email"
                placeholder=""
                className="w-full py-2 outline-none bg-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-600">Password</label>
            <div className="flex items-center border rounded-lg px-3 mt-1 focus-within:ring-2 focus-within:ring-blue-600">
              <Lock className="text-gray-400 mr-2" size={18} />
              <input
                type="password"
                placeholder=""
                className="w-full py-2 outline-none bg-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-2.5 rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : (
              "Login"
            )}
          </button>

        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
           Authorized Personnel Only
        </p>

      </div>
    </div>
  );
}