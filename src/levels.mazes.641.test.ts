import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 641 to 768", () => {
  checkMazeLevels(641, 768);
});
