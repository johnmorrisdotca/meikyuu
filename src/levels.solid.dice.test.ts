import { describe } from "vitest";

import { SOLID_MORE_DICE } from "./solid/solidKinds.ts";
import { checkSolidLevels } from "./solidLevelSuite.fixture.ts";

describe("the levels of the seven further dice", () => {
  checkSolidLevels(SOLID_MORE_DICE);
});
