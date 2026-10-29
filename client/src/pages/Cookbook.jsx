import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useCookbook } from "../context/Cookbook";
import {
  FavoriteButton,
  PageTitle,
  RecipeCard,
  Loading,
  ErrorState,
  Empty,
  ExploreLink,
} from "../components/Shared";
export default function Cookbook() {
  const { ids, error, loading, refresh } = useCookbook();
  const [meals, setMeals] = useState([]),
    [fetching, setFetching] = useState(false),
    [failed, setFailed] = useState([]),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFetching(true);
    Promise.allSettled(
      ids.map((id) => api(`/recipes/${id}`, { signal: controller.signal })),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setMeals(
        results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value.meal),
      );
      setFailed(
        results.flatMap((r, i) => (r.status === "rejected" ? [ids[i]] : [])),
      );
      setFetching(false);
    });
    return () => controller.abort();
  }, [ids, retry]);
  return (
    <div className="wrap app-page">
      <PageTitle eyebrow="Collected with love" title="My cookbook.">
        <p>The keepers. The comfort food. The “make this again” recipes.</p>
      </PageTitle>
      {error ? (
        <ErrorState message={error} retry={refresh} />
      ) : loading || fetching ? (
        <Loading text="Opening your cookbook…" />
      ) : (
        <>
          {failed.length > 0 && (
            <div className="notice error" role="alert">
              {failed.length} saved recipe(s) could not be loaded. Your saved
              IDs are safe.{" "}
              <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
            </div>
          )}
          {ids.length ? (
            <div className="recipe-grid">
              {failed.map((id) => (
                <article className="recipe-card" key={id}>
                  <div className="card-content">
                    <p className="eyebrow">Details unavailable</p>
                    <h3>Saved recipe {id}</h3>
                    <p className="quiet">
                      The recipe source could not return this dish. Retry above,
                      or remove it from your cookbook.
                    </p>
                    <FavoriteButton
                      large
                      meal={{ id, name: `saved recipe ${id}` }}
                    />
                  </div>
                </article>
              ))}
              {meals.map((meal) => (
                <RecipeCard key={meal.id} meal={meal} />
              ))}
            </div>
          ) : (
            <Empty title="Your cookbook is waiting for its first recipe.">
              <p>Find a dish you love and tap the heart to keep it here.</p>
              <ExploreLink />
            </Empty>
          )}
        </>
      )}
    </div>
  );
}
