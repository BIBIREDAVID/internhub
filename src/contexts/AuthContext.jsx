import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AuthContext } from "./auth-context-instance";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadRole(user) {
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      setUserRole(docSnap.exists() ? docSnap.data().role ?? null : null);
    } catch (error) {
      console.error("Auth profile load error:", error);
      setUserRole(null);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadRole(user);
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Call after writing a users/{uid} doc for the current session (e.g. right
  // after self-provisioning during signup) so the role in context catches up
  // without waiting for another auth state change.
  async function refreshUserRole() {
    if (auth.currentUser) await loadRole(auth.currentUser);
  }

  const value = {
    currentUser,
    userRole,
    loading,
    refreshUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
