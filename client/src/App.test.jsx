import React from "react";
import { test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { Reveal } from "./components/Shared";
const meal = {
  id: "52772",
  name: "Teriyaki Chicken",
  image: "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
  category: "Chicken",
  area: "Japanese",
  instructions: "Cook thoroughly.",
  ingredients: [{ name: "Chicken", measure: "500 g" }],
};
function mockApi({
  loggedIn = false,
  failSearch = false,
  failDetails = false,
  initialIds = [],
} = {}) {
  let user = loggedIn
      ? { id: 1, name: "Crave Tester", email: "test@example.com" }
      : null,
    ids = initialIds,
    plan = [];
  const calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options = {}) => {
      calls.push([url, options]);
      const body = options.body ? JSON.parse(options.body) : {};
      let data = {},
        status = 200;
      if (url === "/api/auth/me") data = { user, csrf: "a".repeat(64) };
      else if (url === "/api/auth/register" || url === "/api/auth/login") {
        user = { id: 1, name: "Crave Tester", email: body.email };
        data = { user, csrf: "a".repeat(64) };
      } else if (url === "/api/auth/logout") {
        user = null;
      } else if (url === "/api/favorites") {
        if (options.method === "POST") ids = [body.mealId];
        else data = { ids };
      } else if (url.startsWith("/api/favorites/")) ids = [];
      else if (url === "/api/planner") data = { plan };
      else if (url.startsWith("/api/planner/")) {
        plan = [{ day: url.split("/").at(-1), mealId: body.mealId }];
      } else if (url === "/api/recipes/categories")
        data = { categories: [{ name: "Chicken" }] };
      else if (
        url.startsWith("/api/recipes/search") ||
        url.startsWith("/api/recipes/filter")
      ) {
        if (failSearch) {
          status = 502;
          data = { error: "Recipe service unavailable" };
        } else data = { meals: url.includes("nothing") ? [] : [meal] };
      } else if (
        url === "/api/recipes/random" ||
        url === "/api/recipes/52772"
      ) {
        if (failDetails) {
          status = 502;
          data = { error: "Details unavailable" };
        } else data = { meal };
      }
      return { ok: status === 200, status, json: async () => data };
    }),
  );
  return calls;
}
function start(path = "/") {
  window.history.replaceState({}, "", path);
  return render(<App />);
}
test("landing renders three sections; mobile menu and public signup navigation work", async () => {
  mockApi();
  const user = userEvent.setup();
  start();
  expect(
    await screen.findByRole("heading", { name: /Welcome to Crave/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /Your kitchen/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /Something delicious/ }),
  ).toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: "Open menu" });
  await user.click(toggle);
  expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await user.click(screen.getAllByRole("link", { name: /Get started/i })[0]);
  expect(
    await screen.findByRole("heading", { name: "A fresh start." }),
  ).toBeInTheDocument();
});
test("signup validates confirmation, submits and redirects into dashboard", async () => {
  const calls = mockApi();
  const user = userEvent.setup();
  start("/auth?mode=signup");
  await screen.findByRole("heading", { name: "A fresh start." });
  await user.type(screen.getByLabelText("Full name"), "Test User");
  await user.type(screen.getByLabelText("Email address"), "test@example.com");
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "password123",
  );
  await user.type(screen.getByLabelText("Confirm password"), "different");
  await user.click(screen.getByRole("button", { name: /Create your account/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("don’t match");
  await user.clear(screen.getByLabelText("Confirm password"));
  await user.type(screen.getByLabelText("Confirm password"), "password123");
  await user.click(screen.getByRole("button", { name: /Create your account/ }));
  expect(
    await screen.findByRole("heading", { name: /What are we cooking today/ }),
  ).toBeInTheDocument();
  expect(calls.some(([p]) => p === "/api/auth/register")).toBe(true);
});
test("protected routes redirect guests to login", async () => {
  mockApi();
  start("/app/planner");
  expect(
    await screen.findByRole("heading", { name: "Hello again." }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/auth");
});
test("dashboard searches, filters, empty state and details navigation", async () => {
  const calls = mockApi({ loggedIn: true });
  const user = userEvent.setup();
  start("/app");
  await screen.findByRole("heading", { name: "Teriyaki Chicken" });
  await user.type(screen.getByLabelText("Search recipes by name or category"), "nothing");
  await user.click(screen.getByRole("button", { name: "Search" }));
  expect(
    await screen.findByRole("heading", {
      name: "No recipes on this menu yet.",
    }),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Chicken", exact: true }),
  );
  await screen.findByRole("heading", { name: "Teriyaki Chicken" });
  expect(
    calls.some(([p]) => p === "/api/recipes/filter?category=Chicken"),
  ).toBe(true);
  await user.type(
    screen.getByLabelText("Have something in the fridge?"),
    "chicken breast",
  );
  await user.click(screen.getByRole("button", { name: "Find recipes" }));
  await waitFor(() =>
    expect(calls.some(([p]) => p.includes("ingredient=chicken%20breast"))).toBe(
      true,
    ),
  );
  await user.click(
    screen.getByRole("link", { name: "Teriyaki Chicken", exact: true }),
  );
  expect(
    await screen.findByRole("heading", { name: "The ingredients." }),
  ).toBeInTheDocument();
  expect(screen.getByText("Cook thoroughly.")).toBeInTheDocument();
});
test("network errors offer a retry", async () => {
  mockApi({ loggedIn: true, failSearch: true });
  start("/app");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Recipe service unavailable",
  );
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
test("details saves favorite, opens cookbook, and planner dialog saves selected day", async () => {
  const calls = mockApi({ loggedIn: true });
  const user = userEvent.setup();
  start("/app/recipe/52772");
  await screen.findByRole("heading", { name: "The ingredients." });
  await user.click(
    screen.getByRole("button", { name: /Save Teriyaki Chicken/ }),
  );
  expect(
    await screen.findByRole("button", { name: /Remove Teriyaki Chicken/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Add to meal planner" }));
  await user.selectOptions(screen.getByLabelText("Choose a day"), "Friday");
  await user.click(screen.getByRole("button", { name: "Save to this day" }));
  expect(
    await screen.findByText("Saved Teriyaki Chicken to Friday."),
  ).toBeInTheDocument();
  expect(
    calls.some(([p, o]) => p === "/api/planner/Friday" && o.method === "PUT"),
  ).toBe(true);
  await user.click(
    screen.getByRole("link", { name: "My Cookbook", exact: true }),
  );
  expect(
    await screen.findByRole("heading", { name: "My cookbook." }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "Teriyaki Chicken" }),
  ).toBeInTheDocument();
});
test("planner renders seven days and empty shopping state", async () => {
  mockApi({ loggedIn: true });
  start("/app/planner");
  for (const day of [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ])
    expect(
      await screen.findByRole("heading", { name: day }),
    ).toBeInTheDocument();
  expect(screen.getByText(/Add a recipe to your week/)).toBeInTheDocument();
});
test("reduced motion reveals remain visible without observing", () => {
  window.matchMedia.mockReturnValueOnce({ matches: true });
  render(
    <MemoryRouter>
      <Reveal>
        <h1>Always readable</h1>
      </Reveal>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading").parentElement).not.toHaveClass(
    "will-reveal",
  );
});

test("unavailable saved recipes can still be removed", async () => {
  mockApi({ loggedIn: true, failDetails: true, initialIds: ["52772"] });
  const user = userEvent.setup();
  start("/app/cookbook");
  await screen.findByRole("heading", { name: "Saved recipe 52772" });
  await user.click(
    screen.getByRole("button", {
      name: "Remove saved recipe 52772 from cookbook",
    }),
  );
  expect(
    await screen.findByRole("heading", {
      name: "Your cookbook is waiting for its first recipe.",
    }),
  ).toBeInTheDocument();
});
