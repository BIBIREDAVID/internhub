import { useContext } from "react";
import { AuthContext } from "./auth-context-instance";

export function useAuth() {
  return useContext(AuthContext);
}
