import { describe, expect, it } from "vitest";

import { dragMaze, liftMaze, newMazeGame, playSolution, pressMaze, restartMaze, tapMaze, undoMaze, type MazeGame } from "./game.ts";
import { buildMaze, solutionOf, walk, type MazeRecipe } from "./maze.ts";
import { canLayStone, clearStones, decodeRun, encodeRun, hasStone, layStone, stoneLimitFor, stoneRulesOf, stonesLeft, takeStone, toggleStone, withStoneRules, type StoneRules } from "./stones.ts";

const recipe: MazeRecipe = { shape: "square", w: 12, h: 12, algorithm: "wilson", mode: "to-goal", seed: 31 };
const maze = buildMaze(recipe);
const way = solutionOf(maze);
const RULES: StoneRules = { limit: 3, reach: 2 };

/** A game with stones allowed and the line drawn along the way as far as `count` cells, as one stroke. */
function along(count: number, rules: StoneRules | null = RULES): MazeGame {
  let game = pressMaze(newMazeGame(maze, rules), way[0]!);
  for (const cell of way.slice(1, count)) game = dragMaze(game, cell);
  return liftMaze(game);
}

/** Cells joined to the way by a passage that are not on it: the side passages. */
const side = (cell: number): number[] => maze.links[cell]!.filter((next) => !way.includes(next));
/** The first cell of the way, from `from`, with a side passage, and that passage's first cell. */
const fork = (from: number): { at: number; into: number } => {
  for (let at = from; at < way.length - 1; at += 1) {
    const [into] = side(way[at]!);
    if (into !== undefined) return { at, into };
  }
  throw new Error("no fork");
};
/** The cells not on the way, with how many passages from the way each is. */
const away = walk(maze.links, way[0]!);

