// The demo's "Put it in your page" is kazoku-ui's <kazoku-embed-panel>: its tabs, sizes and picker are all there, the code follows the board's choices, and the picture is the code running.
import { expect, test } from "@playwright/test";

import { serve } from "./demo.mjs";

const P = '[data-testid="embed-panel"]';
const open = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await serve(page);
  await page.goto(`http://meikyuu.test/${query}`);
  await page.locator(`${P} [part="copy"]`).scrollIntoViewIfNeeded();
  await expect(page.locator(`${P} [part="copy"]`)).toBeVisible();
  return errors;
};
const code = (page) => page.locator(`${P} [part="code"]`);

test("the panel holds the family's seven tabs, four sizes, a picker of the three kinds, Copy and the two links", async ({
  page,
}) => {
  const errors = await open(page);
  await expect(page.locator(`${P} [part="tab"]`)).toHaveText([
    "HTML",
    "ES module",
    "React",
    "Vue",
    "Angular",
    "Svelte",
    "iframe",
  ]);
  await expect(page.locator(`${P} [part="size-button"]`)).toHaveText(["240", "320", "480", "640"]);
  await expect(page.locator(`${P} [part="size-button"][aria-pressed="true"]`)).toHaveText("480");
  await expect(page.locator('[data-testid="embed-picker"] button')).toHaveCount(3);
  await expect(page.locator(`${P} [part="copy"]`)).toHaveText(/Copy/);
  await expect(page.locator(`${P} [part="open"]`)).toBeVisible();
  await expect(page.locator(`${P} [part="docs"]`)).toBeVisible();
  await expect(page.locator(`${P} meikyuu-board svg`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("the code follows the kind, the level, the board and the size", async ({ page }) => {
  await open(page);
  await expect(code(page)).toContainText('<meikyuu-board level="40" width="480"></meikyuu-board>');
  await page.locator('[data-testid="embed-picker"] button[data-id="arrows"]').click();
  await expect(code(page)).toContainText('kind="arrows"');
  await page.locator('[data-testid="embed-level"]').fill("3");
  await expect(code(page)).toContainText('level="3"');
  await page.locator('[data-testid="embed-boards"] button[data-board="wood"]').click();
  await expect(code(page)).toContainText('board="wood"');
  await page.locator(`${P} button[data-size="320"]`).click();
  await expect(code(page)).toContainText('width="320"');
  await expect(page.locator(`${P} meikyuu-board`)).toHaveAttribute("kind", "arrows");
  await page.locator(`${P} button[data-kind="iframe"]`).click();
  await expect(code(page)).toContainText("/meikyuu/embed/?kind=arrows&amp;level=3&amp;board=wood&amp;width=480");
  await page.locator(`${P} button[data-kind="react"]`).click();
  await expect(code(page)).toContainText("@johnmorrisdotca/meikyuu/element/define");
});

test("the panel and its words follow the page's language", async ({ page }) => {
  await open(page);
  await page.locator('kazoku-language-picker [data-v="ja"]').click();
  await expect(page.locator('label[for="embed-level"]')).toHaveText("レベル");
  await expect(page.locator(`${P} [part="copy"]`)).toHaveText(/コピー/);
  await page.locator('kazoku-language-picker [data-v="en"]').click();
  await expect(page.locator('label[for="embed-level"]')).toHaveText("Level");
});

test("every control is a finger wide and the page does not scroll sideways", async ({ page }) => {
  await open(page);
  const small = await page.locator(`${P} button:not(meikyuu-board *), ${P} input`).evaluateAll((all) =>
    all
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => ({ name: element.textContent.trim(), height: element.getBoundingClientRect().height }))
      .filter((one) => one.height < 47.5),
  );
  expect(small).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
