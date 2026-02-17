"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authManager } from "@/lib/auth";
import type { AuthResult } from "@/types";

interface AuthContextType {
  user: { uid: string; email: string | null } | null;
  userType: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (
    email: string,
    password: string,
    name: string,
    userType: "personal" | "student",
    referralCode?: string | null
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  checkReferralCode: (
    code: string
  ) => Promise<{ exists: boolean; personalId?: string; personalName?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await authManager.initialize();

      authManager.onAuthStateChanged((firebaseUser, type) => {
        if (!mounted) return;
        if (firebaseUser) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
          setUserType(type);
        } else {
          setUser(null);
          setUserType(null);
        }
        setIsLoading(false);
      });
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    return authManager.login(email, password);
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      uType: "personal" | "student",
      referralCode?: string | null
    ) => {
      return authManager.signup(email, password, name, uType, referralCode || null);
    },
    []
  );

  const logout = useCallback(async () => {
    await authManager.logout();
  }, []);

  const checkReferralCode = useCallback(async (code: string) => {
    return authManager.checkReferralCode(code);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, userType, isLoading, login, signup, logout, checkReferralCode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
