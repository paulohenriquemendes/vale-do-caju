export type Slot = "shirt" | "pants" | "shoes" | "hair";
export type Appearance = Record<Slot, string> & { tone: string };
export const tones = [
  "#f0c7a4",
  "#dba479",
  "#bc815c",
  "#925e41",
  "#694431",
  "#482e25",
];
export const catalog: {
  id: string;
  slot: Slot;
  name: string;
  color: string;
  price: number;
}[] = [
  ...["#b95d3e", "#477b96", "#697e48", "#ba984c", "#95667d", "#e0cbb0"].map(
    (color, i) => ({
      id: `shirt-${i}`,
      slot: "shirt" as const,
      name: [
        "Camisa telha",
        "Camisa azul",
        "Camisa verde",
        "Camisa mostarda",
        "Camisa ameixa",
        "Camisa de linho",
      ][i],
      color,
      price: 18 + i * 3,
    }),
  ),
  ...["#3b5369", "#806044", "#484c41", "#a69375"].map((color, i) => ({
    id: `pants-${i}`,
    slot: "pants" as const,
    name: ["Calça jeans", "Calça de brim", "Calça verde", "Calça areia"][i],
    color,
    price: 28 + i * 4,
  })),
  ...["#704634", "#343333", "#c4ac88"].map((color, i) => ({
    id: `shoes-${i}`,
    slot: "shoes" as const,
    name: ["Botina marrom", "Sapato preto", "Sapato claro"][i],
    color,
    price: 24 + i * 6,
  })),
  {
    id: "hair-short",
    slot: "hair",
    name: "Curto natural",
    color: "#38291f",
    price: 0,
  },
  {
    id: "hair-cropped",
    slot: "hair",
    name: "Curto castanho",
    color: "#38291f",
    price: 0,
  },
  {
    id: "hair-curls",
    slot: "hair",
    name: "Cachos volumosos",
    color: "#38291f",
    price: 25,
  },
  {
    id: "hair-braid",
    slot: "hair",
    name: "Trança trabalhada",
    color: "#38291f",
    price: 30,
  },
];
export function starter(seed = "", skin = "terracota"): Appearance {
  let hash = 0;
  for (const char of seed)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return {
    shirt: `shirt-${seed ? hash % 6 : skin === "azul" ? 1 : skin === "verde" ? 2 : 0}`,
    pants: `pants-${Math.floor(hash / 6) % 4}`,
    shoes: `shoes-${Math.floor(hash / 24) % 3}`,
    hair: "hair-short",
    tone: tones[2],
  };
}
