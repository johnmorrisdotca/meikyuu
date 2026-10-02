import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 897 to 1024", () => {
  checkMazeLevels(897, 1024);
});
