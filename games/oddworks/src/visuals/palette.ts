/** Oddworks' grounded storybook palette. Keep gameplay meaning independent of hue. */
export const palette = {
  ink: "#25221f",
  inkSoft: "#504a43",
  paper: "#f5e7c4",
  paperLight: "#fff7df",
  paperShade: "#d9c393",
  grass: "#779657",
  grassDark: "#4f6d43",
  soil: "#8d6545",
  timber: "#9d643f",
  timberDark: "#613f31",
  stone: "#908a76",
  water: "#65a4a0",
  sky: "#acc9bd",
  berry: "#a34f61",
  honey: "#dfa943",
  blue: "#587e93",
  plum: "#76566f",
  success: "#5f8c55",
  warning: "#d2883d",
  danger: "#a9473e",
  focus: "#f1c85b",
} as const;

export type PaletteColor = keyof typeof palette;

export const specialistColors = {
  porter: palette.blue,
  maker: palette.honey,
  keeper: palette.plum,
  visitor: palette.berry,
} as const;

