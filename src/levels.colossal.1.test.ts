import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the colossal square levels, 1 to 64", () => {
  checkMazeLevels(1, 64, "colossal");
});
