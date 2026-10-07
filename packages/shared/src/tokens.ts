export const colors = {
  // Base neutrals & branding (DESIGN.md §3.1)
  bg: "#F6F1EA",
  surface: "#FFFFFF",
  ink: "#1A1613",
  inkMuted: "#8A8178",
  accent: "#E2603B",

  // Accessibility contrast tweaks (DESIGN.md §3.2)
  accentText: "#C4471F",
  inkMutedText: "#6F675F",

  // Derived neutrals (DESIGN.md §3.3)
  surfaceMuted: "#ECE6DD",
  hairline: "rgba(26, 22, 19, 0.08)",
  scrim: "rgba(26, 22, 19, 0.40)",
  accentSoft: "rgba(226, 96, 59, 0.14)",

  // Semantic
  warning: "#F59E0B",
  recovery: "#F59E0B",
  success: "#2E9E6B",
  danger: "#D64545",
} as const;
export type ColorToken = keyof typeof colors;

export const radius = {
  // Canonical DESIGN.md §3.4
  md: 20,
  lg: 28,
  xl: 32,
  pill: 999,
  circle: 999,

  // Backward-compatible aliases
  cardSm: 20,
  card: 28,
  cardLg: 32,
  button: 999,
  tabBar: 999,
} as const;
export type RadiusToken = keyof typeof radius;

export const spacing = {
  // Canonical scale (dp): 4, 8, 12, 16, 20, 24, 32, 40 (DESIGN.md §3.4)
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  mdLg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,

  // Numeric scale accessors
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
} as const;
export type SpacingToken = keyof typeof spacing;

export const layout = {
  screenPadding: 20,
  cardGap: 12,
  sectionGap: 28,
  cardPadding: 16,
  cardPaddingHero: 20,
  tabBarHeight: 64,
  coachButtonSize: 64,
  circleButtonVisual: 44,
  circleButtonHit: 48,
} as const;
export type LayoutToken = keyof typeof layout;

export const touchTarget = {
  min: 48,
} as const;

export const elevation = {
  flat: 0,
  floating: 1,
} as const;

export const shadow = {
  flat: {
    color: "#1A1613",
    opacity: 0,
    radius: 0,
    offsetX: 0,
    offsetY: 0,
    elevation: 0,
  },
  floating: {
    color: "#1A1613",
    opacity: 0.10,
    radius: 16,
    offsetX: 0,
    offsetY: 4,
    elevation: 4,
  },
  // Backward compatibility alias: cards are flat in DESIGN.md §3.4 & §13
  card: {
    color: "#1A1613",
    opacity: 0,
    radius: 0,
    offsetX: 0,
    offsetY: 0,
    elevation: 0,
  },
} as const;

export const fontFamily = {
  sans: "Inter",
  sansFallback: "Inter",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const fontSize = {
  // Canonical DESIGN.md §3.5
  caption: 12,
  eyebrow: 13,
  secondary: 15,
  body: 17,
  cardLabel: 17,
  unit: 17,
  button: 17,
  sectionTitle: 22,
  title: 28,
  largeTitle: 34,
  metricValue: 36,
  metricHero: 48,

  // Backward compatibility aliases
  label: 12,
  heading: 28,
  hero: 48,
} as const;
export type FontSizeToken = keyof typeof fontSize;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
export type FontWeightToken = keyof typeof fontWeight;

export const typography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  metricHero: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "700" as const,
  },
  metricValue: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  unit: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500" as const,
  },
  cardLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  secondary: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
} as const;
export type TypographyToken = keyof typeof typography;

export const icons = {
  defaultSize: 24,
  cardLabelSize: 20,
  strokeWidth: 1.75,
} as const;

export const tokens = {
  colors,
  radius,
  spacing,
  layout,
  touchTarget,
  elevation,
  shadow,
  fontFamily,
  fontSize,
  fontWeight,
  typography,
  icons,
} as const;
export type Tokens = typeof tokens;
