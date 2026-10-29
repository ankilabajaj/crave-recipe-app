import { test, expect } from "@playwright/test";
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("six pages, persistent personal data, responsive layout and logout", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Images are unavailable in restricted environments: verify designed fallbacks.
  await page.route("https://www.themealdb.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to Crave." }),
  ).toBeVisible();
  await noOverflow(page);
  await page
    .getByRole("heading", { name: /Something delicious/ })
    .scrollIntoViewIfNeeded();
  await noOverflow(page);
  await page.goto("/auth?mode=signup");
  await expect(
    page.getByRole("heading", { name: "A fresh start." }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByLabel("Full name").fill("Browser Chef");
  await page
    .getByLabel("Email address")
    .fill(`chef-${testInfo.project.name}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-password123");
  await page.getByLabel("Confirm password").fill("browser-password123");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(
    page.getByRole("heading", { name: /What are we cooking today/ }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "Chicken", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Teriyaki Chicken" }),
  ).toBeVisible();
  await page.getByLabel("Search recipes by name").fill("nothing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No recipes on this menu yet." }),
  ).toBeVisible();
  await page.getByLabel("Have something in the fridge?").fill("chicken breast");
  await page.getByRole("button", { name: "Find recipes" }).click();
  await page
    .getByRole("link", { name: "Teriyaki Chicken", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The ingredients." }),
  ).toBeVisible();
  await noOverflow(page);
  await page
    .getByRole("button", { name: "Save Teriyaki Chicken to cookbook" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove Teriyaki Chicken from cookbook" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to meal planner" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Choose a day").selectOption("Friday");
  await page.getByRole("button", { name: "Save to this day" }).click();
  await expect(
    page.getByText("Saved Teriyaki Chicken to Friday."),
  ).toBeVisible();
  await page.goto("/app/cookbook");
  await expect(
    page.getByRole("heading", { name: "Teriyaki Chicken" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.goto("/app/planner");
  await expect(
    page.getByRole("heading", { name: "Teriyaki Chicken" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your shopping list." }),
  ).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await noOverflow(page);
  await page.getByRole("link", { name: "Replace", exact: true }).click();
  await page
    .getByRole("link", { name: "Vegetable Curry", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to meal planner" }).click();
  await expect(page.getByLabel("Choose a day")).toHaveValue("Friday");
  await expect(
    page.getByText("This replaces the recipe already planned for Friday."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save to this day" }).click();
  await expect(
    page.getByText("Saved Vegetable Curry to Friday."),
  ).toBeVisible();
  await page.goto("/app/planner");
  await expect(
    page.getByRole("heading", { name: "Vegetable Curry" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Vegetable Curry" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove Friday meal" }).click();
  await expect(
    page.getByText("Add a recipe to your week to start your shopping list."),
  ).toBeVisible();
  await page.goto("/app/cookbook");
  await page
    .getByRole("button", { name: "Remove Teriyaki Chicken from cookbook" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your cookbook is waiting for its first recipe.",
    }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hello again." }),
  ).toBeVisible();
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Hello again." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("reduced motion keeps landing content readable and keyboard menu usable", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://www.themealdb.com/**", (r) => r.abort());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to Crave." }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: /Your kitchen/ })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: /Your kitchen/ }),
  ).toBeVisible();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  if (testInfo.project.name === "mobile") {
    const menu = page.getByRole("button", { name: "Open menu" });
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Close menu" }),
    ).toHaveAttribute("aria-expanded", "true");
  }
  await page.getByRole("link", { name: "Log in", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Hello again." }),
  ).toBeVisible();
});
