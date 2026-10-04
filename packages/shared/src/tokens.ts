export const colors = {
  bg: "#F6F1EA",
  surface: "#FFFFFF",
  ink: "#1A1613",
  inkMuted: "#8A8178",
  accent: "#E2603B",
  warning: "#F59E0B",
  recovery: "#F59E0B",
  success: "#2E9E6B",
  danger: "#D64545",
} as const;
export type ColorToken = keyof typeof colors;

export const radius = {
  button: 999,
  tabBar: 999,
  card: 28,
  cardSm: 24,
  cardLg: 32,
} as const;
export type RadiusToken = keyof typeof radius;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
export type SpacingToken = keyof typeof spacing;

export const touchTarget = {
  min: 48,
} as const;

export const shadow = {
  card: {
    color: "#1A1613",
    opacity: 0.08,
    radius: 24,
    offsetX: 0,
    offsetY: 8,
  },
} as const;

export const fontFamily = {
  sans: "Plus Jakarta Sans",
  sansFallback: "Inter",
} as const;

export const fontSize = {
  label: 12,
  body: 15,
  title: 20,
  heading: 28,
  hero: 44,
} as const;
export type FontSizeToken = keyof typeof fontSize;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
export type FontWeightToken = keyof typeof fontWeight;

export const tokens = {
  colors,
  radius,
  spacing,
  touchTarget,
  shadow,
  fontFamily,
  fontSize,
  fontWeight,
} as const;
export type Tokens = typeof tokens;
