// Test-only upstream fixture. Production always uses TheMealDB.
import { createApp } from "../server/app.js";
import { openDatabase } from "../server/database/init.js";
const fixture = (id) => ({
  idMeal: id,
  strMeal: id === "52772" ? "Teriyaki Chicken" : "Vegetable Curry",
  strMealThumb:
    "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
  strCategory: "Chicken",
  strArea: "Japanese",
  strInstructions:
    "Prepare the ingredients.\nCook the chicken thoroughly before serving.",
  strIngredient1: "Chicken",
  strMeasure1: "500 g",
  strIngredient2: "Salt",
  strMeasure2: "A pinch",
});
const fetcher = async (url) => {
  const u = new URL(url);
  let data;
  if (u.pathname.endsWith("categories.php"))
    data = {
      categories: [{ strCategory: "Chicken" }, { strCategory: "Vegetarian" }],
    };
  else if (u.pathname.endsWith("lookup.php"))
    data = { meals: [fixture(u.searchParams.get("i"))] };
  else if (u.searchParams.get("s") === "nothing") data = { meals: null };
  else data = { meals: [fixture("52772"), fixture("52800")] };
  return { ok: true, json: async () => data };
};
createApp({
  db: openDatabase(":memory:"),
  fetcher,
  production: true,
  origin: "http://127.0.0.1:3010",
}).listen(3010, "127.0.0.1");
