import { createContext, useContext, useEffect, useState } from "react";
import { api, setCsrf } from "../services/api";
const Context = createContext();
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/auth/me");
      setUser(data.user);
      setCsrf(data.csrf);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    const reset = () => {
      setUser(null);
      setCsrf(null);
    };
    window.addEventListener("crave:unauthorized", reset);
    return () => window.removeEventListener("crave:unauthorized", reset);
  }, []);
  async function authenticate(mode, values) {
    const data = await api(`/auth/${mode}`, { method: "POST", body: values });
    setCsrf(data.csrf);
    setUser(data.user);
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setCsrf(null);
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, loading, error, refresh, authenticate, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
