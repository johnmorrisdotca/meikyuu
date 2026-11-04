import { buildMaze, solutionOf, type Maze } from "@johnmorrisdotca/meikyuu";

const maze: Maze = buildMaze({ shape: "hexagon", w: 6, h: 6, algorithm: "kruskal", mode: "centre-out", seed: 3 });
console.log(maze.grid.cells, solutionOf(maze).length > 0);

// @ts-expect-error the cells are a count, not a name
const wrong: string = maze.grid.cells;
console.log(typeof wrong);
