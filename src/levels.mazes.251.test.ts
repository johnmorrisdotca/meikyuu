import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 251 to 375", () => {
  checkMazeLevels(251, 375);
});
