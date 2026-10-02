import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 385 to 512", () => {
  checkMazeLevels(385, 512);
});
