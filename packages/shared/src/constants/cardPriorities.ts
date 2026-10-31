export const cardPriorities = ["low", "medium", "high"] as const;

export type CardPriority = (typeof cardPriorities)[number];
