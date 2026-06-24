import { hashPw } from "./format";

export const BLUE = "#0071E3";
export const BLUE_SOFT = "#4DA3FF";

export const HABIT_POINTS = 10; // every habit is worth the same, they are all hard to keep
export const TASK_IMPORTANCE = {
  low: { label: "Low", points: 5, color: "#86868b" },
  medium: { label: "Medium", points: 10, color: BLUE },
  high: { label: "High", points: 20, color: "#FF9500" },
  urgent: { label: "Urgent", points: 35, color: "#FF3B30" },
};
export const HABIT_ICONS = ["dumbbell", "book", "water", "sun", "moon", "run", "code", "phone", "leaf", "coffee", "money", "heart"];
export const ICON_GLYPH = {
  dumbbell: "\u{1F3CB}\uFE0F", book: "\u{1F4D6}", water: "\u{1F4A7}", sun: "\u2600\uFE0F",
  moon: "\u{1F319}", run: "\u{1F3C3}", code: "\u{1F4BB}", phone: "\u{1F4DE}",
  leaf: "\u{1F343}", coffee: "\u2615", money: "\u{1F4B0}", heart: "\u2764\uFE0F",
};

export const DEFAULT_FINANCE = { vault: { current: 0, target: 50000 }, monthTarget: 10000, transactions: [] };
export const DEFAULT_USERS = [
  { id: "cristian", name: "Cristian", color: "#0071E3", pw: hashPw("12345") },
  { id: "catalin", name: "Catalin", color: "#34C759", pw: hashPw("12345") },
];
