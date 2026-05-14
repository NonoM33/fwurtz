import { test, expect } from "@playwright/test";

test.describe("Landing page — fidelity to the maquette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the brand hero with editorial tagline", async ({ page }) => {
    await expect(page).toHaveTitle(/Maison Fwurtz/);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Maison Fwurtz");
    await expect(heading).toContainText("votre alliée");
    await expect(heading).toContainText("au quotidien");
  });

  test("renders all six service cards", async ({ page }) => {
    const cards = page.locator(".services-grid .service-card");
    await expect(cards).toHaveCount(6);
    await expect(cards.nth(0)).toContainText("Création de");
    await expect(cards.nth(0)).toContainText("sites web");
    await expect(cards.nth(3)).toContainText("Accompagnement");
    await expect(cards.nth(3)).toContainText("juridique");
  });

  test("renders the testimonials section with three quotes", async ({ page }) => {
    const quotes = page.locator(".testimonial__quote");
    await expect(quotes).toHaveCount(3);
    await expect(page.locator(".testimonial__name").first()).toContainText("Camille Larue");
  });

  test("renders the stats band with four metrics", async ({ page }) => {
    await expect(page.locator(".stat")).toHaveCount(4);
    await expect(page.locator(".stat").nth(0)).toContainText("8");
    await expect(page.locator(".stat").nth(3)).toContainText("24");
  });

  test("opens and closes the 'Réserver un échange' modal", async ({ page }) => {
    const cta = page.locator(".hero__buttons a[data-open-rdv]");
    await cta.click();
    const modal = page.locator("#rdv-modal");
    await expect(modal).toHaveClass(/is-open/);
    await page.keyboard.press("Escape");
    await expect(modal).not.toHaveClass(/is-open/);
  });

  test("mounts the concierge FAB after page load", async ({ page }) => {
    const fab = page.locator("#mf-fab");
    await expect(fab).toBeVisible();
    await fab.click();
    await expect(page.locator("#mf-panel")).toHaveClass(/is-open/);
    // Greeting renders with Marie's name in the first message
    await expect(page.locator(".mf-msg--concierge").first()).toContainText(/Marie|Bonsoir/);
  });

  test("concierge sends a user message and renders the reply (fallback path)", async ({
    page,
  }) => {
    // /api/concierge will likely fail without GROQ_API_KEY in the test env;
    // the client must still surface a fallback reply so the conversation lives.
    await page.locator("#mf-fab").click();
    const input = page.locator("#mf-input");
    await input.fill("Bonjour, combien coûte un site ?");
    await page.locator("#mf-send").click();
    const messages = page.locator(".mf-msg--concierge .mf-msg__bubble");
    await expect(messages.last()).toBeVisible({ timeout: 30_000 });
    await expect(messages.last()).not.toBeEmpty();
  });

  test("footer exposes the legal links required for a French SME site", async ({ page }) => {
    const footer = page.locator(".site-footer");
    await expect(footer.getByRole("link", { name: /Mentions légales/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Confidentialité/i })).toBeVisible();
  });
});

test.describe("Responsive — narrow viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("collapses navigation behind the burger toggle on mobile", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator(".nav__toggle");
    await expect(toggle).toBeVisible();
    await expect(page.locator(".nav__menu")).toBeHidden();
    await toggle.click();
    await expect(page.locator(".nav__mobile")).toHaveClass(/is-open/);
  });
});
