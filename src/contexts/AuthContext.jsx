import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { AuthContext } from "./auth-context-instance";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserRole = useCallback(async () => {
    try {
      const user = await api.get("/auth/me");
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshUserRole();
      setLoading(false);
    })();
  }, [refreshUserRole]);

  async function login(email, password) {
    const user = await api.post("/auth/login", { email, password });
    setCurrentUser(user);
    return user;
  }

  async function signup(email, password, name) {
    const user = await api.post("/auth/signup", { email, password, name });
    setCurrentUser(user);
    return user;
  }

  async function logout() {
    await api.post("/auth/logout");
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    userRole: currentUser?.role ?? null,
    loading,
    login,
    signup,
    logout,
    refreshUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
