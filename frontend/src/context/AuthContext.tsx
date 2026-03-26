import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';

interface User { id: string; email: string; name: string; role: string; }
interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (token) {
      api.me().then(u => setUser(u)).catch(() => localStorage.removeItem('sm_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('sm_token', res.token);
    setUser(res.user);
  };

  const signup = async (data: any) => {
    const res = await api.signup(data);
    localStorage.setItem('sm_token', res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('sm_token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, signup, logout, loading }}>{children}</AuthContext.Provider>;
}
