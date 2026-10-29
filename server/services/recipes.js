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
  return { request, lookup };
}
