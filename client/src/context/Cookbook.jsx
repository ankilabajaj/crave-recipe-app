import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { useSession } from "./Session";
const Context = createContext();
export function CookbookProvider({ children }) {
  const { user } = useSession();
  const [ids, setIds] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setIds((await api("/favorites")).ids);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user) refresh();
    else {
      setIds([]);
      setError("");
    }
  }, [user]);
  async function toggle(id) {
    const saved = ids.includes(id);
    await api(`/favorites${saved ? `/${id}` : ""}`, {
      method: saved ? "DELETE" : "POST",
      body: { mealId: id },
    });
    setIds((previous) =>
      saved
        ? previous.filter((x) => x !== id)
        : [id, ...previous.filter((x) => x !== id)],
    );
  }
  return (
    <Context.Provider value={{ ids, error, loading, refresh, toggle }}>
      {children}
    </Context.Provider>
  );
}
export const useCookbook = () => useContext(Context);
