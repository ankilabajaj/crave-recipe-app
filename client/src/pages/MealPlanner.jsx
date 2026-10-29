import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ArrowUpRight, Copy, Printer } from "lucide-react";
import { api, days } from "../services/api";
import {
  FoodImage,
  PageTitle,
  Loading,
  ErrorState,
} from "../components/Shared";
export default function MealPlanner() {
  const [plan, setPlan] = useState([]),
    [meals, setMeals] = useState({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [failed, setFailed] = useState([]),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [checked, setChecked] = useState({}),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const { plan } = await api("/planner", { signal: controller.signal });
        const ids = [...new Set(plan.map((x) => x.mealId))];
        const results = await Promise.allSettled(
          ids.map((id) => api(`/recipes/${id}`, { signal: controller.signal })),
        );
        if (controller.signal.aborted) return;
        setPlan(plan);
        setMeals(
          Object.fromEntries(
            results.flatMap((r, i) =>
              r.status === "fulfilled" ? [[ids[i], r.value.meal]] : [],
            ),
          ),
        );
        setFailed(
          results.flatMap((r, i) => (r.status === "rejected" ? [ids[i]] : [])),
        );
        setChecked({});
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [retry]);
  async function remove(day) {
    setBusy(day);
    setNotice("");
    try {
      await api(`/planner/${day}`, { method: "DELETE" });
      setPlan((p) => p.filter((x) => x.day !== day));
      setNotice(`${day} is now free for a new craving.`);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy("");
    }
  }
  const list = days.flatMap((day) => {
    const entry = plan.find((x) => x.day === day),
      meal = entry && meals[entry.mealId];
    return meal
      ? meal.ingredients.map((i, index) => ({
          ...i,
          key: `${day}-${entry.mealId}-${index}`,
          day,
          meal: meal.name,
        }))
      : [];
  });
  async function copy() {
    const text = list
      .map(
        (i) =>
          `${checked[i.key] ? "[x]" : "[ ]"} ${i.measure} ${i.name} — ${i.day} (${i.meal})`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Shopping list copied.");
    } catch {
      setNotice("Clipboard access is unavailable. Use Print list instead.");
    }
  }
  return (
    <div className="wrap app-page planner-page">
      <PageTitle
        eyebrow="A little planning. A lot to look forward to."
        title="Your week, well fed."
      >
        <p>Seven days. Your favorite flavors. One delicious plan.</p>
        <span className="plan-caption">
          One recipe per day · A reusable week · Changes save automatically
        </span>
      </PageTitle>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <Loading text="Setting your table for the week…" />
      ) : error ? (
        <ErrorState message={error} retry={() => setRetry((x) => x + 1)} />
      ) : (
        <>
          {failed.some((id) => plan.some((entry) => entry.mealId === id)) && (
            <div className="notice error" role="alert">
              Some planned recipes could not be loaded. The shopping list is
              incomplete.{" "}
              <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
            </div>
          )}
          <div className="week-grid">
            {days.map((day, index) => {
              const entry = plan.find((x) => x.day === day),
                meal = entry && meals[entry.mealId];
              return (
                <article className="day-card" key={day}>
                  <header>
                    <span className="eyebrow">DAY 0{index + 1}</span>
                    <h2>{day}</h2>
                  </header>
                  {entry ? (
                    <>
                      <Link
                        to={`/app/recipe/${entry.mealId}`}
                        className="planned-image"
                      >
                        <FoodImage
                          src={meal?.image}
                          alt={meal?.name || `Recipe ${entry.mealId}`}
                          loading="lazy"
                          width="400"
                          height="300"
                        />
                      </Link>
                      <div className="day-content">
                        <h3>
                          <Link to={`/app/recipe/${entry.mealId}`}>
                            {meal?.name ||
                              `Recipe ${entry.mealId} (unavailable)`}
                          </Link>
                        </h3>
                        <Link
                          className="text-link"
                          to={`/app?${new URLSearchParams({ planDay: day })}`}
                        >
                          Replace <ArrowUpRight size={15} />
                        </Link>
                        <button
                          className="remove-meal"
                          disabled={!!busy}
                          aria-label={`Remove ${day} meal`}
                          onClick={() => remove(day)}
                        >
                          <Trash2 size={15} />
                          {busy === day ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <Link
                      className="day-empty"
                      to={`/app?${new URLSearchParams({ planDay: day })}`}
                    >
                      <Plus size={27} />
                      <strong>What sounds good?</strong>
                      <span>Explore & add a recipe</span>
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
          <section
            className="shopping-section"
            aria-labelledby="shopping-heading"
          >
            <div className="shopping-heading">
              <div>
                <p className="eyebrow">From the plan to the pantry</p>
                <h2 id="shopping-heading">Your shopping list.</h2>
                <p>
                  Measurements stay separate for each meal. No guesswork with
                  units.
                </p>
              </div>
              <div className="button-row">
                <button
                  className="button outline small"
                  disabled={!list.length}
                  onClick={copy}
                >
                  <Copy size={16} />
                  Copy list
                </button>
                <button
                  className="button outline small"
                  disabled={!list.length}
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  Print list
                </button>
              </div>
            </div>
            {list.length ? (
              <ul className="shopping-list">
                {list.map((i) => (
                  <li key={i.key}>
                    <label className={checked[i.key] ? "checked" : ""}>
                      <input
                        type="checkbox"
                        checked={!!checked[i.key]}
                        onChange={(e) =>
                          setChecked({ ...checked, [i.key]: e.target.checked })
                        }
                      />
                      <span>
                        <strong>
                          {i.measure} {i.name}
                        </strong>
                        <small>
                          {i.day} · {i.meal}
                        </small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice">
                Add a recipe to your week to start your shopping list.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
