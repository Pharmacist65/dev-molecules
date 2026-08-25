export type MolevrenMotionPreference = "full" | "reduced" | "off";

const color = {
  metallicOrange: "#FF8A00",
  deepCopper: "#C85200",
  orangeHighlight: "#FFD0A4",
  parliamentBlue: "#0A3D91",
  knowledgeCobalt: "#2D5BE3",
  deepNavy: "#0B1324",
  midnightStage: "#050A16",
  softLakeIvory: "#F6F1E8",
  paperIvory: "#FFFDF7",
  coolGray: "#A5ADB8",
  moleTeal: "#00B3C6",
  brandLine: "#AFC4FF",
  textOnDark: "#FFFDF7",
  textMutedOnDark: "rgb(246 241 232 / 72%)",
  textFaintOnDark: "rgb(246 241 232 / 52%)",
  textOnIvory: "#0B1324",
  textMutedOnIvory: "rgb(11 19 36 / 68%)",
  textFaintOnIvory: "rgb(11 19 36 / 50%)",
  selectionBackground: "rgb(255 138 0 / 24%)",
} as const;

const gradient = {
  metallicOrange:
    "linear-gradient(135deg, #FFD0A4 0%, #FF9A2E 18%, #FF8A00 36%, #D95B00 58%, #FFB566 78%, #B94000 100%)",
  midnightStage:
    "radial-gradient(circle at 76% 12%, rgb(45 91 227 / 24%), transparent 38%), radial-gradient(circle at 18% 82%, rgb(10 61 145 / 30%), transparent 42%), linear-gradient(145deg, #0B1324, #050A16)",
  parliamentDepth: "linear-gradient(145deg, #0A3D91, #0B1324 72%)",
  glassDark:
    "linear-gradient(145deg, rgb(45 91 227 / 14%), rgb(5 10 22 / 78%) 48%, rgb(11 19 36 / 92%))",
  ivoryReading: "linear-gradient(180deg, #FFFDF7, #F6F1E8)",
  metallicSweep:
    "linear-gradient(100deg, transparent 22%, rgb(255 208 164 / 68%) 48%, transparent 74%)",
} as const;

const typography = {
  fontFamily: {
    display: '"Fraunces Variable", Georgia, "Times New Roman", serif',
    ui: '"Manrope Variable", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  fontSize: {
    hero: "clamp(3rem, 6vw, 4.5rem)",
    display: "clamp(2.5rem, 4.6vw, 3.75rem)",
    section: "clamp(1.875rem, 3.4vw, 3rem)",
    title: "clamp(1.5rem, 2.4vw, 2rem)",
    subtitle: "1.25rem",
    body: "1rem",
    bodyMobile: "0.9375rem",
    button: "0.9375rem",
    secondary: "0.875rem",
    chemical: "0.875rem",
    uiLabel: "0.8125rem",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    display: 650,
  },
  lineHeight: {
    display: 1.04,
    heading: 1.16,
    body: 1.65,
    ui: 1.4,
    compact: 1.25,
  },
  letterSpacing: {
    display: "-0.025em",
    heading: "-0.012em",
    body: "0",
    ui: "0.01em",
    label: "0.045em",
    brandLine: "0.22em",
  },
} as const;

const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
  pageInline: "clamp(1rem, 3.4vw, 3.5rem)",
  sectionBlock: "clamp(3rem, 7vw, 6.5rem)",
  contentGap: "clamp(1.25rem, 2.4vw, 2.5rem)",
} as const;

const radius = {
  none: "0",
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  pill: "999px",
  round: "50%",
} as const;

const border = {
  width: {
    hairline: "1px",
    emphasis: "2px",
  },
  color: {
    onDark: "rgb(246 241 232 / 14%)",
    onDarkStrong: "rgb(246 241 232 / 26%)",
    onIvory: "rgb(11 19 36 / 14%)",
    onIvoryStrong: "rgb(11 19 36 / 24%)",
    orange: "rgb(255 138 0 / 72%)",
    blue: "rgb(45 91 227 / 62%)",
  },
} as const;

