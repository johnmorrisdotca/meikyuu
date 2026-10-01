import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 501 to 625", () => {
  checkMazeLevels(501, 625);
});
