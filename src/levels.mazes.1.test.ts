import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 1 to 125", () => {
  checkMazeLevels(1, 125);
});
