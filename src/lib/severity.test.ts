import { describe, expect, it } from "vitest";

import {
  DEFAULT_THRESHOLDS,
  clampScore,
  isAtLeast,
  severityForScore,
} from "./severity";

describe("severityForScore", () => {
  it.each([
    [0, "alert"],
    [24.9, "alert"],
    [25, "mild"],
    [49.9, "mild"],
    [50, "drowsy"],
    [74.9, "drowsy"],
    [75, "critical"],
    [100, "critical"],
  ])("score %d → %s", (score, expected) => {
    expect(severityForScore(score)).toBe(expected);
  });

  it("clamps out-of-range scores", () => {
    expect(severityForScore(-10)).toBe("alert");
    expect(severityForScore(250)).toBe("critical");
  });

  it("honours custom thresholds", () => {
    const strict = { mild: 10, drowsy: 20, critical: 40 };
    expect(severityForScore(15, strict)).toBe("mild");
    expect(severityForScore(45, strict)).toBe("critical");
    expect(severityForScore(45, DEFAULT_THRESHOLDS)).toBe("mild");
  });
});

describe("clampScore", () => {
  it("bounds to 0–100 and handles NaN", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(42)).toBe(42);
  });
});

describe("isAtLeast", () => {
  it("compares severity levels by rank", () => {
    expect(isAtLeast("drowsy", "mild")).toBe(true);
    expect(isAtLeast("mild", "drowsy")).toBe(false);
    expect(isAtLeast("critical", "critical")).toBe(true);
  });
});
