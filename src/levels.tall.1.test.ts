import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the tall levels, 1 to 512", () => {
  checkMazeLevels(1, 512, "tall");
});