describe("the rules of a stone", () => {
  it("a game has none unless it is given rules, and every stone is refused", () => {
    const game = along(6, null);
    expect(game.rules).toBeNull();
    expect(canLayStone(game, side(way[2]!)[0] ?? way[8]!)).toBe("off");
    expect(layStone(game, way[8]!)).toBe(game);
    expect(stonesLeft(game)).toBe(0);
  });

  it("gives a few stones by default, more for a bigger maze, and reads an option", () => {
    expect(stoneLimitFor(100)).toBe(4);
    expect(stoneLimitFor(800)).toBe(5);
    expect(stoneLimitFor(4000)).toBe(9);
    expect(stoneLimitFor(10_000)).toBe(13);
    expect(stoneRulesOf(undefined, 100)).toBeNull();
    expect(stoneRulesOf(false, 100)).toBeNull();
    expect(stoneRulesOf(true, 100)).toEqual({ limit: 4, reach: 2 });
    expect(stoneRulesOf({ limit: null }, 100)).toEqual({ limit: null, reach: 2 });
    expect(stoneRulesOf({ limit: 7, reach: 1 }, 100)).toEqual({ limit: 7, reach: 1 });
    expect(stoneRulesOf({ reach: 9 }, 100)!.reach).toBe(2);
    expect(stoneRulesOf({ reach: 0 }, 100)!.reach).toBe(1);
    expect(stoneRulesOf({ limit: -3 }, 100)!.limit).toBe(0);
  });

  it("lays a stone on a passage cell beside the line, and nowhere with no line", () => {
    const { at, into } = fork(2);
    const game = along(at + 2);
    expect(canLayStone(game, into)).toBe("ok");
    const laid = layStone(game, into);
    expect(laid.stones).toEqual([into]);
    expect(hasStone(laid, into)).toBe(true);
    expect(stonesLeft(laid)).toBe(2);
    expect(canLayStone(newMazeGame(maze, RULES), into)).toBe("no-line");
  });

  it("refuses a cell the line is on, the start and the goal, and a cell with a stone (which is taken up instead)", () => {
    const { at, into } = fork(2);
    const game = along(at + 2);
    expect(canLayStone(game, way[1]!)).toBe("on-line");
    expect(canLayStone(game, maze.start)).toBe("on-line");
    expect(canLayStone(game, maze.goal)).not.toBe("ok");
    const laid = layStone(game, into);
    expect(canLayStone(laid, into)).toBe("has-stone");
    expect(layStone(laid, into)).toBe(laid);
    // The start and the goal are refused for what they are even when the line has not met them.
    const early = along(3);
    const nearStart = maze.links[maze.start]!.find((cell) => !early.path.includes(cell));
    if (nearStart !== undefined) expect(canLayStone(early, nearStart)).toBe("ok");
    expect(canLayStone(early, maze.goal)).toBe("end");
  });

  it("refuses a cell too far along the passages, and a cell behind a wall however near it is", () => {
    const game = along(4);
    const head = game.path[game.path.length - 1]!;
    const near = new Set<number>(game.path);
    // A cell more than two steps from every cell of the line, along the passages.
    const distance = new Map<number, number>();
    let frontier = [...game.path];
    for (const cell of frontier) distance.set(cell, 0);
    for (let step = 1; step <= 4; step += 1) {
      const next: number[] = [];
      for (const cell of frontier) for (const other of maze.links[cell]!) if (!distance.has(other)) {
        distance.set(other, step);
        next.push(other);
      }
      frontier = next;
    }
    const three = [...distance].find(([, d]) => d === 3)?.[0];
    expect(three).toBeDefined();
    expect(canLayStone(game, three!)).toBe("far");
    expect(canLayStone(withStoneRules(game, { limit: 3, reach: 1 }), [...distance].find(([, d]) => d === 2)![0])).toBe("far");
    expect(canLayStone(withStoneRules(game, { limit: 3, reach: 1 }), [...distance].find(([, d]) => d === 1)![0])).toBe("ok");
    expect(canLayStone(game, [...distance].find(([, d]) => d === 2)![0])).toBe("ok");
    // A cell right beside the line in the picture but shut off by a wall: its neighbour in the grid that is not joined to the head.
    const walled = maze.grid.neighbours[head]!.find((cell) => !maze.links[head]!.includes(cell) && !near.has(cell) && !game.path.some((on) => maze.links[on]!.includes(cell)));
    expect(walled).toBeDefined();
    expect(canLayStone(game, walled!)).toBe("far");
  });

  it("does not count a way through another stone", () => {
    const game = along(4);
    const head = game.path[game.path.length - 1]!;
    // The cell one step off the line by a passage, then the cell beyond it: with a stone on the first the second is out of reach.
    const first = maze.links[head]!.find((cell) => !game.path.includes(cell))!;
    const second = maze.links[first]!.find((cell) => cell !== head && !game.path.includes(cell));
    if (second === undefined) return;
    expect(canLayStone(game, second)).toBe("ok");
    const withFirst = layStone(withStoneRules(game, { limit: 3, reach: 1 }), first);
    expect(canLayStone(withStoneRules(withFirst, { limit: 3, reach: 2 }), second)).toBe("far");
  });

  it("stops at the limit, and taking a stone up gives it back", () => {
    let game = along(Math.min(way.length - 1, 30), { limit: 2, reach: 2 });
    const cells = game.path.flatMap((cell) => side(cell)).filter((cell, i, all) => all.indexOf(cell) === i && cell !== maze.goal);
    expect(cells.length).toBeGreaterThanOrEqual(3);
    game = layStone(layStone(game, cells[0]!), cells[1]!);
    expect(stonesLeft(game)).toBe(0);
    expect(canLayStone(game, cells[2]!)).toBe("limit");
    expect(layStone(game, cells[2]!)).toBe(game);
    const taken = takeStone(game, cells[0]!);
    expect(taken.stones).toEqual([cells[1]!]);
    expect(stonesLeft(taken)).toBe(1);
    expect(canLayStone(taken, cells[2]!)).toBe("ok");
    expect(takeStone(taken, cells[0]!)).toBe(taken);
  });

  it("has no limit when it is null", () => {
    let game = along(Math.min(way.length - 1, 40), { limit: null, reach: 2 });
    const cells = game.path.flatMap((cell) => side(cell)).filter((cell, i, all) => all.indexOf(cell) === i && cell !== maze.goal);
    for (const cell of cells.slice(0, 6)) game = layStone(game, cell);
    expect(game.stones.length).toBe(Math.min(6, cells.length));
    expect(stonesLeft(game)).toBeNull();
    expect(canLayStone(game, cells[0]!)).toBe("has-stone");
  });

  it("refuses a stone while a stroke is drawn and once the maze is solved", () => {
    const { at, into } = fork(2);
    const game = along(at + 2);
    expect(canLayStone(pressMaze(game, game.path[game.path.length - 1]!), into)).toBe("drawing");
    const solved = playSolution(newMazeGame(maze, RULES));
    expect(solved.solved).toBe(true);
    expect(canLayStone(solved, side(way[2]!)[0] ?? way[5]!)).toBe("solved");
  });

  it("toggles: a tap lays a stone, a tap on it takes it up, and a refusal says why", () => {
    const { at, into } = fork(2);
    const game = along(at + 2);
    const laid = toggleStone(game, into);
    expect(laid.how).toBe("laid");
    const taken = toggleStone(laid.game, into);
    expect(taken.how).toBe("taken");
    expect(taken.game.stones).toEqual([]);
    expect(toggleStone(game, way[1]!)).toMatchObject({ how: "refused", why: "on-line", game });
  });
});

