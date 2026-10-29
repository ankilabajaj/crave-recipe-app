import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { SessionProvider, useSession } from "./context/Session";
import { CookbookProvider } from "./context/Cookbook";
import { Navbar, Footer, Loading, ErrorState } from "./components/Shared";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RecipeDetails from "./pages/RecipeDetails";
import Cookbook from "./pages/Cookbook";
import MealPlanner from "./pages/MealPlanner";
function Protected() {
  const { user } = useSession();
  return user ? <Outlet /> : <Navigate to="/auth?mode=login" replace />;
}
function Public({ children }) {
  const { user } = useSession();
  return user ? <Navigate to="/app" replace /> : children;
}
function Shell() {
  const { loading, error, refresh } = useSession();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const title = location.pathname.includes("planner")
      ? "Meal planner"
      : location.pathname.includes("cookbook")
        ? "My cookbook"
        : location.pathname.includes("recipe/")
          ? "Recipe"
          : location.pathname === "/app"
            ? "Explore"
            : location.pathname === "/auth"
              ? "Welcome"
              : "Discover. Cook. Enjoy.";
    document.title = `${title} — Crave`;
    document.getElementById("main-content")?.focus();
  }, [location.pathname]);
  if (loading) return <Loading text="Preparing your kitchen…" />;
  if (error) return <ErrorState message={error} retry={refresh} />;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={
              <Public>
                <Landing />
              </Public>
            }
          />
          <Route
            path="/auth"
            element={
              <Public>
                <Auth />
              </Public>
            }
          />
          <Route element={<Protected />}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/recipe/:id" element={<RecipeDetails />} />
            <Route path="/app/cookbook" element={<Cookbook />} />
            <Route path="/app/planner" element={<MealPlanner />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <CookbookProvider>
          <Shell />
        </CookbookProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