const shadow = {
  none: "none",
  subtle: "0 1px 2px rgb(5 10 22 / 18%)",
  panel: "0 12px 32px rgb(5 10 22 / 24%)",
  elevated: "0 20px 52px rgb(5 10 22 / 34%)",
  floating: "0 28px 80px rgb(5 10 22 / 46%)",
  insetHighlight: "inset 0 1px 0 rgb(255 253 247 / 12%)",
  glowOrange: "0 0 28px rgb(255 138 0 / 24%)",
  glowBlue: "0 0 34px rgb(45 91 227 / 24%)",
} as const;

const blur = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "16px",
  xl: "28px",
  atmosphere: "48px",
} as const;

const motion = {
  duration: {
    instant: 0,
    fast: 150,
    ui: 200,
    slow: 250,
    scene: 450,
    brand: 600,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    enter: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    linear: "linear",
  },
  preference: {
    full: { distanceScale: 1, atmosphereAnimated: true },
    reduced: { distanceScale: 0.15, atmosphereAnimated: false },
    off: { distanceScale: 0, atmosphereAnimated: false },
  } satisfies Record<
    MolevrenMotionPreference,
    { readonly distanceScale: number; readonly atmosphereAnimated: boolean }
  >,
} as const;

const zIndex = {
  atmosphere: 0,
  content: 1,
  elevated: 10,
  sticky: 100,
  navigation: 200,
  overlay: 400,
  modal: 500,
  toast: 600,
  tooltip: 700,
} as const;

const surface = {
  midnight: color.midnightStage,
  parliament: color.parliamentBlue,
  glassDark: "rgb(11 19 36 / 78%)",
  glassDarkStrong: "rgb(5 10 22 / 90%)",
  ivory: color.softLakeIvory,
  paper: color.paperIvory,
  editor: color.paperIvory,
  elevated: "rgb(11 19 36 / 92%)",
  reading: gradient.ivoryReading,
  stage: gradient.midnightStage,
} as const;

const molecularStage = {
  background: surface.midnight,
  backgroundDepth: surface.stage,
  nodes: {
    orange: color.metallicOrange,
    blue: color.knowledgeCobalt,
    teal: color.moleTeal,
    opacity: 0.07,
    heroOpacity: 0.12,
  },
  links: {
    color: "rgb(165 173 184 / 18%)",
    opacity: 0.055,
    nearbyOnly: true,
  },
  noiseOpacity: 0.035,
  haloOpacity: 0.18,
  parallax: 0.018,
  desktop: {
    minimumNodes: 30,
    maximumNodes: 45,
  },
  mobile: {
    minimumNodes: 12,
    maximumNodes: 20,
  },
  frameRate: {
    minimum: 20,
    maximum: 30,
  },
} as const;

const focusRing = {
  width: "3px",
  offset: "3px",
  color: color.knowledgeCobalt,
  colorOnDark: color.orangeHighlight,
  shadow:
    "0 0 0 1px #FFFDF7, 0 0 0 4px rgb(45 91 227 / 72%)",
  shadowOnDark:
    "0 0 0 1px #050A16, 0 0 0 4px rgb(255 208 164 / 88%)",
} as const;

export const MOLEVREN_TOKENS = {
  color,
  gradient,
  typography,
  spacing,
  radius,
  border,
  shadow,
  blur,
  motion,
  zIndex,
  surface,
  molecularStage,
  focusRing,
} as const;

export const MOLEVREN_CSS_VARIABLE = {
  metallicOrange: "var(--color-metallic-orange)",
  parliamentBlue: "var(--color-parliament-blue)",
  knowledgeCobalt: "var(--color-knowledge-cobalt)",
  deepNavy: "var(--color-deep-navy)",
  midnightStage: "var(--color-midnight-stage)",
  softLakeIvory: "var(--color-soft-lake-ivory)",
  paperIvory: "var(--color-paper-ivory)",
  surfaceMidnight: "var(--surface-midnight)",
  surfaceGlassDark: "var(--surface-glass-dark)",
  surfaceIvory: "var(--surface-ivory)",
  surfacePaper: "var(--surface-paper)",
  metallicGradient: "var(--gradient-metallic-orange)",
  focusRing: "var(--focus-ring-shadow)",
  focusRingOnDark: "var(--focus-ring-shadow-on-dark)",
} as const;

export type MolevrenTokens = typeof MOLEVREN_TOKENS;
