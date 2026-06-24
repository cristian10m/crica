// Customisation shop. Points double as currency: your spendable balance is your
// lifetime earned points minus what you have spent here. Spending never lowers your
// rank or competition stats, only your balance, so it is safe to treat yourself.
import { DECORATIONS, decoSrc } from "./decorations";

// Name colours (gradients applied to your display name everywhere it shows).
const NAME_ITEMS = [
  { id: "name_sunset", kind: "name", name: "Sunset", cost: 300, css: "linear-gradient(90deg,#ff5f6d,#ffc371)" },
  { id: "name_aqua", kind: "name", name: "Aqua", cost: 300, css: "linear-gradient(90deg,#13f1fc,#0470dc)" },
  { id: "name_neon", kind: "name", name: "Neon", cost: 450, css: "linear-gradient(90deg,#52e5a3,#3ad6e0)" },
  { id: "name_candy", kind: "name", name: "Candy", cost: 450, css: "linear-gradient(90deg,#f093fb,#f5576c)" },
  { id: "name_grape", kind: "name", name: "Grape", cost: 450, css: "linear-gradient(90deg,#a18cd1,#fbc2eb)" },
  { id: "name_lime", kind: "name", name: "Lime", cost: 450, css: "linear-gradient(90deg,#a8e063,#56ab2f)" },
  { id: "name_ember", kind: "name", name: "Ember", cost: 600, css: "linear-gradient(90deg,#ff512f,#dd2476)" },
  { id: "name_ice", kind: "name", name: "Ice", cost: 600, css: "linear-gradient(90deg,#74ebd5,#9face6)" },
  { id: "name_mango", kind: "name", name: "Mango", cost: 600, css: "linear-gradient(90deg,#ffe259,#ffa751)" },
  { id: "name_violet", kind: "name", name: "Violet", cost: 750, css: "linear-gradient(90deg,#7f00ff,#e100ff)" },
  { id: "name_steel", kind: "name", name: "Steel", cost: 750, css: "linear-gradient(90deg,#bdc3c7,#2c3e50)" },
  { id: "name_gold", kind: "name", name: "Gold", cost: 1200, css: "linear-gradient(90deg,#f7971e,#ffd200)" },
  { id: "name_rainbow", kind: "name", name: "Rainbow", cost: 1500, css: "linear-gradient(90deg,#ff0080,#ff8c00,#40e0d0,#7a5fff)" },
];

// Custom decorations come from the user-editable registry.
const DECO_ITEMS = (DECORATIONS || []).map((d) => ({ id: d.id, kind: "deco", name: d.name, cost: d.cost, file: d.file }));

export const SHOP_ITEMS = [...NAME_ITEMS, ...DECO_ITEMS];
export const KIND_LABEL = { name: "Name colours", deco: "Avatar decorations" };
export const findItem = (id) => SHOP_ITEMS.find((i) => i.id === id);

export function nameStyle(user) {
  const it = user && user.equip && user.equip.name ? findItem(user.equip.name) : null;
  if (!it) return null;
  return { background: it.css, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" };
}
export function decoFile(user) {
  const it = user && user.equip && user.equip.deco ? findItem(user.equip.deco) : null;
  return it ? it.file : null;
}
export { decoSrc };
export const earnedBalance = (earned, user) => Math.max(0, (earned || 0) - ((user && user.spent) || 0));
