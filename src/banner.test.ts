import { describe, expect, it } from "vitest";

import { bannerAfter, bannerShows, type BannerState } from "./banner.ts";

const fresh: BannerState = { enabled: true, closed: false };

describe("the solved message's state", () => {
  it("shows for a finished puzzle the host wants it for, and for no other", () => {
    expect(bannerShows(fresh, true)).toBe(true);
    expect(bannerShows(fresh, false)).toBe(false);
    expect(bannerShows({ ...fresh, enabled: false }, true)).toBe(false);
  });

  it("stays shut once closed, while the puzzle stays finished", () => {
    const shut = { ...fresh, closed: true };
    expect(bannerShows(shut, true)).toBe(false);
    expect(bannerAfter(shut, true)).toEqual(shut);
  });

  it("is let back when the puzzle is unsolved, so the next win says it again", () => {
    const shut = { ...fresh, closed: true };
    const undone = bannerAfter(shut, false);
    expect(undone.closed).toBe(false);
    expect(bannerShows(undone, true)).toBe(true);
  });

  it("changes nothing for a message that was never closed, and never writes the state it was given", () => {
    expect(bannerAfter(fresh, false)).toBe(fresh);
    expect(bannerAfter(fresh, true)).toBe(fresh);
    const shut = Object.freeze({ ...fresh, closed: true });
    expect(() => bannerAfter(shut, false)).not.toThrow();
    expect(shut.closed).toBe(true);
  });
});
