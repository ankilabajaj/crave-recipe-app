import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ChefHat,
  Heart,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { useSession } from "../context/Session";
import { useCookbook } from "../context/Cookbook";
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Crave home">
      <ChefHat aria-hidden="true" size={29} />
      crave<span aria-hidden="true">✳</span>
    </Link>
  );
}
export function Navbar() {
  const { user, logout } = useSession();
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  return (
    <>
      <header className="nav-shell">
        <nav className="navbar wrap" aria-label="Main navigation">
          <Logo />
          <button
            className="icon-button mobile-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="main-links"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <div id="main-links" className={`nav-links ${open ? "open" : ""}`}>
            {user ? (
              <>
                <NavLink to="/app" end>
                  Explore
                </NavLink>
                <NavLink to="/app/cookbook">My Cookbook</NavLink>
                <NavLink to="/app/planner">Meal Planner</NavLink>
                <button
                  className="button small outline"
                  onClick={async () => {
                    try {
                      await logout();
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <a href="/#about">Our story</a>
                <Link to="/auth?mode=login">Log in</Link>
                <Link className="button small" to="/auth?mode=signup">
                  Get started <ArrowUpRight size={17} />
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      {error && (
        <div role="alert" className="notice error wrap">
          {error}
        </div>
      )}
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="wrap footer-content">
        <div>
          <Logo />
          <p>A little inspiration. A lot of delicious.</p>
        </div>
        <div>
          <Link to="/app">Explore recipes</Link>
          <Link to="/app/cookbook">My cookbook</Link>
          <Link to="/app/planner">Plan your week</Link>
        </div>
        <p>
          Recipes & photography from{" "}
          <a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">
            TheMealDB <ArrowUpRight size={14} />
          </a>
          <br />
          Made for the joy of cooking.
        </p>
      </div>
    </footer>
  );
}
export function Loading({ text = "Finding something delicious…" }) {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      {text}
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="state" role="alert">
      <h2>A little kitchen hiccup.</h2>
      <p>{message}</p>
      {retry && (
        <button className="button outline" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="state empty">
      <ChefHat size={42} aria-hidden="true" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function FoodImage({ src, alt, ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed || !src ? (
    <div
      className={`image-fallback ${props.className || ""}`}
      role="img"
      aria-label={alt}
    >
      <ChefHat size={48} />
      <span>Good things are cooking</span>
    </div>
  ) : (
    <img src={src} alt={alt} onError={() => setFailed(true)} {...props} />
  );
}
export function FavoriteButton({ meal, large = false }) {
  const { ids, toggle, error } = useCookbook();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const saved = ids.includes(meal.id);
  return (
    <div className={large ? "favorite-inline" : "favorite-wrap"}>
      <button
        className={large ? "button outline" : "icon-button favorite"}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} ${meal.name} ${saved ? "from" : "to"} cookbook`}
        disabled={busy || !!error}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await toggle(meal.id);
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Heart size={20} fill={saved ? "currentColor" : "none"} />
        {large &&
          (busy ? "Saving…" : saved ? "Saved to cookbook" : "Save to cookbook")}
      </button>
      {message && (
        <span className="inline-error" role="alert">
          {message}
        </span>
      )}
    </div>
  );
}
export function RecipeCard({ meal }) {
  const [params] = useSearchParams();
  const day = params.get("planDay");
  const suffix = day ? `?day=${encodeURIComponent(day)}` : "";
  return (
    <article className="recipe-card">
      <div className="card-photo">
        <Link
          to={`/app/recipe/${meal.id}${suffix}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <FoodImage
            src={meal.image}
            alt=""
            loading="lazy"
            width="480"
            height="360"
          />
        </Link>
        <FavoriteButton meal={meal} />
      </div>
      <div className="card-content">
        <span className="eyebrow">
          {meal.category || "A new favorite awaits"}
        </span>
        <h3>
          <Link to={`/app/recipe/${meal.id}${suffix}`}>{meal.name}</Link>
        </h3>
        <Link className="text-link" to={`/app/recipe/${meal.id}${suffix}`}>
          Let’s make it <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
export function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add("revealed");
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.12 },
    );
    element.classList.add("will-reveal");
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
export function PageTitle({ eyebrow, title, children }) {
  return (
    <div className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
export function ExploreLink() {
  return (
    <Link className="button" to="/app">
      Explore recipes <ArrowRight size={18} />
    </Link>
  );
}
