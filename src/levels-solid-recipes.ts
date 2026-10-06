import { MEIKYUU_SOLID_RECIPE_TEXT } from "./levels/solid-recipes.data.ts";

/**
 * THE RECIPES OF EVERY SOLID LEVEL AND NOTHING ELSE, in an entry of their own (`@johnmorrisdotca/meikyuu/3d/levels/recipes`): for a server, which has only to say which recipe is which level of a
 * solid and size, and has no use for the effort, the cells and the score that make the files of levels (`3d/levels`, `/dice`, `/shapes`) several times the size. All 5,760 recipes are about fifty
 * kilobytes here, with no code beside them, whatever the solid. A page that shows a level reads the file of its solid; the server that checks an answer reads this.
 */
const ALGORITHMS: Readonly<Record<string, string>> = { b: "backtracker", h: "hunt", g: "growing", p: "prim", k: "kruskal", w: "wilson" };

const KEPT = new Map<string, readonly string[]>();

/** The recipes of a solid at a size, in the order of its levels (level 1 first), as the codes `buildSolidMaze` takes; empty for a solid or a size there is none of. */
export function solidRecipesOf(kind: string, size: string): readonly string[] {
  const key = `${kind}/${size}`;
  const kept = KEPT.get(key);
  if (kept !== undefined) return kept;
  const text = MEIKYUU_SOLID_RECIPE_TEXT[kind]?.[size];
  if (text === undefined) return [];
  const colon = text.indexOf(":");
  const cut = text.slice(0, colon);
  const codes = text
    .slice(colon + 1)
    .split(",")
    .map((entry) => `${kind}:${cut}:${ALGORITHMS[entry[0]!]!}:${parseInt(entry.slice(1), 36)}`);
  KEPT.set(key, codes);
  return codes;
}

/** The place (from 1) a recipe has among the levels of a solid at a size, or null when it is not one of them. */
export function solidLevelNumberOf(kind: string, size: string, code: string): number | null {
  const at = solidRecipesOf(kind, size).indexOf(code);
  return at === -1 ? null : at + 1;
}
