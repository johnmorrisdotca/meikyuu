import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 769 to 896", () => {
  checkMazeLevels(769, 896);
});
