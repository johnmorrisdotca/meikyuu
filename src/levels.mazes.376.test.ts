import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 376 to 500", () => {
  checkMazeLevels(376, 500);
});
