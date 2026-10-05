import { describe } from "vitest";

import { checkMazeLevels } from "./levelSuite.fixture.ts";

describe("the colossal square levels, 65 to 128", () => {
  checkMazeLevels(65, 128, "colossal");
});
