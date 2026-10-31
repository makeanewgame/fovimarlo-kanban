// Hex rather than Tailwind classes: Tailwind only scans .tsx files. Every colour
// keeps white initials at a contrast of at least 4.5:1, in both themes.
export const AVATAR_COLOURS = [
  "#4f46e5",
  "#7c3aed",
  "#a21caf",
  "#be185d",
  "#be123c",
  "#c2410c",
  "#b45309",
  "#047857",
  "#0f766e",
  "#0e7490",
  "#0369a1",
  "#2563eb",
] as const;

export const getAvatarColour = (seed: string): string | undefined => {
  const normalisedSeed = seed.trim().toLowerCase();

  if (!normalisedSeed) return undefined;

  let hash = 0;
  for (const character of normalisedSeed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
};
