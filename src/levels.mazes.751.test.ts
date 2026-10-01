import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 751 to 875", () => {
  checkMazeLevels(751, 875);
});
