"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi, profileApi, AuthUser, Profile } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (userData: AuthUser) => Promise<void>;
  register: (userData: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/register"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const pathname = usePathname();
  const router = useRouter();

  const fetchProfileForUser = async (u: AuthUser) => {
    if (u.hasProfile && u.userId) {
      try {
        const res = await profileApi.getByUserId(u.userId);
        setProfile(res.data);
      } catch {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
      await fetchProfileForUser(res.data);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Route protection logic
  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push("/login");
      }
    } else {
      if (!user.hasProfile) {
        if (pathname !== "/create-profile") {
          router.push("/create-profile");
        }
      } else {
        if (PUBLIC_PATHS.includes(pathname) || pathname === "/create-profile") {
          router.push("/");
        }
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (userData: AuthUser) => {
    setUser(userData);
    await fetchProfileForUser(userData);
  };

  const register = async (userData: AuthUser) => {
    setUser(userData);
    setProfile(null);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setProfile(null);
      // Clear match state so the chat phone hides until the next match.
      if (typeof window !== "undefined") {
        localStorage.removeItem("isMatched");
        localStorage.removeItem("matchedUserId");
        window.dispatchEvent(new CustomEvent("heartmate_reset"));
      }
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshUser }}>
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
