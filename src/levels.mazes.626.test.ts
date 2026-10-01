import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 626 to 750", () => {
  checkMazeLevels(626, 750);
});
