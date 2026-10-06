import { describe } from "vitest";

import { SOLID_MORE_SHAPES } from "./solid/solidKinds.ts";
import { checkSolidLevels } from "./solidLevelSuite.fixture.ts";

describe("the levels of the six shapes", () => {
  checkSolidLevels(SOLID_MORE_SHAPES);
});
