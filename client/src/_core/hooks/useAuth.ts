import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthUser = {
  id: string;
  email: string | undefined;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      const sessionUser = data.session?.user;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              email: sessionUser.email,
            }
          : null
      );
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              email: sessionUser.email,
            }
          : null
      );
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
  };
}