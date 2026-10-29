export function normalizeMeal(m) {
  return {
    id: m.idMeal,
    name: m.strMeal,
    image: m.strMealThumb,
    category: m.strCategory || "",
    area: m.strArea || "",
    instructions: m.strInstructions || "",
    youtube: /^https:\/\/(www\.)?youtube\.com\//.test(m.strYoutube || "")
      ? m.strYoutube
      : "",
    ingredients: Array.from({ length: 20 }, (_, i) => ({
      name: m[`strIngredient${i + 1}`]?.trim(),
      measure: m[`strMeasure${i + 1}`]?.trim() || "",
    })).filter((x) => x.name),
  };
}
export const validId = (id) => typeof id === "string" && /^\d{1,10}$/.test(id);
export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
export function recipeService(fetcher = fetch) {
  const cache = new Map();
  async function request(endpoint) {
    const existing = cache.get(endpoint);
    if (existing?.until > Date.now()) return existing.value;
    try {
      const response = await fetcher(
        `https://www.themealdb.com/api/json/v1/1/${endpoint}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw Error("Upstream error");
      const data = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        (!("meals" in data) && !Array.isArray(data.categories))
      )
        throw Error("Invalid upstream response");
      if (
        data.meals !== null &&
        data.meals !== undefined &&
        !Array.isArray(data.meals)
      )
        throw Error("Invalid meals");
      if (cache.size >= 300) cache.delete(cache.keys().next().value);
      if (endpoint !== "random.php")
        cache.set(endpoint, { until: Date.now() + 300000, value: data });
      return data;
    } catch {
      throw httpError(
        502,
        "Recipe service is unavailable. Please try again shortly.",
      );
    }
  }
  async function lookup(id) {
    if (!validId(id)) throw httpError(400, "Invalid recipe ID.");
    const data = await request(`lookup.php?i=${id}`);
    if (!data.meals?.[0]) throw httpError(404, "Recipe not found.");
    return normalizeMeal(data.meals[0]);
  }
  async function search(term) {
    const query = term.trim();
    // Start name search and category discovery together; category filtering only
    // runs for an exact category match. All requests reuse the existing cache.
    const [names, category] = await Promise.all([
      request(`search.php?s=${encodeURIComponent(query)}`).then(
        (data) => ({ data }),
        (error) => ({ error }),
      ),
      query
        ? request("categories.php")
            .then((data) => {
              const match = (data.categories || []).find(
                (c) =>
                  c.strCategory.trim().toLowerCase() === query.toLowerCase(),
              );
              return match
                ? request(
                    `filter.php?c=${encodeURIComponent(match.strCategory)}`,
                  )
                : null;
            })
            .catch(() => null)
        : null,
    ]);
    // Preserve usable results if either source is unavailable. With no usable
    // source, retain the service's existing safe upstream error response.
    if (names.error && category === null) throw names.error;
    const seen = new Set();
    return [...(names.data?.meals || []), ...(category?.meals || [])]
      .map(normalizeMeal)
      .filter((meal) => {
        const id = String(meal.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }
  return { request, lookup, search };
}
