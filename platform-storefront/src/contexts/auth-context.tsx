'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { LoginDto, RegisterDto, LoginResponse } from '@/types/auth';

interface NormalizedUser {
  userId?: string | null;
  id?: string | null;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  [key: string]: any;
}

interface AuthContextType {
  user: NormalizedUser | null;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: NormalizedUser | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_USER = 'storefront_auth_user_v3';
const STORAGE_TOKEN = 'storefront_auth_token_v3';

// ✅ универсально достаём token
function extractToken(response: any): string | null {
  return (
    response?.accessToken ??
    response?.token ??
    response?.jwt ??
    response?.authToken ??
    null
  );
}

function normalizeUser(raw: any): NormalizedUser | null {
  if (!raw) return null;

  return {
    ...raw,
    id: raw.id ?? raw.userId ?? null,
    userId: raw.userId ?? raw.id ?? null,
    name: raw.name ?? raw.firstName ?? null,
    surname: raw.surname ?? raw.lastName ?? null,
    email: raw.email ?? null,
    phoneNumber: raw.phoneNumber ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<NormalizedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ✅ bootstrap без auth/me
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER);

    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser));
      } catch {
        setUserState(null);
      }
    }

    setIsLoading(false);
  }, []);

  const setUser = useCallback((value: NormalizedUser | null) => {
    const normalized = normalizeUser(value);
    setUserState(normalized);

    if (!normalized) {
      localStorage.removeItem(STORAGE_USER);
      return;
    }

    localStorage.setItem(STORAGE_USER, JSON.stringify(normalized));
  }, []);

  const login = useCallback(
    async (data: LoginDto) => {
      setIsLoading(true);
      try {
        const response: LoginResponse = await authAPI.login(data);

        const token = extractToken(response);
        if (token) {
          localStorage.setItem(STORAGE_TOKEN, token);
        }

        const normalized = normalizeUser(response);
        setUserState(normalized);

        localStorage.setItem(STORAGE_USER, JSON.stringify(normalized));

        router.replace('/');
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterDto) => {
      setIsLoading(true);
      try {
        const response: LoginResponse = await authAPI.register(data);

        const token = extractToken(response);
        if (token) {
          localStorage.setItem(STORAGE_TOKEN, token);
        }

        const normalized = normalizeUser(response);
        setUserState(normalized);

        localStorage.setItem(STORAGE_USER, JSON.stringify(normalized));

        router.replace('/');
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authAPI.logout();
    } finally {
      localStorage.removeItem(STORAGE_USER);
      localStorage.removeItem(STORAGE_TOKEN);

      setUserState(null);
      setIsLoading(false);

      router.replace('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}