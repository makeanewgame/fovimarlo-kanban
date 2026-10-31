import { describe, expect, it } from "vitest";

import { AVATAR_COLOURS, getAvatarColour } from "./avatarColours";

const relativeLuminance = (hex: string) => {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  );
};

describe("getAvatarColour", () => {
  it("returns the same colour for the same person", () => {
    expect(getAvatarColour("hazal@example.com")).toBe(
      getAvatarColour("hazal@example.com"),
    );
  });

  it("ignores casing and surrounding whitespace", () => {
    expect(getAvatarColour("  Hazal@Example.com ")).toBe(
      getAvatarColour("hazal@example.com"),
    );
  });

  it("returns a palette colour", () => {
    expect(AVATAR_COLOURS).toContain(getAvatarColour("hazal@example.com"));
  });

  it("spreads people across the palette", () => {
    const colours = new Set(
      Array.from({ length: 50 }, (_, index) =>
        getAvatarColour(`member-${index}@example.com`),
      ),
    );

    expect(colours.size).toBeGreaterThan(AVATAR_COLOURS.length / 2);
  });

  it("returns nothing without a seed", () => {
    expect(getAvatarColour("")).toBeUndefined();
    expect(getAvatarColour("   ")).toBeUndefined();
  });
});

describe("AVATAR_COLOURS", () => {
  it.each(AVATAR_COLOURS)("keeps white initials readable on %s", (colour) => {
    const contrast = 1.05 / (relativeLuminance(colour) + 0.05);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