describe("what a stone does to the line", () => {
  it("cannot be entered: a line drawn at it stops short, and a tap's run stops at it", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 1), into);
    expect(hasStone(game, into)).toBe(true);
    const head = game.path[game.path.length - 1]!;
    const drawn = liftMaze(dragMaze(pressMaze(game, head), into));
    expect(drawn.path).toEqual(game.path);
    expect(drawn.stones).toEqual([into]);
    // The way past it is still open: the line goes on along the way.
    const onward = liftMaze(dragMaze(pressMaze(game, head), way[at + 1]!));
    expect(onward.path[onward.path.length - 1]).toBe(way[at + 1]);
    // A tap on a cell beyond the stone runs the line no further than the stone.
    const beyond = maze.links[into]!.find((cell) => cell !== way[at]);
    if (beyond !== undefined) expect(tapMaze(game, beyond).path).toEqual(game.path);
  });

  it("does not change the maze's way through it: a stone laid off the way leaves the maze solved by the same line", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 1), into);
    let next = pressMaze(game, game.path[game.path.length - 1]!);
    for (const cell of way.slice(at + 1)) next = dragMaze(next, cell);
    next = liftMaze(next);
    expect(next.solved).toBe(true);
    expect(next.path).toEqual(way);
  });

  it("can shut the way: a stone on it stops the line, and taking it up lets it go on", () => {
    const game = along(5);
    const ahead = way[5]!;
    const shut = layStone(game, ahead);
    expect(shut.stones).toEqual([ahead]);
    const head = shut.path[shut.path.length - 1]!;
    expect(liftMaze(dragMaze(pressMaze(shut, head), ahead)).path).toEqual(shut.path);
    const open = takeStone(shut, ahead);
    expect(liftMaze(dragMaze(pressMaze(open, head), ahead)).path).toEqual(way.slice(0, 6));
  });

  it("stays when the line is drawn back, and the stone laid beside a part of the line that was cut stays down", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 4), into);
    const cut = liftMaze(pressMaze(game, way[0]!));
    expect(cut.stones).toEqual([into]);
    expect(cut.path).toEqual([way[0]]);
  });
});

