import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { api } from "../services/api";
import {
  FoodImage,
  FavoriteButton,
  Loading,
  ErrorState,
} from "../components/Shared";
import PlanPicker from "../components/PlanPicker";
export default function RecipeDetails() {
  const { id } = useParams();
  const [meal, setMeal] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [checked, setChecked] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setChecked({});
    api(`/recipes/${id}`, { signal: controller.signal })
      .then((d) => setMeal(d.meal))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);
  if (loading) return <Loading />;
  if (error)
    return <ErrorState message={error} retry={() => setRetry((x) => x + 1)} />;
  return (
    <article className="wrap app-page recipe-detail">
      <Link className="text-link back-link" to="/app">
        <ArrowLeft size={17} />
        Back to recipes
      </Link>
      <div className="detail-hero">
        <FoodImage src={meal.image} alt={meal.name} width="700" height="600" />
        <div>
          <p className="eyebrow">
            {[meal.category, meal.area].filter(Boolean).join(" / ") ||
              "From the Crave kitchen"}
          </p>
          <h1>{meal.name}</h1>
          <p className="detail-note">
            A little inspiration for your next homemade moment.
          </p>
          <div className="detail-actions">
            <FavoriteButton meal={meal} large />
            <PlanPicker meal={meal} />
          </div>
          {meal.youtube && (
            <a
              className="text-link"
              href={meal.youtube}
              target="_blank"
              rel="noreferrer"
            >
              Watch the cooking tutorial <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      </div>
      <div className="recipe-body">
        <section className="ingredients-panel">
          <p className="eyebrow">Everything you need</p>
          <h2>The ingredients.</h2>
          <p className="quiet">Check things off as you cook.</p>
          {meal.ingredients.length ? (
            <ul>
              {meal.ingredients.map((x, i) => (
                <li key={`${id}-${i}`}>
                  <label className={checked[i] ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={!!checked[i]}
                      onChange={(e) =>
                        setChecked({ ...checked, [i]: e.target.checked })
                      }
                    />
                    <span>{x.name}</span>
                    <strong>{x.measure}</strong>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p>No ingredients supplied by the recipe source.</p>
          )}
        </section>
        <section className="instructions">
          <p className="eyebrow">Let’s make something good</p>
          <h2>Into the kitchen.</h2>
          {meal.instructions ? (
            meal.instructions
              .split(/\r?\n+/)
              .filter((p) => p.trim())
              .map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>
              No cooking instructions were provided by TheMealDB for this
              recipe.
            </p>
          )}
          <p className="quiet attribution">
            Recipe and photography: TheMealDB. Follow safe food handling
            practices.
          </p>
        </section>
      </div>
    </article>
  );
}
