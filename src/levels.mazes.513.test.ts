import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the maze levels, 513 to 640", () => {
  checkMazeLevels(513, 640);
});
