// 认证 Hook：管理 token 存取和登录状态
"use client";
import { useState, useCallback } from "react";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 组件挂载时从 localStorage 恢复 token
  const restore = useCallback(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    setLoaded(true);
  }, []);

  const login = useCallback((t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
  }, []);

  return { token, loaded, login, logout, restore, isAuthenticated: !!token };
}