describe("a stone and Undo, Restart and the run kept", () => {
  it("Undo takes a stone up and puts a taken one back, one step at a time, with the line's strokes between", () => {
    const { at, into } = fork(2);
    const base = along(at + 1);
    const a = layStone(base, into);
    expect(a.undo.length).toBe(base.undo.length + 1);
    expect(a.strokes).toBe(base.strokes);
    const b = takeStone(a, into);
    expect(b.stones).toEqual([]);
    const undone = undoMaze(b);
    expect(undone.stones).toEqual([into]);
    expect(undoMaze(undone).stones).toEqual([]);
    expect(undoMaze(undoMaze(undone)).path).toEqual(base.path.slice(0, 0));
    // A stroke after a stone undoes to the stones as they were when it began.
    const further = liftMaze(dragMaze(pressMaze(a, a.path[a.path.length - 1]!), way[at + 1]!));
    expect(further.stones).toEqual([into]);
    expect(undoMaze(further).stones).toEqual([into]);
    expect(undoMaze(further).path).toEqual(a.path);
  });

  it("Restart takes every stone up and keeps the rules; clearing them is one Undo", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 1), into);
    const restarted = restartMaze(game);
    expect(restarted.stones).toEqual([]);
    expect(restarted.path).toEqual([]);
    expect(restarted.rules).toEqual(RULES);
    expect(restartMaze(restarted)).toBe(restarted);
    const cleared = clearStones(game);
    expect(cleared.stones).toEqual([]);
    expect(cleared.path).toEqual(game.path);
    expect(undoMaze(cleared).stones).toEqual([into]);
    expect(clearStones(cleared)).toBe(cleared);
  });

  it("a lower limit takes no stone off, it only stops more being laid; no rules takes them all", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 1), into);
    const lower = withStoneRules(game, { limit: 0, reach: 2 });
    expect(lower.stones).toEqual([into]);
    expect(stonesLeft(lower)).toBe(0);
    expect(withStoneRules(game, { ...RULES })).toBe(game);
    expect(withStoneRules(game, null).stones).toEqual([]);
  });

  it("is kept with the line as one short text and comes back the same", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 3), into);
    const code = encodeRun(game);
    expect(code).toBe(`${way.slice(1, at + 3).map((cell, i) => maze.grid.neighbours[way[i]!]!.indexOf(cell).toString(36)).join("")}~${into.toString(36)}`);
    const back = decodeRun(maze, code, RULES)!;
    expect(back.path).toEqual(game.path);
    expect(back.stones).toEqual(game.stones);
    expect(back.rules).toEqual(RULES);
    expect(back.undo).toEqual([{ path: [], collected: [], solved: false, stones: [] }]);
    expect(undoMaze(back).path).toEqual([]);
    expect(undoMaze(back).stones).toEqual([]);
    expect(decodeRun(maze, "", RULES)!.undo).toEqual([]);
    expect(back.solved).toBe(false);
    expect(encodeRun(back)).toBe(code);
    // No stones, no tilde; and the whole way is a solved run.
    expect(encodeRun(along(5))).not.toContain("~");
    const whole = decodeRun(maze, encodeRun(playSolution(newMazeGame(maze, RULES))), RULES)!;
    expect(whole.solved).toBe(true);
    expect(decodeRun(maze, "", RULES)!.path).toEqual([]);
    expect(decodeRun(maze, `~${into.toString(36)}`, RULES)!.path).toEqual([maze.start]);
  });

  it("refuses a run that is not of this maze: a wall, a stone on the line, on the start, off the maze or twice", () => {
    const { at, into } = fork(2);
    const game = layStone(along(at + 3), into);
    const steps = encodeRun(along(at + 3)).split("~")[0]!;
    expect(decodeRun(maze, `${steps}~${way[1]!.toString(36)}`, RULES)).toBeNull();
    expect(decodeRun(maze, `${steps}~${maze.start.toString(36)}`, RULES)).toBeNull();
    expect(decodeRun(maze, `${steps}~${maze.goal.toString(36)}`, RULES)).toBeNull();
    expect(decodeRun(maze, `${steps}~${(maze.grid.cells + 5).toString(36)}`, RULES)).toBeNull();
    expect(decodeRun(maze, `${steps}~${into.toString(36)}.${into.toString(36)}`, RULES)).toBeNull();
    // The limit is not asked of a run: two stones come back under a limit of one, and no more can be laid.
    const two = decodeRun(maze, `${steps}~${[into, ...Array.from(away.order.slice(-1))].map((cell) => cell.toString(36)).join(".")}`, { limit: 1, reach: 2 });
    expect(two?.stones.length).toBe(2);
    expect(stonesLeft(two!)).toBe(0);
    expect(decodeRun(maze, `${steps}~${into.toString(36)}`, null)).toBeNull();
    expect(decodeRun(maze, `${steps}~zz.`, RULES)).toBeNull();
    expect(decodeRun(maze, `${steps}!`, RULES)).toBeNull();
    expect(decodeRun(maze, "000000000000", RULES)).toBeNull();
    expect(game.stones).toEqual([into]);
  });
});
