import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Shuffle, ArrowUpRight } from "lucide-react";
import { api } from "../services/api";
import { useSession } from "../context/Session";
import { useCookbook } from "../context/Cookbook";
import { RecipeCard, Loading, Empty, ErrorState } from "../components/Shared";
export default function Dashboard() {
  const { user } = useSession();
  const cookbook = useCookbook();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || ""),
    [ingredient, setIngredient] = useState(params.get("ingredient") || "");
  const [categories, setCategories] = useState([]),
    [categoryError, setCategoryError] = useState(""),
    [categoryRetry, setCategoryRetry] = useState(0);
  const [meals, setMeals] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [randomBusy, setRandomBusy] = useState(false);
  const navigate = useNavigate();
  const category = params.get("category");
  useEffect(() => {
    const controller = new AbortController();
    api("/recipes/categories", { signal: controller.signal })
      .then((d) => {
        setCategories(d.categories);
        setCategoryError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCategoryError(e.message);
      });
    return () => controller.abort();
  }, [categoryRetry]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const category = params.get("category"),
      ingredient = params.get("ingredient");
    const path = category
      ? `filter?category=${encodeURIComponent(category)}`
      : ingredient
        ? `filter?ingredient=${encodeURIComponent(ingredient)}`
        : `search?q=${encodeURIComponent(params.get("q") || "")}`;
    api(`/recipes/${path}`, { signal: controller.signal })
      .then((d) => setMeals(d.meals))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params, retry]);
  async function surprise() {
    setRandomBusy(true);
    try {
      const d = await api("/recipes/random");
      navigate(`/app/recipe/${d.meal.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setRandomBusy(false);
    }
  }
  return (
    <div className="wrap app-page">
      <div className="discovery-banner">
        <div>
          <p className="eyebrow">
            Let’s get cooking, {user.name.split(" ")[0]}.
          </p>
          <h1>
            What are we
            <br />
            cooking <em>today?</em>
          </h1>
          <p>Follow a craving. Find a favorite. Make it yours.</p>
        </div>
        <div className="banner-note">
          <span aria-hidden="true">✳</span>
          <p>
            A little inspiration
            <br />
            goes a long way.
          </p>
        </div>
      </div>
      {params.get("planDay") && (
        <p className="notice">
          Choose a recipe for {params.get("planDay")}, open its details, and
          select Add to meal planner.
        </p>
      )}
      <div className="search-row">
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({
              ...(query.trim() ? { q: query.trim() } : {}),
              ...(params.get("planDay")
                ? { planDay: params.get("planDay") }
                : {}),
            });
          }}
        >
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="recipe-query">
            Search recipes by name or category
          </label>
          <input
            id="recipe-query"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a recipe or category, e.g. pasta"
          />
          <button className="button small">
            Search <ArrowUpRight size={17} />
          </button>
        </form>
        <button
          className="button outline"
          disabled={randomBusy}
          onClick={surprise}
        >
          <Shuffle size={18} />
          {randomBusy ? "Finding a surprise…" : "Surprise me"}
        </button>
      </div>
      <div className="filter-heading">
        <h2>Follow your appetite.</h2>
        <span className="quiet">Good things start with good ingredients.</span>
      </div>
      <div className="chips" aria-label="Recipe categories">
        <button
          className={
            !category && !params.get("ingredient") && !params.get("q")
              ? "chip selected"
              : "chip"
          }
          aria-pressed={
            !category && !params.get("ingredient") && !params.get("q")
          }
          onClick={() => {
            setParams({});
            setQuery("");
            setIngredient("");
          }}
        >
          All recipes
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            className={`chip ${category === c.name ? "selected" : ""}`}
            aria-pressed={category === c.name}
            onClick={() =>
              setParams({
                category: c.name,
                ...(params.get("planDay")
                  ? { planDay: params.get("planDay") }
                  : {}),
              })
            }
          >
            {c.name}
          </button>
        ))}
      </div>
      {categoryError && (
        <p className="notice error" role="alert">
          Categories: {categoryError}{" "}
          <button
            className="text-link"
            onClick={() => setCategoryRetry((x) => x + 1)}
          >
            Retry categories
          </button>
        </p>
      )}
      <form
        className="ingredient-filter"
        onSubmit={(e) => {
          e.preventDefault();
          if (ingredient.trim())
            setParams({
              ingredient: ingredient.trim(),
              ...(params.get("planDay")
                ? { planDay: params.get("planDay") }
                : {}),
            });
        }}
      >
        <label htmlFor="ingredient">Have something in the fridge?</label>
        <input
          id="ingredient"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          maxLength={100}
          placeholder="One ingredient, e.g. chicken breast"
          required
        />
        <button className="text-link">
          Find recipes <ArrowUpRight size={16} />
        </button>
      </form>
      {cookbook.error && (
        <p className="notice error" role="alert">
          Cookbook unavailable: {cookbook.error}{" "}
          <button onClick={cookbook.refresh}>Retry cookbook</button>
        </p>
      )}
      <div className="results-heading">
        <h2>
          {category ||
            (params.get("ingredient")
              ? `Made with ${params.get("ingredient")}`
              : params.get("q")
                ? `A taste of “${params.get("q")}”`
                : "Fresh inspiration")}
        </h2>
        {!loading && !error && (
          <span className="quiet">{meals.length} recipes to explore</span>
        )}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={() => setRetry((x) => x + 1)} />
      ) : meals.length ? (
        <div className="recipe-grid">
          {meals.map((meal) => (
            <RecipeCard key={meal.id} meal={meal} />
          ))}
        </div>
      ) : (
        <Empty title="No recipes on this menu yet.">
          <p>Try another dish, category, or a single main ingredient.</p>
          <button
            className="button outline"
            onClick={() => {
              setParams({});
              setQuery("");
              setIngredient("");
            }}
          >
            Explore all recipes
          </button>
        </Empty>
      )}
    </div>
  );
}
