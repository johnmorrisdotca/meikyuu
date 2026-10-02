import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the tall levels, 1025 to 1536", () => {
  checkMazeLevels(1025, 1536, "tall");
});
