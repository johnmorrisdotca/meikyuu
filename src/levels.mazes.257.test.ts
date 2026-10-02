import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 257 to 384", () => {
  checkMazeLevels(257, 384);
});
