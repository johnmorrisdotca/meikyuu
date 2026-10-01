import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 126 to 250", () => {
  checkMazeLevels(126, 250);
});
