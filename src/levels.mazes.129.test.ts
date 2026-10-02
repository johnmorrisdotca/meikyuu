import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 129 to 256", () => {
  checkMazeLevels(129, 256);
});
