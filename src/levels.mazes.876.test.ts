import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 876 to 1000", () => {
  checkMazeLevels(876, 1000);
});
