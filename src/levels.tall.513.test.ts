import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the tall levels, 513 to 1024", () => {
  checkMazeLevels(513, 1024, "tall");
});
