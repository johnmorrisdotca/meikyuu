// A server that wants to trust a level takes a recipe and rebuilds the maze, with no page at all.
import { buildMaze, parseRecipe, solutionOf } from "@johnmorrisdotca/meikyuu";

const recipe = parseRecipe("heart:25:wilson:to-goal:5"); // null when it is not a recipe
if (recipe === null) throw new Error("not a maze this site makes");
const solution = solutionOf(buildMaze(recipe)); // the one way through, cell by cell
console.log(solution.length > 0, parseRecipe("nonsense")); // true null
