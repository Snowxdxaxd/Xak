import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, type AppUser } from '../lib/supabase';

interface AuthContextType {
  user: AppUser | null;
  userRole: 'student' | 'teacher' | 'parent' | 'superadmin' | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: (newToken: string, newUser: AppUser) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
  refreshUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'parent' | 'superadmin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserRole((session?.user?.user_metadata?.role as any) ?? 'student');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserRole((session?.user?.user_metadata?.role as any) ?? 'student');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
  };

  const refreshUser = (newToken: string, newUser: AppUser) => {
    localStorage.setItem('app_session', JSON.stringify({ access_token: newToken, user: newUser }));
    setUser(newUser);
    setUserRole((newUser.user_metadata?.role as any) ?? 'student');
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
