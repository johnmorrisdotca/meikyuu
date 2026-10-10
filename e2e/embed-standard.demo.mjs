import { expect, test } from "@playwright/test";
import { serve } from "./demo.mjs";

test("the shared builder covers the labyrinth options and writes every host format", async ({ page }) => {
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));await serve(page);await page.goto("http://meikyuu.test/builder.html?lang=ja");
  await expect(page.locator("#bld-stage meikyuu-board svg")).toBeVisible();await expect(page.locator("#bld-preview-title")).toHaveText("プレビュー");await expect(page.locator("#bld-copy")).toHaveText("コードをコピー");
  for(const format of["element","iframe","module","react","vue","svelte","angular","html","url"]){await page.locator(`#bld-formats [data-format="${format}"]`).click();await expect(page.locator("#bld-code")).not.toHaveText("");}
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
for(const kind of["maze","arrows","mixed"])test(`the ${kind} daily level repeats in UTC`,async({page})=>{
  await serve(page);await page.goto(`http://meikyuu.test/embed/?kind=${kind}&daily=2026-10-09&size=small`);const board=page.locator("meikyuu-board");await expect(board.locator("svg")).toBeVisible();
  const puzzle=await board.evaluate(element=>element.mount.puzzle());await expect(board).toHaveAttribute("data-day","2026-10-09");await page.reload();await expect(board.locator("svg")).toBeVisible();expect(await board.evaluate(element=>element.mount.puzzle())).toEqual(puzzle);
});
test("properties preserve fit() and host drawing options without restarting play",async({page})=>{
  await serve(page);const label='<img src=x onerror="bad">';await page.goto(`http://meikyuu.test/embed/?level=1&size=small&theme=dark&controls=false&label=${encodeURIComponent(label)}`);const board=page.locator("meikyuu-board");await expect(board.locator("svg")).toBeVisible();await expect(board).toHaveAttribute("aria-label",label);expect(await page.locator("img").count()).toBe(0);
  const result=await board.evaluate(async element=>{const {defineBoard}=await import("../dist/element.js");defineBoard("article-labyrinth");defineBoard("article-labyrinth");const mount=element.mount;element.options={wall:.2,line:.3,onMove:()=>{window.heardMove=true;}};element.fit="width";return{same:element.mount===mount,fit:typeof element.fit,attribute:element.getAttribute("fit"),hint:typeof element.hint,width:element.style.width};});
  expect(result).toEqual({same:true,fit:"function",attribute:"width",hint:"function",width:"320px"});
});
test("load messages are JSON-safe and copied iframe code fits a narrow article",async({page})=>{
  await serve(page);await page.goto("http://meikyuu.test/builder.html?lang=en");await expect(page.locator("#bld-stage meikyuu-board svg")).toBeVisible();await page.locator('#bld-formats [data-format="iframe"]').click();const code=(await page.locator("#bld-code").textContent()).replaceAll("https://johnmorrisdotca.github.io/meikyuu/","http://meikyuu.test/").replace('loading="lazy"','');
  await page.route("http://article.test/",route=>route.fulfill({contentType:"text/html",body:`<style>body{margin:0;width:320px}</style><script>window.messages=[];addEventListener("message",event=>{if(event.origin==="http://meikyuu.test")messages.push(event.data);});</script>${code}`}));await page.goto("http://article.test/");await expect(page.frameLocator("iframe").locator("meikyuu-board svg")).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.messages.some(message=>message.type==="meikyuu-load"))).toBe(true);const message=await page.evaluate(()=>window.messages.find(message=>message.type==="meikyuu-load"));expect(JSON.parse(JSON.stringify(message))).toEqual(message);
  const child=page.frames().find(frame=>frame.url().startsWith("http://meikyuu.test/embed/"));expect(await child.evaluate(()=>document.documentElement.scrollHeight<=window.innerHeight&&document.documentElement.scrollWidth<=window.innerWidth&&window.localStorage.length===0)).toBe(true);
  await page.goto("http://meikyuu.test/embed/?kind=invalid&level=-1&daily=2026-02-30&width=Infinity&recipe=not-a-recipe");const board=page.locator("meikyuu-board");await expect(board.locator("svg")).toBeVisible();await expect(board).not.toHaveAttribute("daily",/.*/);await expect(board).not.toHaveAttribute("width",/.*/);await expect(board).not.toHaveAttribute("recipe",/.*/);
});
