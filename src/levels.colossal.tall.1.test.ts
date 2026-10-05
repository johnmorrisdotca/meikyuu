import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the colossal tall levels, 1 to 128", () => {
  checkMazeLevels(1, 128, "colossal-tall");
});
